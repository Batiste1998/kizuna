import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PWD = 'Password123!';

describe('Bilans tripartites (e2e)', () => {
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

  it('lets a tutor schedule a bilan and update its status; alternant reads only', async () => {
    const profilId = await alternantProfileId();
    const peda = await agentFor('peda@kizuna.dev');

    const { body: created } = await peda
      .post(`/alternants/${profilId}/bilans`)
      .send({ label: 'Bilan mi-parcours', scheduledAt: '2026-09-15T10:00:00.000Z' })
      .expect(201);
    expect(created.status).toBe('planned');
    const bilanId = created.id as string;

    const { body: updated } = await peda
      .patch(`/bilans/${bilanId}`)
      .send({ status: 'signed', summary: 'RAS' })
      .expect(200);
    expect(updated.status).toBe('signed');

    const alternant = await agentFor('alternant@kizuna.dev');
    const { body: view } = await alternant.get(`/alternants/${profilId}/bilans`).expect(200);
    expect(view.canManage).toBe(false);
    expect(view.bilans.some((b: { id: string }) => b.id === bilanId)).toBe(true);
  });

  it('forbids the alternant from scheduling a bilan (403)', async () => {
    const profilId = await alternantProfileId();
    const alternant = await agentFor('alternant@kizuna.dev');
    await alternant
      .post(`/alternants/${profilId}/bilans`)
      .send({ label: 'Tentative', scheduledAt: '2026-10-01T10:00:00.000Z' })
      .expect(403);
  });

  it('rejects an invalid scheduled date (400)', async () => {
    const profilId = await alternantProfileId();
    const peda = await agentFor('peda@kizuna.dev');
    await peda
      .post(`/alternants/${profilId}/bilans`)
      .send({ label: 'Mauvaise date', scheduledAt: 'not-a-date' })
      .expect(400);
  });
});
