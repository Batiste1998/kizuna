import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PWD = 'Password123!';

describe('Espace Admin (e2e)', () => {
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

  it('returns the establishment overview with counts', async () => {
    const admin = await agentFor('admin@kizuna.dev');
    const { body } = await admin.get('/admin/overview').expect(200);
    expect(body.organizationName).toBeTruthy();
    expect(body.counts.alternants).toBeGreaterThan(0);
    expect(body.counts.members).toBeGreaterThan(0);
  });

  it('lists alternants with their trinôme details', async () => {
    const admin = await agentFor('admin@kizuna.dev');
    const { body } = await admin.get('/admin/alternants').expect(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('tuteurPedaName');
  });

  it('creates then deletes an entreprise', async () => {
    const admin = await agentFor('admin@kizuna.dev');
    const { body: created } = await admin
      .post('/admin/entreprises')
      .send({ name: 'Nouvelle Entreprise', sector: 'Tech', city: 'Paris' })
      .expect(201);
    expect(created.name).toBe('Nouvelle Entreprise');

    const { body: list } = await admin.get('/admin/entreprises').expect(200);
    expect(list.some((e: { id: string }) => e.id === created.id)).toBe(true);

    await admin.delete(`/admin/entreprises/${created.id}`).expect(200);
    const { body: after } = await admin.get('/admin/entreprises').expect(200);
    expect(after.some((e: { id: string }) => e.id === created.id)).toBe(false);
  });

  it('creates a promotion', async () => {
    const admin = await agentFor('admin@kizuna.dev');
    const { body } = await admin
      .post('/admin/promotions')
      .send({ name: 'Promo Test 2026', rncpLevel: 6 })
      .expect(201);
    expect(body.name).toBe('Promo Test 2026');
  });

  it('onboards an alternant + tutors and builds the trinôme', async () => {
    const admin = await agentFor('admin@kizuna.dev');

    const { body: alt } = await admin
      .post('/admin/members')
      .send({ name: 'E2E Alternant', email: 'e2e.alt@kizuna.dev', role: 'alternant' })
      .expect(201);
    expect(alt.alternantProfilId).toBeTruthy();

    const { body: peda } = await admin
      .post('/admin/members')
      .send({ name: 'E2E Peda', email: 'e2e.peda@kizuna.dev', role: 'tuteur_pedagogique' })
      .expect(201);
    const { body: entr } = await admin
      .post('/admin/members')
      .send({ name: 'E2E Entr', email: 'e2e.entr@kizuna.dev', role: 'tuteur_entreprise' })
      .expect(201);

    const { body: assoc } = await admin
      .put(`/admin/alternants/${alt.alternantProfilId}/association`)
      .send({ tuteurPedaUserId: peda.userId, tuteurEntrepriseUserId: entr.userId })
      .expect(200);
    expect(assoc.tuteurPedaUserId).toBe(peda.userId);

    const { body: list } = await admin.get('/admin/alternants').expect(200);
    const created = list.find((a: { email: string }) => a.email === 'e2e.alt@kizuna.dev');
    expect(created?.tuteurPedaName).toBe('E2E Peda');
  });

  it('rejects an invalid member role (400)', async () => {
    const admin = await agentFor('admin@kizuna.dev');
    await admin
      .post('/admin/members')
      .send({ name: 'Bad', email: 'bad-role@kizuna.dev', role: 'wizard' })
      .expect(400);
  });

  it('forbids a non-admin from the admin space (403)', async () => {
    const alternant = await agentFor('alternant@kizuna.dev');
    await alternant.get('/admin/overview').expect(403);
    await alternant
      .post('/admin/members')
      .send({ name: 'X', email: 'x@kizuna.dev', role: 'alternant' })
      .expect(403);
  });
});
