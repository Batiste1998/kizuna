import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PWD = 'Password123!';

describe('Notifications (e2e)', () => {
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

  it('notifies the alternant when the company tutor validates a journal entry', async () => {
    const profilId = await alternantProfileId();
    const alternant = await agentFor('alternant@kizuna.dev');

    const { body: entry } = await alternant
      .post(`/alternants/${profilId}/journal`)
      .send({ title: 'Entrée à notifier', content: 'Contenu' })
      .expect(201);

    const entreprise = await agentFor('entreprise@kizuna.dev');
    await entreprise.put(`/journal/${entry.id}/review`).send({ status: 'validated' }).expect(200);

    const { body: notifs } = await alternant.get('/notifications').expect(200);
    expect(notifs.unreadCount).toBeGreaterThan(0);
    const journalNotif = notifs.notifications.find((n: { type: string }) => n.type === 'journal');
    expect(journalNotif).toBeTruthy();
    expect(journalNotif.read).toBe(false);
  });

  it('marks notifications as read (one then all)', async () => {
    const alternant = await agentFor('alternant@kizuna.dev');
    const { body: before } = await alternant.get('/notifications').expect(200);
    expect(before.notifications.length).toBeGreaterThan(0);

    const first = before.notifications[0];
    await alternant.post(`/notifications/${first.id}/read`).expect(201);

    await alternant.post('/notifications/read-all').expect(201);
    const { body: after } = await alternant.get('/notifications').expect(200);
    expect(after.unreadCount).toBe(0);
  });

  it('notifies the other trinôme members when a message is posted', async () => {
    const profilId = await alternantProfileId();
    const alternant = await agentFor('alternant@kizuna.dev');
    await alternant
      .post(`/alternants/${profilId}/messages`)
      .send({ body: 'Message qui notifie' })
      .expect(201);

    const peda = await agentFor('peda@kizuna.dev');
    const { body: notifs } = await peda.get('/notifications').expect(200);
    expect(notifs.notifications.some((n: { type: string }) => n.type === 'message')).toBe(true);
  });
});
