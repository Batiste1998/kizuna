import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PWD = 'Password123!';

describe('Espace tuteur — Mes alternants (e2e)', () => {
  let app: INestApplication;

  async function agentFor(email: string) {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/sign-in/email').send({ email, password: PWD }).expect(200);
    return agent;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists the apprentices supervised by the tuteur pédagogique', async () => {
    const peda = await agentFor('peda@kizuna.dev');
    const { body } = await peda.get('/me/alternants').expect(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].myRole).toBe('peda');
    expect(body[0]).toHaveProperty('alternantProfilId');
    expect(body[0].progress).toHaveProperty('total');
  });

  it('exposes the company tutor role for the same trinôme', async () => {
    const entreprise = await agentFor('entreprise@kizuna.dev');
    const { body } = await entreprise.get('/me/alternants').expect(200);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].myRole).toBe('entreprise');
  });

  it('returns an empty list for a user who supervises nobody', async () => {
    const stranger = request.agent(app.getHttpServer());
    const email = `tutor-none-${Date.now()}@example.com`;
    await stranger
      .post('/api/auth/sign-up/email')
      .send({ name: 'No One', email, password: PWD })
      .expect(200);
    const { body } = await stranger.get('/me/alternants').expect(200);
    expect(body).toEqual([]);
  });
});
