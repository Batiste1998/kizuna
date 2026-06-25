import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PWD = 'Password123!';

describe('Super Admin (e2e)', () => {
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

  it('returns the platform overview', async () => {
    const sa = await agentFor('superadmin@kizuna.dev');
    const { body } = await sa.get('/superadmin/overview').expect(200);
    expect(body.counts.organizations).toBeGreaterThan(0);
    expect(body.counts.users).toBeGreaterThan(0);
  });

  it('lists and creates organizations', async () => {
    const sa = await agentFor('superadmin@kizuna.dev');
    const { body: before } = await sa.get('/superadmin/organizations').expect(200);
    expect(before.length).toBeGreaterThan(0);

    const { body: created } = await sa
      .post('/superadmin/organizations')
      .send({ name: 'Nouvelle École', type: 'Université', city: 'Paris' })
      .expect(201);
    expect(created.name).toBe('Nouvelle École');

    const { body: after } = await sa.get('/superadmin/organizations').expect(200);
    expect(after.some((o: { id: string }) => o.id === created.id)).toBe(true);
  });

  it('lists users and can ban one', async () => {
    const sa = await agentFor('superadmin@kizuna.dev');

    // create a throwaway user to ban
    const guest = request.agent(app.getHttpServer());
    const email = `to-ban-${Date.now()}@example.com`;
    const { body: signup } = await guest
      .post('/api/auth/sign-up/email')
      .send({ name: 'To Ban', email, password: PWD })
      .expect(200);

    const { body: list } = await sa.get('/superadmin/users').expect(200);
    expect(list.some((u: { email: string }) => u.email === email)).toBe(true);

    const { body: updated } = await sa
      .patch(`/superadmin/users/${signup.user.id}`)
      .send({ banned: true })
      .expect(200);
    expect(updated.banned).toBe(true);
  });

  it('forbids a non-super-admin (403)', async () => {
    const admin = await agentFor('admin@kizuna.dev');
    await admin.get('/superadmin/overview').expect(403);
  });
});
