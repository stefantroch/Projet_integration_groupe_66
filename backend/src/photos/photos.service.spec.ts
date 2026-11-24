import { Test, TestingModule } from '@nestjs/testing';
import { PhotosService } from './photos.service.js';
import { afterEach, vi } from 'vitest';

const {
  chercherAnimal,
  premierAnimal,
  transaction,
  debloquer,
  creerCapture,
  ecrirePhoto,
  supprimerPhoto,
} = vi.hoisted(() => ({
  chercherAnimal: vi.fn(),
  premierAnimal: vi.fn(),
  transaction: vi.fn(),
  debloquer: vi.fn(),
  creerCapture: vi.fn(),
  ecrirePhoto: vi.fn(),
  supprimerPhoto: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: ecrirePhoto,
  rm: supprimerPhoto,
}));

// Un test unitaire ne doit pas dépendre d'une vraie base PostgreSQL.
vi.mock('../prisma/db.js', () => ({
  db: {
    transaction,
    orm: {
      public: {
        Animal: { where: chercherAnimal },
      },
    },
  },
}));

describe('PhotosService', () => {
  let service: PhotosService;

  beforeEach(async () => {
    vi.stubEnv('RECOGNITION_MIN_SCORE', '0.6');
    ecrirePhoto.mockReset().mockResolvedValue(undefined);
    supprimerPhoto.mockReset().mockResolvedValue(undefined);
    debloquer.mockReset().mockResolvedValue(1);
    creerCapture
      .mockReset()
      .mockResolvedValue({
        idCapture: 10,
        dateCapture: '2026-11-24T12:00:00Z',
      });
    transaction.mockReset().mockImplementation(async (action) =>
      action({
        orm: {
          public: {
            AnimalDebloque: { createAndCount: debloquer },
            Capture: { create: creerCapture },
          },
        },
      }),
    );
    chercherAnimal.mockReset().mockReturnValue({ first: premierAnimal });
    premierAnimal.mockReset().mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhotosService],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  const image = {
    buffer: Buffer.from('image de test'),
    originalname: 'lion.jpg',
    mimetype: 'image/jpeg',
  } as Express.Multer.File;

  it('transmet la photo et retourne la meilleure prédiction avec l’animal de la DB', async () => {
    vi.stubEnv('RECOGNITION_URL', 'http://recognition:8000/');
    const resultat = {
      predictions: [
        { species: 'panthera_leo', score: 0.94 },
        { species: 'panthera_tigris', score: 0.04 },
      ],
    };
    const animal = { idAnimal: 1, nom: 'Lion', cleModele: 'panthera_leo' };
    premierAnimal.mockResolvedValue(animal);
    const appel = vi.fn().mockResolvedValue(Response.json(resultat));
    vi.stubGlobal('fetch', appel);

    await expect(service.analyser(image, 7)).resolves.toEqual({
      prediction: resultat.predictions[0],
      animal,
      statut: 'reconnu',
      nouveauDeblocage: true,
      dejaDebloque: false,
      capture: { idCapture: 10, dateCapture: '2026-11-24T12:00:00Z' },
    });
    expect(debloquer).toHaveBeenCalledWith(
      [{ idUtilisateur: 7, idAnimal: 1 }],
      { onConflict: 'skip', conflictOn: ['idUtilisateur', 'idAnimal'] },
    );
    expect(creerCapture).toHaveBeenCalledWith(
      expect.objectContaining({ idUtilisateur: 7, idAnimal: 1, score: 0.94 }),
    );
    expect(chercherAnimal).toHaveBeenCalledExactlyOnceWith({
      cleModele: 'panthera_leo',
    });
    expect(premierAnimal).toHaveBeenCalledOnce();
    const [url, options] = appel.mock.calls[0];
    expect(url).toBe('http://recognition:8000/predict');
    expect(options.method).toBe('POST');
    const fichier = options.body.get('image') as File;
    expect(fichier.name).toBe('lion.jpg');
    expect(fichier.type).toBe('image/jpeg');
    expect(Buffer.from(await fichier.arrayBuffer())).toEqual(image.buffer);
  });

  it('retourne animal: null si l’espèce reconnue n’existe pas en DB', async () => {
    const prediction = { species: 'panthera_leo', score: 0.94 };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ predictions: [prediction] })),
    );

    await expect(service.analyser(image, 7)).resolves.toEqual({
      prediction,
      animal: null,
      statut: 'inconnu',
      nouveauDeblocage: false,
      dejaDebloque: false,
      capture: null,
    });
    expect(transaction).not.toHaveBeenCalled();
    expect(ecrirePhoto).not.toHaveBeenCalled();
  });

  it('refuse une prédiction trop faible sans écrire en DB ni stocker la photo', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            predictions: [{ species: 'panthera_leo', score: 0.4 }],
          }),
        ),
    );
    await expect(service.analyser(image, 7)).resolves.toMatchObject({
      statut: 'incertain',
      capture: null,
    });
    expect(chercherAnimal).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
    expect(ecrirePhoto).not.toHaveBeenCalled();
  });

  it('enregistre une nouvelle capture même si l’animal était déjà débloqué', async () => {
    premierAnimal.mockResolvedValue({ idAnimal: 1, nom: 'Lion' });
    debloquer.mockResolvedValue(0);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            predictions: [{ species: 'panthera_leo', score: 0.9 }],
          }),
        ),
    );
    await expect(service.analyser(image, 7)).resolves.toMatchObject({
      statut: 'reconnu',
      dejaDebloque: true,
      nouveauDeblocage: false,
    });
    expect(creerCapture).toHaveBeenCalledOnce();
  });

  it('nettoie la photo si la transaction échoue, sans masquer l’erreur DB', async () => {
    premierAnimal.mockResolvedValue({ idAnimal: 1 });
    const erreur = new Error('DB indisponible');
    transaction.mockRejectedValue(erreur);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            predictions: [{ species: 'panthera_leo', score: 0.9 }],
          }),
        ),
    );
    await expect(service.analyser(image, 7)).rejects.toBe(erreur);
    expect(supprimerPhoto).toHaveBeenCalledWith(
      expect.stringMatching(/\.jpg$/),
      { force: true },
    );
  });

  it('refuse un utilisateur invalide', async () => {
    await expect(service.analyser(image, NaN)).rejects.toMatchObject({
      status: 401,
    });
  });

  it('refuse un format non supporté avant de contacter Python', async () => {
    await expect(
      service.analyser({ ...image, mimetype: 'text/plain' }, 7),
    ).rejects.toMatchObject({ status: 400 });
  });

  it.each([400, 413, 415, 503, 500])(
    'gère une erreur HTTP %s de Python',
    async (statut) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(null, { status: statut })),
      );
      await expect(service.analyser(image, 7)).rejects.toMatchObject({
        status: statut === 500 ? 502 : statut,
      });
    },
  );

  it.each([
    { predictions: [] },
    { predictions: [{ species: 'lion', score: 2 }] },
    {},
  ])(
    'refuse une réponse qui ne respecte pas le contrat : %j',
    async (resultat) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(Response.json(resultat)),
      );
      await expect(service.analyser(image, 7)).rejects.toMatchObject({
        status: 502,
      });
    },
  );

  it('gère une panne réseau', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('fetch failed')),
    );
    await expect(service.analyser(image, 7)).rejects.toMatchObject({
      status: 502,
    });
  });

  it('interrompt la requête après le délai maximal', async () => {
    const signal = AbortSignal.abort();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(signal);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(signal.reason));
    await expect(service.analyser(image, 7)).rejects.toMatchObject({
      status: 504,
    });
  });
});
