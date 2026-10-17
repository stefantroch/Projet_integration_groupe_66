"""Split local images by species, keeping observations and exact duplicates together."""

import argparse
import csv
import hashlib
import json
import math
import random
import shutil
import sys
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent
SPLITS = ("train", "val", "test")
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


def digest(path):
    with path.open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def load_images(source, manifest):
    source = source.resolve()
    paths = sorted(path for path in source.rglob("*") if path.suffix.lower() in EXTENSIONS)
    if not paths:
        raise ValueError(f"Aucune image dans {source}")
    records = {}
    for path in paths:
        relative = path.relative_to(source)
        if len(relative.parts) < 2 or path.is_symlink() or not path.resolve().is_relative_to(source):
            raise ValueError(f"Image hors dossier d'espèce ou lien symbolique : {path}")
        with Image.open(path) as image:
            image.verify()
        records[relative.as_posix()] = {
            "source_path": relative.as_posix(), "species_folder": relative.parts[0],
            "sha256": digest(path), "observation_id": "", "metadata": {},
        }
    warnings = []
    if manifest is not None:
        seen = set()
        with manifest.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            if not {"path", "observation_id"}.issubset(reader.fieldnames or []):
                raise ValueError("Le manifeste doit contenir path et observation_id.")
            for row in reader:
                if None in row or any(value is None for value in row.values()):
                    raise ValueError("Ligne CSV incomplète ou mal formée.")
                relative = Path(row["path"])
                key = relative.as_posix()
                if relative.is_absolute() or ".." in relative.parts or key not in records:
                    raise ValueError(f"Chemin du manifeste absent ou invalide : {key}")
                if key in seen:
                    raise ValueError(f"Chemin répété dans le manifeste : {key}")
                seen.add(key)
                record = records[key]
                if row.get("sha256") and row["sha256"].lower() != record["sha256"]:
                    raise ValueError(f"SHA-256 différent du manifeste : {key}")
                record["observation_id"] = row["observation_id"].strip()
                record["metadata"] = row
    missing = sum(not record["observation_id"] for record in records.values())
    if missing:
        warnings.append(f"{missing} image(s) sans observation connue : seule la fuite par doublons exacts est contrôlée pour ces images.")
    return list(records.values()), warnings


def make_groups(records):
    parents = list(range(len(records)))

    def find(index):
        while parents[index] != index:
            parents[index] = parents[parents[index]]
            index = parents[index]
        return index

    owners = {}
    for index, record in enumerate(records):
        keys = [("sha256", record["sha256"])]
        if record["observation_id"]:
            keys.append(("observation", record["observation_id"]))
        for key in keys:
            if key in owners:
                parents[find(index)] = find(owners[key])
            else:
                owners[key] = index
    groups = defaultdict(list)
    for index, record in enumerate(records):
        groups[find(index)].append(record)
    by_species = defaultdict(list)
    for group in groups.values():
        species = {record["species_folder"] for record in group}
        if len(species) != 1:
            raise ValueError(f"Observation ou doublon commun à plusieurs espèces : {sorted(species)}. Corriger les étiquettes avant de séparer.")
        by_species[group[0]["species_folder"]].append(group)
    return by_species


def allocate(records, ratios, seed):
    by_species = make_groups(records)
    generator = random.Random(seed)
    summary = {}
    for species, groups in sorted(by_species.items()):
        if len(groups) < 3:
            raise ValueError(f"{species} : au moins 3 groupes indépendants sont nécessaires, trouvé {len(groups)}.")
        total = sum(len(group) for group in groups)
        targets = [total * ratio for ratio in ratios]
        counts = [0, 0, 0]
        generator.shuffle(groups)
        groups.sort(key=len, reverse=True)
        for position, group in enumerate(groups):
            empty = [index for index, count in enumerate(counts) if count == 0]
            candidates = empty if len(groups) - position == len(empty) else list(range(3))
            generator.shuffle(candidates)
            chosen = min(candidates, key=lambda index: (
                (counts[index] + len(group) - targets[index]) ** 2
                - (counts[index] - targets[index]) ** 2
            ))
            counts[chosen] += len(group)
            for record in group:
                record["split"] = SPLITS[chosen]
                record["group_id"] = min(item["source_path"] for item in group)
        summary[species] = {
            "total": total, "groups": len(groups),
            "counts": dict(zip(SPLITS, counts)),
            "percentages": dict(zip(SPLITS, [round(100 * count / total, 2) for count in counts])),
        }
    return summary


def check_assignments(records, summary):
    owners = {}
    paths = set()
    for record in records:
        if record["source_path"] in paths or record["split"] not in SPLITS:
            raise ValueError("Affectation absente ou répétée.")
        paths.add(record["source_path"])
        for field in ("sha256", "observation_id", "group_id"):
            if record[field]:
                key = (field, record[field])
                if key in owners and owners[key] != record["split"]:
                    raise ValueError(f"Fuite entre ensembles : {key}")
                owners[key] = record["split"]
    for species, details in summary.items():
        actual = Counter(record["split"] for record in records if record["species_folder"] == species)
        if dict(actual) != details["counts"] or sum(actual.values()) != details["total"]:
            raise ValueError(f"Comptages incohérents : {species}")


def check_output(source, output):
    if output == source or output.is_relative_to(source) or source.is_relative_to(output):
        raise ValueError("Les dossiers source et destination doivent être disjoints.")
    if output.exists():
        if not output.is_dir() or any(path.is_file() or path.is_symlink() for path in output.rglob("*")):
            raise ValueError(f"Destination non vide : {output}. Choisir un autre --output.")


def write_split(source, output, records, report):
    output.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=f".{output.name}-", dir=output.parent))
    try:
        for record in records:
            relative = Path(record["split"]) / record["source_path"]
            destination = staging / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source / record["source_path"], destination)
            if digest(destination) != record["sha256"]:
                raise ValueError(f"Copie non conforme : {relative}")
            record["split_path"] = relative.as_posix()
        for record in records:
            if digest(source / record["source_path"]) != record["sha256"]:
                raise ValueError(f"Source modifiée pendant la séparation : {record['source_path']}")
        if sum(path.is_file() for path in staging.rglob("*")) != len(records):
            raise ValueError("Nombre de copies incohérent.")
        fields = ["source_path", "split_path", "species_folder", "split", "group_id", "sha256", "observation_id"]
        metadata_fields = sorted({key for record in records for key in record["metadata"]})
        with (staging / "split_manifest.csv").open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=fields + [f"original_{key}" for key in metadata_fields])
            writer.writeheader()
            for record in records:
                writer.writerow({**{key: record[key] for key in fields},
                                 **{f"original_{key}": value for key, value in record["metadata"].items()}})
        (staging / "summary.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        check_output(source, output)
        if output.exists():
            for directory in sorted(output.rglob("*"), key=lambda path: len(path.parts), reverse=True):
                directory.rmdir()
            output.rmdir()
        staging.rename(output)
    finally:
        if staging.exists():
            shutil.rmtree(staging)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT / "data/raw")
    parser.add_argument("--output", type=Path, default=ROOT / "data/splits")
    parser.add_argument("--manifest", type=Path, help="CSV path/observation_id ; sinon source/manifest.csv si présent")
    parser.add_argument("--ratios", type=float, nargs=3, default=(0.70, 0.15, 0.15), metavar=("TRAIN", "VAL", "TEST"))
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--dry-run", action="store_true", help="Vérifier et afficher sans écrire")
    args = parser.parse_args(argv)
    try:
        if any(not math.isfinite(ratio) or ratio <= 0 for ratio in args.ratios) or not math.isclose(sum(args.ratios), 1, abs_tol=1e-9):
            raise ValueError("Les trois ratios doivent être positifs et leur somme égale à 1.")
        source, output = args.source.resolve(), args.output.resolve()
        check_output(source, output)
        manifest = args.manifest.resolve() if args.manifest else source / "manifest.csv"
        if not args.manifest and not manifest.exists():
            manifest = None
        records, warnings = load_images(source, manifest)
        summary = allocate(records, args.ratios, args.seed)
        check_assignments(records, summary)
        hashes = Counter(record["sha256"] for record in records)
        report = {"seed": args.seed, "ratios": dict(zip(SPLITS, args.ratios)),
                  "source": str(source), "manifest": str(manifest) if manifest else None,
                  "total": len(records), "duplicate_groups": sum(count > 1 for count in hashes.values()),
                  "duplicate_extra_files": sum(count - 1 for count in hashes.values()),
                  "warnings": warnings, "species": summary}
        for warning in warnings:
            print(f"AVERTISSEMENT : {warning}", file=sys.stderr)
        print("Espèce                         Total  Train    Val   Test  Groupes")
        for species, details in summary.items():
            counts = details["counts"]
            print(f"{species:30} {details['total']:5} {counts['train']:6} {counts['val']:6} {counts['test']:6} {details['groups']:8}")
        print(f"Doublons exacts : {report['duplicate_groups']} groupes, {report['duplicate_extra_files']} copies supplémentaires (conservées dans le même ensemble).")
        if not args.dry_run:
            write_split(source, output, records, report)
        print("Simulation vérifiée, aucun fichier écrit." if args.dry_run else f"Séparation vérifiée : {output}")
        return 0
    except (OSError, ValueError, csv.Error, Image.DecompressionBombError) as error:
        print(f"ERREUR : {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
