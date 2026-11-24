import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CreatePhotoDto } from './dto/create-photo.dto.js';
import { UpdatePhotoDto } from './dto/update-photo.dto.js';
import { db } from '../prisma/db.js';

export type ResultatAnalyse = {
  predictions: { species: string; score: number }[];
};

@Injectable()
export class PhotosService {
  create(createPhotoDto: CreatePhotoDto) {
    return 'This action adds a new photo';
  }

  findAll() {
    return `This action returns all photos`;
  }

  findOne(id: number) {
    return `This action returns a #${id} photo`;
  }

  update(id: number, updatePhotoDto: UpdatePhotoDto) {
    return `This action updates a #${id} photo`;
  }

  remove(id: number) {
    return `This action removes a #${id} photo`;
  }
  async analyser(image: Express.Multer.File) {
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

      const prediction = resultat.predictions[0];
      const animal = await db.orm.public.Animal
        .where({ cleModele: prediction.species })
        .first();

      return {
        prediction,
        animal: animal ?? null,
      };
      
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
