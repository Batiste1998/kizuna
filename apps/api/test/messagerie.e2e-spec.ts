import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PWD = 'Password123!';

describe('Messagerie de trinôme (e2e)', () => {
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

  it('lets the trinôme exchange messages with author roles', async () => {
    const profilId = await alternantProfileId();
    const alternant = await agentFor('alternant@kizuna.dev');
    const entreprise = await agentFor('entreprise@kizuna.dev');

    const { body: m1 } = await alternant
      .post(`/alternants/${profilId}/messages`)
      .send({ body: 'Bonjour, voici mon avancement.' })
      .expect(201);
    expect(m1.authorRelation).toBe('alternant');

    await entreprise
      .post(`/alternants/${profilId}/messages`)
      .send({ body: 'Bien reçu, on en parle au prochain point.' })
      .expect(201);

    const { body: view } = await alternant.get(`/alternants/${profilId}/messages`).expect(200);
    expect(view.canPost).toBe(true);
    const relations = view.messages.map((m: { authorRelation: string }) => m.authorRelation);
    expect(relations).toContain('alternant');
    expect(relations).toContain('entreprise');
  });

  it('forbids an outsider from reading or posting (403)', async () => {
    const profilId = await alternantProfileId();
    const stranger = request.agent(app.getHttpServer());
    const email = `outsider-${Date.now()}@example.com`;
    await stranger
      .post('/api/auth/sign-up/email')
      .send({ name: 'Outsider', email, password: PWD })
      .expect(200);

    await stranger.get(`/alternants/${profilId}/messages`).expect(403);
    await stranger.post(`/alternants/${profilId}/messages`).send({ body: 'hello' }).expect(403);
  });

  it('rejects an empty message (400)', async () => {
    const profilId = await alternantProfileId();
    const alternant = await agentFor('alternant@kizuna.dev');
    await alternant.post(`/alternants/${profilId}/messages`).send({ body: '' }).expect(400);
  });
});
