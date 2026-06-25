import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const PWD = 'Password123!';

describe('Support / Tickets (e2e)', () => {
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

  it('lets a user open a ticket and support triage + reply + resolve it', async () => {
    const alternant = await agentFor('alternant@kizuna.dev');

    const { body: created } = await alternant
      .post('/tickets')
      .send({
        subject: 'Bug à la connexion',
        type: 'bug',
        priority: 'haute',
        description: 'Erreur 500.',
      })
      .expect(201);
    expect(created.ref).toMatch(/^KZ-\d{4}$/);
    expect(created.status).toBe('open');
    const ticketId = created.id as string;

    // requester sees their own ticket with the first message
    const { body: detail } = await alternant.get(`/tickets/${ticketId}`).expect(200);
    expect(detail.messages.length).toBe(1);
    expect(detail.canTriage).toBe(false);

    // support sees it, replies (→ in_progress + self-assigned) and resolves
    const support = await agentFor('support@kizuna.dev');
    const { body: supportList } = await support.get('/tickets').expect(200);
    expect(supportList.canTriage).toBe(true);
    expect(supportList.tickets.some((t: { id: string }) => t.id === ticketId)).toBe(true);

    const { body: reply } = await support
      .post(`/tickets/${ticketId}/messages`)
      .send({ body: 'Bonjour, nous regardons.' })
      .expect(201);
    expect(reply.authorIsSupport).toBe(true);

    const { body: afterReply } = await support.get(`/tickets/${ticketId}`).expect(200);
    expect(afterReply.ticket.status).toBe('in_progress');
    expect(afterReply.ticket.assigneeName).toBeTruthy();

    const { body: resolved } = await support
      .patch(`/tickets/${ticketId}`)
      .send({ status: 'resolved' })
      .expect(200);
    expect(resolved.status).toBe('resolved');
  });

  it('forbids a user from reading someone else’s ticket (403)', async () => {
    const owner = await agentFor('peda@kizuna.dev');
    const { body: created } = await owner
      .post('/tickets')
      .send({ subject: 'Demande accès', type: 'demande', description: 'Merci.' })
      .expect(201);

    const other = await agentFor('entreprise@kizuna.dev');
    await other.get(`/tickets/${created.id}`).expect(403);
  });

  it('rejects an invalid ticket type (400)', async () => {
    const alternant = await agentFor('alternant@kizuna.dev');
    await alternant
      .post('/tickets')
      .send({ subject: 'X', type: 'invalid', description: 'Y' })
      .expect(400);
  });
});
