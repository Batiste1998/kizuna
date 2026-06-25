import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PWD = 'Password123!';

/** Relies on the demo trinôme around alternant@kizuna.dev (seed:users). */
describe('Journal d’activités (e2e)', () => {
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

  it('lets the alternant write an entry (pending) and the company tutor validate it', async () => {
    const profilId = await alternantProfileId();
    const alternant = await agentFor('alternant@kizuna.dev');

    const { body: created } = await alternant
      .post(`/alternants/${profilId}/journal`)
      .send({ title: 'Sprint 1', content: 'Mise en place du CI et des migrations.' })
      .expect(201);
    expect(created.status).toBe('pending');
    const entryId = created.id as string;

    const entreprise = await agentFor('entreprise@kizuna.dev');
    const { body: view } = await entreprise.get(`/alternants/${profilId}/journal`).expect(200);
    expect(view.editableAs).toBe('entreprise');

    await entreprise
      .put(`/journal/${entryId}/review`)
      .send({ status: 'validated', comment: 'Bon travail' })
      .expect(200);

    const { body: after } = await alternant.get(`/alternants/${profilId}/journal`).expect(200);
    const entry = after.entries.find((e: { id: string }) => e.id === entryId);
    expect(entry.status).toBe('validated');
    expect(entry.reviewComment).toBe('Bon travail');
  });

  it('forbids the tuteur pédagogique from writing or validating the journal', async () => {
    const profilId = await alternantProfileId();
    const peda = await agentFor('peda@kizuna.dev');

    await peda
      .post(`/alternants/${profilId}/journal`)
      .send({ title: 'x', content: 'y' })
      .expect(403);

    // create one as the alternant, then peda must not be able to review it
    const alternant = await agentFor('alternant@kizuna.dev');
    const { body: created } = await alternant
      .post(`/alternants/${profilId}/journal`)
      .send({ title: 'À valider', content: 'Contenu' })
      .expect(201);

    await peda.put(`/journal/${created.id}/review`).send({ status: 'validated' }).expect(403);
  });

  it('rejects an empty entry (400)', async () => {
    const profilId = await alternantProfileId();
    const alternant = await agentFor('alternant@kizuna.dev');
    await alternant
      .post(`/alternants/${profilId}/journal`)
      .send({ title: '', content: 'z' })
      .expect(400);
  });
});
