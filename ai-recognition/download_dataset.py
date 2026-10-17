"""Constitue un petit dataset iNaturalist avec sources, licences et reprise."""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import fcntl
import hashlib
import io
import json
import logging
import os
from pathlib import Path
import random
import re
import sys
import time
from urllib.parse import urlsplit, urlunsplit

import requests
from PIL import Image


API = "https://api.inaturalist.org/v1"
SPECIES = (
    "Panthera leo", "Panthera tigris", "Giraffa camelopardalis",
    "Equus quagga", "Loxodonta africana",
)
LICENSES = ("cc0", "cc-by", "cc-by-sa", "cc-by-nc", "cc-by-nc-sa")
FIELDS = (
    "species", "taxon_id", "observed_taxon", "observation_id", "observation_url",
    "photo_id", "photo_page", "photo_url", "photo_license", "license_url",
    "attribution", "observer", "observation_license", "quality_grade", "captive",
    "observed_on", "downloaded_at", "path", "sha256", "width", "height", "bytes",
)
LOG = logging.getLogger("download_dataset")


class DatasetError(Exception):
    pass


class ResponseTooLarge(ValueError):
    pass


class Client:
    def __init__(self, args):
        self.args = args
        self.session = requests.Session()
        self.session.headers["User-Agent"] = args.user_agent
        self.next_request = 0.0
        self.requests = 0

    def get(self, url, *, params=None, media=False):
        for attempt in range(self.args.retries + 1):
            if self.requests >= self.args.max_requests:
                raise DatasetError("Budget de requêtes épuisé ; relancer pour reprendre.")
            time.sleep(max(0, self.next_request - time.monotonic()))
            self.requests += 1
            self.next_request = time.monotonic() + self.args.delay
            try:
                with self.session.get(url, params=params, timeout=(10, self.args.timeout),
                                      stream=True) as response:
                    if response.status_code == 429 or 500 <= response.status_code < 600:
                        retry_after = response.headers.get("Retry-After", "0")
                        try:
                            wait = float(retry_after)
                        except ValueError:
                            try:
                                wait = parsedate_to_datetime(retry_after).timestamp() - time.time()
                            except (ValueError, TypeError, OverflowError):
                                wait = 0
                        self.next_request = max(self.next_request, time.monotonic() + max(0, wait))
                        response.raise_for_status()
                    response.raise_for_status()
                    limit = self.args.max_image_mb * 1024 * 1024 if media else 30 * 1024 * 1024
                    content_type = response.headers.get("Content-Type", "").split(";")[0]
                    if media and not content_type.startswith("image/"):
                        raise ValueError(f"Réponse non image : {content_type}")
                    content = bytearray()
                    for chunk in response.iter_content(65536):
                        content.extend(chunk)
                        if media:
                            self.next_request = max(self.next_request, time.monotonic()) + len(chunk) / 500_000
                        if len(content) > limit:
                            kind = "Image" if media else "Réponse JSON de l’API"
                            raise ResponseTooLarge(f"{kind} trop volumineuse (limite {limit // (1024 * 1024)} Mio)")
                    return bytes(content) if media else json.loads(content)
            except (requests.RequestException, ValueError) as error:
                if isinstance(error, requests.HTTPError):
                    status = error.response.status_code
                    if status != 429 and not 500 <= status < 600:
                        raise
                elif isinstance(error, ValueError):
                    raise
                if attempt == self.args.retries:
                    raise
                wait = min(60, 2 ** attempt) + random.uniform(0, 0.5)
                self.next_request = max(self.next_request, time.monotonic() + wait)
                LOG.warning("Échec réseau (%s), nouvelle tentative %s/%s", error, attempt + 1, self.args.retries)


def resolve_taxon(client, species):
    result = client.get(f"{API}/taxa", params={
        "q": species, "rank": "species", "is_active": "true", "per_page": 30,
    })
    matches = [taxon for taxon in result["results"]
               if taxon.get("name") == species and taxon.get("is_active") is True
               and taxon.get("rank") == "species"]
    if len(matches) != 1:
        raise DatasetError(f"Taxon actif ambigu ou introuvable : {species}")
    return matches[0]["id"]


def observations(client, taxon_id, args):
    cursor = 0
    per_page = min(args.per_page, args.count)
    for page in range(args.max_pages):
        params = {
            "taxon_id": taxon_id, "quality_grade": args.quality_grade,
            "captive": "false", "photos": "true", "photo_license": ",".join(args.licenses),
            "order_by": "id", "order": "asc", "id_above": cursor, "per_page": per_page,
        }
        while True:
            try:
                results = client.get(f"{API}/observations", params=params)["results"]
                break
            except ResponseTooLarge:
                if per_page == 1:
                    raise DatasetError("Une seule observation dépasse la limite JSON de 30 Mio.")
                per_page = max(1, per_page // 2)
                params["per_page"] = per_page
                LOG.warning("Réponse API trop volumineuse ; réduction à %s observations par page.", per_page)
        if not results:
            return
        next_cursor = max(observation["id"] for observation in results)
        if next_cursor <= cursor:
            raise DatasetError("La pagination ne progresse plus.")
        LOG.debug("Taxon %s, page %s, id_above=%s", taxon_id, page + 1, cursor)
        for observation in results:
            if observation["id"] > cursor:
                yield observation
        cursor = next_cursor
        if len(results) < per_page:
            return


def photo_url(photo, size):
    parsed = urlsplit(photo["url"])
    if parsed.scheme != "https":
        raise ValueError("URL de photo non HTTPS")
    path, count = re.subn(r"/(square|small|medium|large|original)(\.[a-zA-Z0-9]+)$",
                         f"/{size}\\2", parsed.path)
    if count != 1:
        raise ValueError("Format d’URL de photo inconnu")
    return urlunsplit(parsed._replace(path=path))


def eligible(observation, taxon_id, args):
    taxon = observation.get("taxon") or {}
    return (observation.get("quality_grade") == args.quality_grade
            and observation.get("captive") is False
            and (taxon.get("id") == taxon_id or taxon_id in taxon.get("ancestor_ids", [])))


def image_info(content, min_side):
    try:
        with Image.open(io.BytesIO(content)) as image:
            image.verify()
        with Image.open(io.BytesIO(content)) as image:
            image.load()
            if image.format not in ("JPEG", "PNG", "WEBP"):
                raise ValueError("Format d’image non pris en charge")
            if min(image.size) < min_side:
                raise ValueError("Image trop petite")
            return image.width, image.height, {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}[image.format]
    except OSError as error:
        raise ValueError(f"Image illisible : {error}") from error


def load_manifest(root):
    manifest = root / "manifest.csv"
    if not manifest.exists():
        return []
    with manifest.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != list(FIELDS):
            raise DatasetError("Colonnes du manifeste incompatibles.")
        rows = list(reader)
    for row in rows:
        if None in row or any(value is None for value in row.values()):
            raise DatasetError("Manifeste incomplet ou corrompu.")
        path = (root / row["path"]).resolve()
        if not path.is_relative_to(root.resolve()):
            raise DatasetError("Chemin extérieur au dataset dans le manifeste.")
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != row["sha256"]:
            raise DatasetError(f"Image absente ou modifiée : {path}. Restaurer le fichier ou retirer sa ligne du manifeste.")
    return rows


def append_manifest(root, row):
    manifest = root / "manifest.csv"
    write_header = not manifest.exists() or manifest.stat().st_size == 0
    with manifest.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        if write_header:
            writer.writeheader()
        writer.writerow(row)
        handle.flush()
        os.fsync(handle.fileno())


def run(args):
    root = args.output.resolve()
    rows = load_manifest(root)
    photo_ids = {int(row["photo_id"]) for row in rows}
    observation_ids = {int(row["observation_id"]) for row in rows}
    hashes = {row["sha256"] for row in rows}
    complete = True
    client = Client(args)
    try:
        for species in args.species:
            count = sum(row["species"] == species and row["photo_license"] in args.licenses
                        and row["quality_grade"] == args.quality_grade
                        and min(int(row["width"]), int(row["height"])) >= args.min_side
                        for row in rows)
            if count >= args.count:
                LOG.info("%s : objectif déjà atteint (%s)", species, count)
                continue
            taxon_id = resolve_taxon(client, species)
            LOG.info("%s : taxon %s, %s/%s images", species, taxon_id, count, args.count)
            for observation in observations(client, taxon_id, args):
                if not eligible(observation, taxon_id, args) or observation["id"] in observation_ids:
                    continue
                for photo in observation.get("photos", []):
                    if (photo.get("license_code") not in args.licenses
                            or photo.get("id") in photo_ids or photo.get("hidden")
                            or photo.get("flags") or not photo.get("attribution")):
                        continue
                    dimensions = photo.get("original_dimensions") or {}
                    if dimensions and min(dimensions.get("width", 0), dimensions.get("height", 0)) < args.min_side:
                        continue
                    try:
                        url = photo_url(photo, args.size)
                        if args.dry_run:
                            LOG.info("Candidat : observation %s, photo %s, %s", observation["id"], photo["id"], photo["license_code"])
                        else:
                            content = client.get(url, media=True)
                            width, height, extension = image_info(content, args.min_side)
                            digest = hashlib.sha256(content).hexdigest()
                            if digest in hashes:
                                continue
                            relative = Path(species.lower().replace(" ", "_")) / f"{observation['id']}_{photo['id']}{extension}"
                            destination = root / relative
                            destination.parent.mkdir(parents=True, exist_ok=True)
                            temporary = destination.with_suffix(".part")
                            try:
                                with temporary.open("wb") as handle:
                                    handle.write(content)
                                    handle.flush()
                                    os.fsync(handle.fileno())
                                os.replace(temporary, destination)
                            finally:
                                temporary.unlink(missing_ok=True)
                            license_code = photo["license_code"]
                            license_url = ("https://creativecommons.org/publicdomain/zero/1.0/" if license_code == "cc0"
                                           else f"https://creativecommons.org/licenses/{license_code[3:]}/")
                            row = dict(zip(FIELDS, (
                                species, taxon_id, observation["taxon"]["name"], observation["id"],
                                f"https://www.inaturalist.org/observations/{observation['id']}", photo["id"],
                                f"https://www.inaturalist.org/photos/{photo['id']}", url, license_code,
                                license_url, photo["attribution"], (observation.get("user") or {}).get("login", ""),
                                observation.get("license_code") or "", observation["quality_grade"], False,
                                observation.get("observed_on") or "", datetime.now(timezone.utc).isoformat(),
                                relative.as_posix(), digest, width, height, len(content),
                            )))
                            append_manifest(root, row)
                            hashes.add(digest)
                        photo_ids.add(photo["id"])
                        observation_ids.add(observation["id"])
                        count += 1
                        break
                    except (requests.RequestException, ValueError, Image.DecompressionBombError) as error:
                        LOG.warning("Photo %s ignorée : %s", photo.get("id"), error)
                if count >= args.count:
                    break
            LOG.info("%s : %s/%s %s", species, count, args.count, "candidats" if args.dry_run else "images")
            complete = complete and count >= args.count
    finally:
        client.session.close()
        LOG.info("Requêtes effectuées : %s", client.requests)
    return 0 if complete else 2


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.ArgumentDefaultsHelpFormatter)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parent / "data/raw")
    parser.add_argument("--species", nargs="+", choices=SPECIES, default=list(SPECIES))
    parser.add_argument("--count", type=int, default=200, help="Objectif total par espèce, reprise incluse")
    parser.add_argument("--licenses", nargs="+", choices=LICENSES, default=["cc0", "cc-by", "cc-by-sa"])
    parser.add_argument("--quality-grade", choices=["research", "needs_id"], default="research")
    parser.add_argument("--size", choices=["medium", "large", "original"], default="large")
    parser.add_argument("--min-side", type=int, default=256)
    parser.add_argument("--per-page", type=int, default=30, help="Maximum par page, réduit selon la cible et la taille JSON")
    parser.add_argument("--max-pages", type=int, default=25, help="Pages maximum par espèce")
    parser.add_argument("--max-requests", type=int, default=2000, help="Budget par exécution, retries et photos inclus")
    parser.add_argument("--delay", type=float, default=1.1, help="Intervalle minimum entre requêtes (secondes)")
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--retries", type=int, default=4, help="Tentatives supplémentaires après erreur transitoire")
    parser.add_argument("--max-image-mb", type=int, default=10)
    parser.add_argument("--user-agent", default="ai-recognition-dataset/1.0")
    parser.add_argument("--dry-run", action="store_true", help="Recherche de candidats sans télécharger ni écrire")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args(argv)
    if not 1 <= args.per_page <= 200 or not 1 <= args.max_requests <= 10000:
        parser.error("per-page doit être entre 1 et 200 ; max-requests entre 1 et 10000")
    if not 1 <= args.delay < float("inf") or not 0 < args.timeout < float("inf"):
        parser.error("delay doit être >= 1 et timeout > 0, tous deux finis")
    if min(args.count, args.min_side, args.max_pages, args.max_image_mb) < 1 or not 0 <= args.retries <= 10:
        parser.error("Les limites doivent être positives ; retries entre 0 et 10")
    args.species = list(dict.fromkeys(args.species))
    return args


def main(argv=None):
    args = parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format="%(levelname)s %(message)s")
    try:
        if args.dry_run:
            return run(args)
        args.output.mkdir(parents=True, exist_ok=True)
        with (args.output / ".download.lock").open("a") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as error:
                raise DatasetError("Un téléchargement utilise déjà ce dossier.") from error
            return run(args)
    except KeyboardInterrupt:
        LOG.warning("Interruption ; les images inscrites au manifeste sont conservées.")
        return 130
    except (DatasetError, requests.RequestException, OSError, ValueError, KeyError) as error:
        LOG.error("%s", error)
        return 1


if __name__ == "__main__":
    sys.exit(main())
