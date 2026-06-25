import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PWD = 'Password123!';

/**
 * Relies on the demo dataset (`pnpm db:seed` + `pnpm --filter @kizuna/api seed:users`):
 * a CFA with the RNCP référentiel and a trinôme around alternant@kizuna.dev.
 */
describe('Compétences + tri-évaluation (e2e)', () => {
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

  it('lets the alternant self-assess (auto) and reads it back', async () => {
    const alternant = await agentFor('alternant@kizuna.dev');

    const { body: me } = await alternant.get('/me/alternant').expect(200);
    const profilId = me.alternantProfilId as string;

    const { body: view } = await alternant.get(`/alternants/${profilId}/competences`).expect(200);
    expect(view.editableAs).toBe('auto');
    expect(view.blocs.length).toBeGreaterThan(0);

    const competenceId = view.blocs[0].competences[0].id as string;

    const { body: saved } = await alternant
      .put(`/alternants/${profilId}/competences/${competenceId}/evaluation`)
      .send({ level: 'A' })
      .expect(200);
    expect(saved.evaluator).toBe('auto');
    expect(saved.level).toBe('A');

    const { body: after } = await alternant.get(`/alternants/${profilId}/competences`).expect(200);
    const comp = after.blocs[0].competences[0];
    expect(comp.evaluations.auto).toBe('A');
  });

  it('lets the tuteur pédagogique evaluate the same apprentice (peda)', async () => {
    const alternant = await agentFor('alternant@kizuna.dev');
    const { body: me } = await alternant.get('/me/alternant').expect(200);
    const profilId = me.alternantProfilId as string;

    const peda = await agentFor('peda@kizuna.dev');
    const { body: view } = await peda.get(`/alternants/${profilId}/competences`).expect(200);
    expect(view.editableAs).toBe('peda');

    const competenceId = view.blocs[0].competences[0].id as string;
    const { body: saved } = await peda
      .put(`/alternants/${profilId}/competences/${competenceId}/evaluation`)
      .send({ level: 'M' })
      .expect(200);
    expect(saved.evaluator).toBe('peda');
  });

  it('rejects an invalid level (400)', async () => {
    const alternant = await agentFor('alternant@kizuna.dev');
    const { body: me } = await alternant.get('/me/alternant').expect(200);
    const { body: view } = await alternant
      .get(`/alternants/${me.alternantProfilId}/competences`)
      .expect(200);
    const competenceId = view.blocs[0].competences[0].id as string;

    await alternant
      .put(`/alternants/${me.alternantProfilId}/competences/${competenceId}/evaluation`)
      .send({ level: 'WRONG' })
      .expect(400);
  });

  it('forbids an unrelated user from reading an apprentice (403)', async () => {
    const alternant = await agentFor('alternant@kizuna.dev');
    const { body: me } = await alternant.get('/me/alternant').expect(200);

    const stranger = request.agent(app.getHttpServer());
    const email = `stranger-${Date.now()}@example.com`;
    await stranger
      .post('/api/auth/sign-up/email')
      .send({ name: 'Stranger', email, password: PWD })
      .expect(200);

    await stranger.get(`/alternants/${me.alternantProfilId}/competences`).expect(403);
  });
});
