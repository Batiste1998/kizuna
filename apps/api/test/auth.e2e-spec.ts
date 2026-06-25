import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

describe('Auth + RBAC (e2e)', () => {
  let app: INestApplication;
  const email = `auth-e2e-${Date.now()}@example.com`;
  const password = 'Password123!';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bodyParser: false });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs up a new user via Better Auth', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({ name: 'E2E User', email, password })
      .expect(200);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe('user');
  });

  it('rejects /me without a session (401)', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
  });

  it('returns the current user on /me with a session', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/sign-in/email').send({ email, password }).expect(200);

    const res = await agent.get('/me').expect(200);
    expect(res.body.email).toBe(email);
    expect(res.body.role).toBe('user');
  });

  it('forbids a normal user from a super_admin route (403)', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/auth/sign-in/email').send({ email, password }).expect(200);
    await agent.get('/admin/overview').expect(403);
  });
});
