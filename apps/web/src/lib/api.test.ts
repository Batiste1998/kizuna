import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

/** Minimal Response stand-in for the JSON-only `request` helper. */
function jsonResponse(data: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

/** Failed response whose body is not valid JSON (e.g. an HTML error page). */
function invalidBodyResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: () => Promise.reject(new Error('invalid json')),
  } as unknown as Response;
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function lastCall(): { url: string; init: RequestInit } {
  const call = fetchMock.mock.calls.at(-1);
  if (!call) throw new Error('fetch was not called');
  const [input, init] = call;
  return { url: String(input), init: init ?? {} };
}

describe('api request core', () => {
  it('sends credentials and a JSON content type on every call', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'u1' }));

    const me = await api.me();

    expect(me).toEqual({ id: 'u1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, init } = lastCall();
    expect(url).toMatch(/^https?:\/\/.+\/me$/);
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('builds the path from its params and serialises the body as JSON', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'e1' }));

    await api.createJournalEntry('ap-42', { title: 'Semaine 1', content: 'Découverte' });

    const { url, init } = lastCall();
    expect(url).toMatch(/\/alternants\/ap-42\/journal$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      title: 'Semaine 1',
      content: 'Découverte',
    });
  });

  it('propagates the error message returned by the API body', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Accès refusé' }, { ok: false, status: 403 }),
    );

    await expect(api.me()).rejects.toThrow('Accès refusé');
  });

  it('falls back to a generic status error when the body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(invalidBodyResponse(500));

    await expect(api.me()).rejects.toThrow('Erreur 500');
  });
});
