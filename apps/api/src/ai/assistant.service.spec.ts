import { describe, expect, it, vi } from 'vitest';
import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import type { Response } from 'express';
import { AssistantService, type ChatMessage } from './assistant.service';
import { createDbMock } from '../testing/db-mock';
import type { DatabaseService } from '../database/database.service';
import type { AiService } from './ai.service';
import type { AuthUser } from '../auth/auth.types';

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'user-1',
  email: 'user@example.com',
  name: 'Léa Martin',
  emailVerified: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

/** Streamed OpenAI chunks as the SDK yields them. */
async function* chunks(...texts: string[]) {
  for (const text of texts) {
    yield { choices: [{ delta: { content: text } }] };
  }
}

function makeResponse() {
  return {
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  } as unknown as Response;
}

function makeService(options: { memberRole?: string; chatStream?: ReturnType<typeof vi.fn> } = {}) {
  const mock = createDbMock();
  const chatStream =
    options.chatStream ?? vi.fn().mockImplementation(() => Promise.resolve(chunks()));
  const service = new AssistantService(
    { chatStream } as unknown as AiService,
    { db: mock.db } as unknown as DatabaseService,
  );
  if (options.memberRole !== undefined) mock.enqueue([{ role: options.memberRole }]);
  return { service, mock, chatStream };
}

const QUESTION: ChatMessage[] = [{ role: 'user', content: 'Comment planifier un bilan ?' }];

describe('AssistantService', () => {
  it('streams every chunk onto the response then closes it', async () => {
    const chatStream = vi.fn().mockResolvedValue(chunks('Bon', 'jour'));
    const { service } = makeService({ memberRole: 'alternant', chatStream });
    const res = makeResponse();

    await service.stream(makeUser(), QUESTION, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8');
    expect(res.flushHeaders).toHaveBeenCalled();
    expect(vi.mocked(res.write).mock.calls.map((c) => c[0])).toEqual(['Bon', 'jour']);
    expect(res.end).toHaveBeenCalled();
  });

  it('grounds the system prompt in the manual, the name and the member role', async () => {
    const { service, chatStream } = makeService({ memberRole: 'tuteur_entreprise' });

    await service.stream(makeUser(), QUESTION, makeResponse());

    const [system, messages] = chatStream.mock.calls[0] as [string, ChatMessage[]];
    expect(system).toContain('Léa Martin');
    expect(system).toContain('tuteur d’entreprise');
    expect(system).toContain('MANUEL UTILISATEUR');
    expect(messages).toEqual(QUESTION);
  });

  it('labels platform roles without querying memberships', async () => {
    const { service, chatStream, mock } = makeService();

    await service.stream(makeUser({ role: 'super_admin' }), QUESTION, makeResponse());

    expect(chatStream.mock.calls[0][0]).toContain('super administrateur');
    expect(mock.db.select).not.toHaveBeenCalled();
  });

  it('falls back to a generic label when the user has no membership', async () => {
    const { service, chatStream } = makeService();

    await service.stream(makeUser(), QUESTION, makeResponse());

    expect(chatStream.mock.calls[0][0]).toContain('est utilisateur');
  });

  it('rejects the 31st message of the hour with a 429', async () => {
    const { service, mock } = makeService();
    for (let i = 0; i < 30; i++) {
      mock.enqueue([{ role: 'alternant' }]);
      await service.stream(makeUser(), QUESTION, makeResponse());
    }

    await expect(service.stream(makeUser(), QUESTION, makeResponse())).rejects.toSatisfy(
      (err: unknown) => err instanceof HttpException && err.getStatus() === 429,
    );
  });

  it('translates an OpenAI failure into a 503 before any header is sent', async () => {
    const chatStream = vi.fn().mockRejectedValue(new Error('401 invalid key'));
    const { service } = makeService({ memberRole: 'alternant', chatStream });
    const res = makeResponse();

    await expect(service.stream(makeUser(), QUESTION, res)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(res.flushHeaders).not.toHaveBeenCalled();
  });

  it('closes the response gracefully when the stream breaks mid-flight', async () => {
    async function* broken() {
      yield { choices: [{ delta: { content: 'Début' } }] };
      throw new Error('connexion coupée');
    }
    const chatStream = vi.fn().mockResolvedValue(broken());
    const { service } = makeService({ memberRole: 'alternant', chatStream });
    const res = makeResponse();

    await service.stream(makeUser(), QUESTION, res);

    const written = vi.mocked(res.write).mock.calls.map((c) => String(c[0]));
    expect(written[0]).toBe('Début');
    expect(written.at(-1)).toContain('interrompue');
    expect(res.end).toHaveBeenCalled();
  });
});
