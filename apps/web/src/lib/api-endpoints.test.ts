import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

/**
 * Contract tests: every endpoint wrapper must hit the right path with the
 * right method and JSON body. Guards against route typos drifting from the
 * NestJS controllers.
 */

function jsonResponse(data: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: () => Promise.resolve(data),
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

interface EndpointCase {
  name: string;
  call: () => Promise<unknown>;
  path: string;
  method?: string;
  body?: unknown;
}

/** Reviewed AI draft as saved by the admin (see ReferentielDraft). */
const REFERENTIEL_DRAFT = {
  code: 'RNCP39583',
  title: 'Expert en ingénierie du logiciel',
  level: 7,
  blocs: [
    {
      code: 'BC01',
      label: 'Concevoir et modéliser',
      competences: [{ code: 'C1', label: 'Analyser les besoins', description: null }],
    },
  ],
};

const CASES: EndpointCase[] = [
  { name: 'myAlternantProfile', call: () => api.myAlternantProfile(), path: '/me/alternant' },
  {
    name: 'getCompetences',
    call: () => api.getCompetences('ap-1'),
    path: '/alternants/ap-1/competences',
  },
  {
    name: 'setEvaluation',
    call: () => api.setEvaluation('ap-1', 'c-1', 'A'),
    path: '/alternants/ap-1/competences/c-1/evaluation',
    method: 'PUT',
    body: { level: 'A' },
  },
  { name: 'getJournal', call: () => api.getJournal('ap-1'), path: '/alternants/ap-1/journal' },
  {
    name: 'reviewJournalEntry',
    call: () => api.reviewJournalEntry('e-1', { status: 'validated' }),
    path: '/journal/e-1/review',
    method: 'PUT',
    body: { status: 'validated' },
  },
  { name: 'getMyAlternants', call: () => api.getMyAlternants(), path: '/me/alternants' },
  { name: 'tutorDashboard', call: () => api.tutorDashboard(), path: '/me/tutor-dashboard' },
  {
    name: 'alternantDashboard',
    call: () => api.alternantDashboard(),
    path: '/me/alternant-dashboard',
  },
  { name: 'getBilans', call: () => api.getBilans('ap-1'), path: '/alternants/ap-1/bilans' },
  {
    name: 'createBilan',
    call: () => api.createBilan('ap-1', { label: 'S1', scheduledAt: '2026-01-01' }),
    path: '/alternants/ap-1/bilans',
    method: 'POST',
    body: { label: 'S1', scheduledAt: '2026-01-01' },
  },
  {
    name: 'updateBilan',
    call: () => api.updateBilan('b-1', { status: 'done' }),
    path: '/bilans/b-1',
    method: 'PATCH',
    body: { status: 'done' },
  },
  {
    name: 'getEcheances',
    call: () => api.getEcheances('ap-1'),
    path: '/alternants/ap-1/echeances',
  },
  {
    name: 'createEcheance',
    call: () => api.createEcheance('ap-1', { title: 'Rapport', dueDate: '2026-02-01' }),
    path: '/alternants/ap-1/echeances',
    method: 'POST',
    body: { title: 'Rapport', dueDate: '2026-02-01' },
  },
  { name: 'getMessages', call: () => api.getMessages('ap-1'), path: '/alternants/ap-1/messages' },
  {
    name: 'sendMessage',
    call: () => api.sendMessage('ap-1', 'Bonjour'),
    path: '/alternants/ap-1/messages',
    method: 'POST',
    body: { body: 'Bonjour' },
  },
  {
    name: 'getDocuments',
    call: () => api.getDocuments('ap-1'),
    path: '/alternants/ap-1/documents',
  },
  {
    name: 'deleteDocument',
    call: () => api.deleteDocument('d-1'),
    path: '/documents/d-1',
    method: 'DELETE',
  },
  { name: 'superOverview', call: () => api.superOverview(), path: '/superadmin/overview' },
  {
    name: 'superOrganizations',
    call: () => api.superOrganizations(),
    path: '/superadmin/organizations',
  },
  {
    name: 'createSuperOrganization',
    call: () => api.createSuperOrganization({ name: 'École' }),
    path: '/superadmin/organizations',
    method: 'POST',
    body: { name: 'École' },
  },
  {
    name: 'updateSuperOrganization',
    call: () => api.updateSuperOrganization('o-1', { city: 'Lyon' }),
    path: '/superadmin/organizations/o-1',
    method: 'PATCH',
    body: { city: 'Lyon' },
  },
  {
    name: 'deleteSuperOrganization',
    call: () => api.deleteSuperOrganization('o-1'),
    path: '/superadmin/organizations/o-1',
    method: 'DELETE',
  },
  { name: 'superUsers', call: () => api.superUsers(), path: '/superadmin/users' },
  {
    name: 'createSuperUser',
    call: () => api.createSuperUser({ name: 'A', email: 'a@b.fr', role: 'support' }),
    path: '/superadmin/users',
    method: 'POST',
    body: { name: 'A', email: 'a@b.fr', role: 'support' },
  },
  {
    name: 'updateSuperUser',
    call: () => api.updateSuperUser('u-1', { banned: true }),
    path: '/superadmin/users/u-1',
    method: 'PATCH',
    body: { banned: true },
  },
  {
    name: 'deleteSuperUser',
    call: () => api.deleteSuperUser('u-1'),
    path: '/superadmin/users/u-1',
    method: 'DELETE',
  },
  {
    name: 'superEstablishmentTypes',
    call: () => api.superEstablishmentTypes(),
    path: '/superadmin/establishment-types',
  },
  {
    name: 'createSuperEstablishmentType',
    call: () => api.createSuperEstablishmentType('CFA'),
    path: '/superadmin/establishment-types',
    method: 'POST',
    body: { label: 'CFA' },
  },
  {
    name: 'deleteSuperEstablishmentType',
    call: () => api.deleteSuperEstablishmentType('t-1'),
    path: '/superadmin/establishment-types/t-1',
    method: 'DELETE',
  },
  { name: 'adminOverview', call: () => api.adminOverview(), path: '/admin/overview' },
  { name: 'adminDashboard', call: () => api.adminDashboard(), path: '/admin/dashboard' },
  { name: 'adminSchools', call: () => api.adminSchools(), path: '/admin/schools' },
  { name: 'adminAlternants', call: () => api.adminAlternants(), path: '/admin/alternants' },
  { name: 'adminMembers', call: () => api.adminMembers(), path: '/admin/members' },
  {
    name: 'updateAdminMember',
    call: () => api.updateAdminMember('m-1', { name: 'B' }),
    path: '/admin/members/m-1',
    method: 'PATCH',
    body: { name: 'B' },
  },
  {
    name: 'deleteAdminMember',
    call: () => api.deleteAdminMember('m-1'),
    path: '/admin/members/m-1',
    method: 'DELETE',
  },
  {
    name: 'createAdminMember',
    call: () => api.createAdminMember({ name: 'C', email: 'c@d.fr', role: 'alternant' }),
    path: '/admin/members',
    method: 'POST',
    body: { name: 'C', email: 'c@d.fr', role: 'alternant' },
  },
  {
    name: 'upsertAdminAssociation',
    call: () => api.upsertAdminAssociation('ap-1', { entrepriseId: 'e-1' }),
    path: '/admin/alternants/ap-1/association',
    method: 'PUT',
    body: { entrepriseId: 'e-1' },
  },
  { name: 'adminEntreprises', call: () => api.adminEntreprises(), path: '/admin/entreprises' },
  {
    name: 'createAdminEntreprise',
    call: () => api.createAdminEntreprise({ name: 'ACME' }),
    path: '/admin/entreprises',
    method: 'POST',
    body: { name: 'ACME' },
  },
  {
    name: 'updateAdminEntreprise',
    call: () => api.updateAdminEntreprise('e-1', { sector: 'IT' }),
    path: '/admin/entreprises/e-1',
    method: 'PATCH',
    body: { sector: 'IT' },
  },
  {
    name: 'deleteAdminEntreprise',
    call: () => api.deleteAdminEntreprise('e-1'),
    path: '/admin/entreprises/e-1',
    method: 'DELETE',
  },
  { name: 'adminPromotions', call: () => api.adminPromotions(), path: '/admin/promotions' },
  {
    name: 'createAdminPromotion',
    call: () => api.createAdminPromotion({ name: 'M2 2026' }),
    path: '/admin/promotions',
    method: 'POST',
    body: { name: 'M2 2026' },
  },
  { name: 'getNotifications', call: () => api.getNotifications(), path: '/notifications' },
  {
    name: 'markNotificationRead',
    call: () => api.markNotificationRead('n-1'),
    path: '/notifications/n-1/read',
    method: 'POST',
  },
  {
    name: 'markAllNotificationsRead',
    call: () => api.markAllNotificationsRead(),
    path: '/notifications/read-all',
    method: 'POST',
  },
  { name: 'getTickets', call: () => api.getTickets(), path: '/tickets' },
  {
    name: 'createTicket',
    call: () => api.createTicket({ subject: 'Bug', type: 'bug', description: 'KO' }),
    path: '/tickets',
    method: 'POST',
    body: { subject: 'Bug', type: 'bug', description: 'KO' },
  },
  { name: 'getTicket', call: () => api.getTicket('t-1'), path: '/tickets/t-1' },
  {
    name: 'replyTicket',
    call: () => api.replyTicket('t-1', 'Réponse'),
    path: '/tickets/t-1/messages',
    method: 'POST',
    body: { body: 'Réponse' },
  },
  {
    name: 'updateTicket',
    call: () => api.updateTicket('t-1', { status: 'resolved' }),
    path: '/tickets/t-1',
    method: 'PATCH',
    body: { status: 'resolved' },
  },
  {
    name: 'generateBilanVisio',
    call: () => api.generateBilanVisio('b-1'),
    path: '/bilans/b-1/visio',
    method: 'POST',
  },
  {
    name: 'draftBilanSummary',
    call: () => api.draftBilanSummary('b-1'),
    path: '/bilans/b-1/draft-summary',
    method: 'POST',
  },
  { name: 'aiStatus', call: () => api.aiStatus(), path: '/ai/status' },
  {
    name: 'getPromotionReferentiel',
    call: () => api.getPromotionReferentiel('p-1'),
    path: '/admin/promotions/p-1/referentiel',
  },
  {
    name: 'extractReferentiel',
    call: () => api.extractReferentiel('Texte du référentiel RNCP'),
    path: '/admin/referentiels/extract',
    method: 'POST',
    body: { text: 'Texte du référentiel RNCP' },
  },
  {
    name: 'savePromotionReferentiel',
    call: () => api.savePromotionReferentiel('p-1', REFERENTIEL_DRAFT),
    path: '/admin/promotions/p-1/referentiel',
    method: 'POST',
    body: REFERENTIEL_DRAFT,
  },
];

describe('api endpoint contracts', () => {
  it.each(CASES)('$name targets $path', async ({ call, path, method, body }) => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    await call();

    const { url, init } = lastCall();
    expect(url.endsWith(path)).toBe(true);
    expect(init.method ?? 'GET').toBe(method ?? 'GET');
    if (body !== undefined) {
      expect(JSON.parse(init.body as string)).toEqual(body);
    } else {
      expect(init.body).toBeUndefined();
    }
  });
});

describe('multipart and binary endpoints', () => {
  it('uploadDocument posts a FormData with category and file', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'd-1' }));
    const file = new File(['contenu'], 'rapport.pdf', { type: 'application/pdf' });

    await api.uploadDocument('ap-1', file, 'rapport');

    const { url, init } = lastCall();
    expect(url.endsWith('/alternants/ap-1/documents')).toBe(true);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    const form = init.body as FormData;
    expect(form.get('category')).toBe('rapport');
    expect((form.get('file') as File).name).toBe('rapport.pdf');
  });

  it('uploadDocument surfaces the API error message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Fichier trop volumineux' }, { ok: false, status: 413 }),
    );
    const file = new File(['x'], 'gros.bin');

    await expect(api.uploadDocument('ap-1', file, 'autre')).rejects.toThrow(
      'Fichier trop volumineux',
    );
  });

  it('downloadDocument throws a French error when the response is not ok', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, { ok: false, status: 404 }));

    await expect(api.downloadDocument('d-1', 'x.pdf')).rejects.toThrow('Téléchargement impossible');
  });

  it('downloadBilanPdf throws a French error when the response is not ok', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, { ok: false, status: 500 }));

    await expect(api.downloadBilanPdf('b-1', 'bilan.pdf')).rejects.toThrow('Export PDF impossible');
  });
});

describe('streamAssistant', () => {
  function streamResponse(chunks: string[]): Response {
    const encoder = new TextEncoder();
    const pending = chunks.map((c) => encoder.encode(c));
    return {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: () =>
            Promise.resolve(
              pending.length
                ? { done: false, value: pending.shift() }
                : { done: true, value: undefined },
            ),
        }),
      },
    } as unknown as Response;
  }

  it('posts the conversation to /ai/chat and forwards each streamed chunk', async () => {
    fetchMock.mockResolvedValueOnce(streamResponse(['Bonjour', ' !']));
    const received: string[] = [];
    const messages = [{ role: 'user' as const, content: 'Comment créer un bilan ?' }];

    await api.streamAssistant(messages, (chunk) => received.push(chunk));

    const { url, init } = lastCall();
    expect(url.endsWith('/ai/chat')).toBe(true);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(init.body as string)).toEqual({ messages });
    expect(received.join('')).toBe('Bonjour !');
  });

  it('surfaces the API error message when the stream cannot start', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Limite de messages atteinte' }, { ok: false, status: 429 }),
    );

    await expect(api.streamAssistant([{ role: 'user', content: 'Q' }], () => {})).rejects.toThrow(
      'Limite de messages atteinte',
    );
  });
});
