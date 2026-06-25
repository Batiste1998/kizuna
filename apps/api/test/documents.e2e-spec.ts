import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PWD = 'Password123!';

describe('Documents (e2e)', () => {
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

  it('uploads, lists, downloads and deletes a document', async () => {
    const profilId = await alternantProfileId();
    const alternant = await agentFor('alternant@kizuna.dev');

    const { body: created } = await alternant
      .post(`/alternants/${profilId}/documents`)
      .field('category', 'compte_rendu')
      .attach('file', Buffer.from('Compte rendu hebdo'), 'cr.txt')
      .expect(201);
    expect(created.originalName).toBe('cr.txt');
    expect(created.category).toBe('compte_rendu');
    const docId = created.id as string;

    const { body: view } = await alternant.get(`/alternants/${profilId}/documents`).expect(200);
    expect(view.canUpload).toBe(true);
    expect(view.documents.some((d: { id: string }) => d.id === docId)).toBe(true);

    const dl = await alternant.get(`/documents/${docId}/download`).expect(200);
    expect(dl.text).toContain('Compte rendu hebdo');

    await alternant.delete(`/documents/${docId}`).expect(200);
    const { body: after } = await alternant.get(`/alternants/${profilId}/documents`).expect(200);
    expect(after.documents.some((d: { id: string }) => d.id === docId)).toBe(false);
  });

  it('forbids an outsider from listing documents (403)', async () => {
    const profilId = await alternantProfileId();
    const stranger = request.agent(app.getHttpServer());
    const email = `doc-outsider-${Date.now()}@example.com`;
    await stranger
      .post('/api/auth/sign-up/email')
      .send({ name: 'Outsider', email, password: PWD })
      .expect(200);
    await stranger.get(`/alternants/${profilId}/documents`).expect(403);
  });

  it('rejects an upload with no file (400)', async () => {
    const profilId = await alternantProfileId();
    const peda = await agentFor('peda@kizuna.dev');
    await peda.post(`/alternants/${profilId}/documents`).field('category', 'autre').expect(400);
  });
});
