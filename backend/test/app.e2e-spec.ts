import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app/app.module.js';
import { frontendOrigins } from '../src/auth/auth.config.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    app.enableCors({ origin: frontendOrigins, credentials: true });
    await app.init();
  });

  it('/ (GET) requires a session', () => {
    return request(app.getHttpServer()).get('/').expect(401);
  });

  it('/api/auth/get-session (GET) is accessible without a session', () => {
    return request(app.getHttpServer())
      .get('/api/auth/get-session')
      .expect(200)
      .expect('null');
  });

  afterEach(async () => {
    await app.close();
  });

  it('accepts frontend preflight requests with credentials', async () => {
    await request(app.getHttpServer())
      .options('/api/auth/sign-in/email')
      .set('Origin', frontendOrigins[0]!)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type')
      .expect(204)
      .expect('Access-Control-Allow-Origin', frontendOrigins[0]!)
      .expect('Access-Control-Allow-Credentials', 'true');
  });

  it('does not authorize an unknown origin through CORS', async () => {
    const response = await request(app.getHttpServer())
      .options('/api/auth/sign-in/email')
      .set('Origin', 'https://untrusted.example')
      .set('Access-Control-Request-Method', 'POST');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
