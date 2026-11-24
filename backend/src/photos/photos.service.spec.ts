import { Test, TestingModule } from '@nestjs/testing';
import { PhotosService } from './photos.service.js';
import { afterEach, vi } from 'vitest';

describe('PhotosService', () => {
  let service: PhotosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PhotosService],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  const image = {
    buffer: Buffer.from('image de test'),
    originalname: 'lion.jpg',
    mimetype: 'image/jpeg',
  } as Express.Multer.File;

  it('transmet les octets dans le champ image et retourne les prédictions', async () => {
    vi.stubEnv('RECOGNITION_URL', 'http://recognition:8000/');
    const resultat = {
      predictions: [{ species: 'panthera_leo', score: 0.94 }],
    };
    const appel = vi.fn().mockResolvedValue(Response.json(resultat));
    vi.stubGlobal('fetch', appel);

    await expect(service.analyser(image)).resolves.toEqual(resultat);
    const [url, options] = appel.mock.calls[0];
    expect(url).toBe('http://recognition:8000/predict');
    expect(options.method).toBe('POST');
    const fichier = options.body.get('image') as File;
    expect(fichier.name).toBe('lion.jpg');
    expect(fichier.type).toBe('image/jpeg');
    expect(Buffer.from(await fichier.arrayBuffer())).toEqual(image.buffer);
  });

  it.each([400, 413, 415, 503, 500])(
    'gère une erreur HTTP %s de Python',
    async (statut) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(null, { status: statut })),
      );
      await expect(service.analyser(image)).rejects.toMatchObject({
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
      await expect(service.analyser(image)).rejects.toMatchObject({
        status: 502,
      });
    },
  );

  it('gère une panne réseau', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('fetch failed')),
    );
    await expect(service.analyser(image)).rejects.toMatchObject({
      status: 502,
    });
  });

  it('interrompt la requête après le délai maximal', async () => {
    const signal = AbortSignal.abort();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(signal);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(signal.reason));
    await expect(service.analyser(image)).rejects.toMatchObject({
      status: 504,
    });
    vi.restoreAllMocks();
  });
});
