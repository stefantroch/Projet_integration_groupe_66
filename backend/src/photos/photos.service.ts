import {
  BadGatewayException,
  BadRequestException,
  UnauthorizedException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { db } from '../prisma/db.js';

export type ResultatAnalyse = {
  predictions: { species: string; score: number }[];
};

@Injectable()
export class PhotosService {
  async analyser(image: Express.Multer.File, idUtilisateur: number) {
    if (!Number.isSafeInteger(idUtilisateur) || idUtilisateur <= 0) {
      throw new UnauthorizedException();
    }
    if (!image.buffer?.length || image.buffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException(
        'La photo doit contenir entre 1 octet et 10 Mio',
      );
    }
    const extensions: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const extension = extensions[image.mimetype];
    if (!extension)
      throw new BadRequestException('Choisis une photo JPEG, PNG ou WebP');
    const seuil = Number(process.env.RECOGNITION_MIN_SCORE ?? '0.6');
    if (!Number.isFinite(seuil) || seuil < 0 || seuil > 1) {
      throw new Error('RECOGNITION_MIN_SCORE doit être compris entre 0 et 1');
    }
    const resultat = await this.appelerReconnaissance(image);
    const prediction = resultat.predictions.reduce((meilleure, candidate) =>
      candidate.score > meilleure.score ? candidate : meilleure,
    );
    if (prediction.score < seuil) {
      return {
        statut: 'incertain' as const,
        prediction,
        animal: null,
        dejaDebloque: false,
        nouveauDeblocage: false,
        capture: null,
      };
    }
    const animal = await db.orm.public.Animal.where({
      cleModele: prediction.species,
    }).first();
    if (!animal) {
      return {
        statut: 'inconnu' as const,
        prediction,
        animal: null,
        dejaDebloque: false,
        nouveauDeblocage: false,
        capture: null,
      };
    }

    // Nom généré côté serveur : le nom envoyé par le client n'est jamais un chemin.
    const dossier = resolve(process.env.PHOTO_UPLOAD_DIR ?? 'uploads/photos');
    const nomPhoto = `${randomUUID()}${extension}`;
    const cheminPhoto = join(dossier, nomPhoto);
    await mkdir(dossier, { recursive: true });
    try {
      await writeFile(cheminPhoto, image.buffer, { flag: 'wx' });
      const enregistrement = await db.transaction(async (tx) => {
        // ON CONFLICT évite un double déblocage, même en cas de requêtes simultanées.
        const ajoutes = await tx.orm.public.AnimalDebloque.createAndCount(
          [{ idUtilisateur, idAnimal: animal.idAnimal }],
          { onConflict: 'skip', conflictOn: ['idUtilisateur', 'idAnimal'] },
        );
        const capture = await tx.orm.public.Capture.create({
          idUtilisateur,
          idAnimal: animal.idAnimal,
          cheminPhoto: nomPhoto,
          score: prediction.score,
        });
        return { capture, nouveauDeblocage: ajoutes === 1 };
      });
      return {
        statut: 'reconnu' as const,
        prediction,
        animal,
        dejaDebloque: !enregistrement.nouveauDeblocage,
        nouveauDeblocage: enregistrement.nouveauDeblocage,
        capture: {
          idCapture: enregistrement.capture.idCapture,
          dateCapture: enregistrement.capture.dateCapture,
        },
      };
    } catch (erreur) {
      await rm(cheminPhoto, { force: true });
      throw erreur;
    }
  }

  private async appelerReconnaissance(
    image: Express.Multer.File,
  ): Promise<ResultatAnalyse> {
    // FastAPI attend un formulaire multipart avec un fichier nommé « image ».
    const formulaire = new FormData();
    const fichier = new Blob([new Uint8Array(image.buffer)], {
      type: image.mimetype,
    });
    formulaire.append('image', fichier, image.originalname);

    const adresse = process.env.RECOGNITION_URL ?? 'http://localhost:8000';
    const signal = AbortSignal.timeout(30_000);

    try {
      const reponse = await fetch(`${adresse.replace(/\/$/, '')}/predict`, {
        method: 'POST',
        body: formulaire,
        signal,
      });

      if (!reponse.ok) {
        // Conserver les erreurs utiles à l'utilisateur (image invalide ou trop grande).
        if ([400, 413, 415].includes(reponse.status)) {
          throw new HttpException(
            'Photo refusée par le service de reconnaissance',
            reponse.status,
          );
        }
        if (reponse.status === 503) {
          throw new ServiceUnavailableException(
            'Le modèle de reconnaissance est indisponible',
          );
        }
        throw new BadGatewayException('Le service de reconnaissance a échoué');
      }

      const resultat: unknown = await reponse.json();
      if (!this.estResultatAnalyse(resultat)) {
        throw new BadGatewayException(
          'Réponse du service de reconnaissance invalide',
        );
      }

      return resultat;
    } catch (erreur) {
      if (erreur instanceof HttpException) throw erreur;
      if (signal.aborted) {
        throw new GatewayTimeoutException(
          'Le service de reconnaissance met trop de temps à répondre',
        );
      }
      throw new BadGatewayException(
        'Impossible de lire la réponse du service de reconnaissance',
      );
    }
  }

  private estResultatAnalyse(valeur: unknown): valeur is ResultatAnalyse {
    if (
      typeof valeur !== 'object' ||
      valeur === null ||
      !('predictions' in valeur)
    ) {
      return false;
    }
    return (
      Array.isArray(valeur.predictions) &&
      valeur.predictions.length > 0 &&
      valeur.predictions.every(
        (prediction: unknown) =>
          typeof prediction === 'object' &&
          prediction !== null &&
          'species' in prediction &&
          typeof prediction.species === 'string' &&
          prediction.species.trim().length > 0 &&
          'score' in prediction &&
          typeof prediction.score === 'number' &&
          Number.isFinite(prediction.score) &&
          prediction.score >= 0 &&
          prediction.score <= 1,
      )
    );
  }
}
