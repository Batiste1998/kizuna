import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PWD = 'Password123!';

describe('Échéancier (e2e)', () => {
  let app: INestApplication;

  async function agentFor(email: string) {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/sign-in/email').send({ email, password: PWD }).expect(200);
    return agent;
  }

  async function alternantProfileId() {
    const alternant = await agentFor('alternant@kizuna.dev');
    const { body } = await alternant.get('/me/alternant').expect(200);
    return body.alternantProfilId as string;
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

  it('lets a tutor add a deadline visible to the apprentice', async () => {
    const profilId = await alternantProfileId();
    const peda = await agentFor('peda@kizuna.dev');

    const { body: created } = await peda
      .post(`/alternants/${profilId}/echeances`)
      .send({ title: 'Rendu du dossier projet', dueDate: '2026-12-15T23:59:00.000Z' })
      .expect(201);
    expect(created.title).toBe('Rendu du dossier projet');

    const alternant = await agentFor('alternant@kizuna.dev');
    const { body: view } = await alternant.get(`/alternants/${profilId}/echeances`).expect(200);
    expect(view.canManage).toBe(false);
    expect(view.echeances.some((e: { id: string }) => e.id === created.id)).toBe(true);
  });

  it('forbids the apprentice from creating a deadline (403)', async () => {
    const profilId = await alternantProfileId();
    const alternant = await agentFor('alternant@kizuna.dev');
    await alternant
      .post(`/alternants/${profilId}/echeances`)
      .send({ title: 'Tentative', dueDate: '2026-12-20T10:00:00.000Z' })
      .expect(403);
  });

  it('rejects a missing title (400)', async () => {
    const profilId = await alternantProfileId();
    const peda = await agentFor('peda@kizuna.dev');
    await peda
      .post(`/alternants/${profilId}/echeances`)
      .send({ dueDate: '2026-12-20T10:00:00.000Z' })
      .expect(400);
  });
});
