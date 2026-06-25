const apiURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export type CompetenceLevel = 'NA' | 'EC' | 'A' | 'M';
export type EvaluatorRole = 'auto' | 'peda' | 'entreprise';

export interface CompetenceView {
  id: string;
  code: string | null;
  label: string;
  evaluations: Partial<Record<EvaluatorRole, CompetenceLevel>>;
}

export interface BlocView {
  id: string;
  code: string;
  label: string;
  competences: CompetenceView[];
}

export interface AlternantCompetences {
  alternantProfilId: string;
  referentiel: { id: string; code: string; title: string } | null;
  editableAs: EvaluatorRole | null;
  blocs: BlocView[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiURL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Erreur ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export type JournalStatus = 'pending' | 'validated' | 'changes_requested';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  status: JournalStatus;
  reviewComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
  authorName: string | null;
}

export interface JournalView {
  alternantProfilId: string;
  editableAs: EvaluatorRole | null;
  entries: JournalEntry[];
}

export type BilanStatus = 'planned' | 'done' | 'signed';

export interface Bilan {
  id: string;
  label: string;
  scheduledAt: string;
  status: BilanStatus;
  summary: string | null;
}

export interface BilansView {
  alternantProfilId: string;
  canManage: boolean;
  bilans: Bilan[];
}

export type NotificationType = 'journal' | 'message' | 'bilan' | 'echeance' | 'ticket' | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  detail: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsList {
  unreadCount: number;
  notifications: NotificationItem[];
}

export type TicketType = 'bug' | 'demande';
export type TicketPriority = 'basse' | 'moyenne' | 'haute';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface TicketSummary {
  id: string;
  ref: string;
  subject: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  requesterName: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
  authorIsSupport: boolean;
}

export interface TicketDetail {
  canTriage: boolean;
  ticket: TicketSummary;
  messages: TicketMessage[];
}

export type DocumentCategory = 'convention' | 'livret' | 'compte_rendu' | 'bulletin' | 'autre';

export interface DocumentItem {
  id: string;
  category: DocumentCategory;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: string | null;
  createdAt: string;
}

export interface DocumentsView {
  alternantProfilId: string;
  canUpload: boolean;
  documents: DocumentItem[];
}

export type AuthorRelation = 'alternant' | 'peda' | 'entreprise' | 'other';

export interface Message {
  id: string;
  body: string;
  createdAt: string;
  authorUserId: string;
  authorName: string | null;
  authorRelation: AuthorRelation;
}

export interface MessagerieView {
  alternantProfilId: string;
  canPost: boolean;
  messages: Message[];
}

export interface Echeance {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
}

export interface EcheancierView {
  alternantProfilId: string;
  promotionId: string | null;
  canManage: boolean;
  echeances: Echeance[];
}

export interface TutorAlternant {
  alternantProfilId: string;
  name: string;
  email: string;
  promotionName: string | null;
  entrepriseName: string | null;
  myRole: 'peda' | 'entreprise';
  progress: { evaluated: number; total: number };
}

export const api = {
  myAlternantProfile: () => request<{ alternantProfilId: string }>('/me/alternant'),
  getCompetences: (alternantProfilId: string) =>
    request<AlternantCompetences>(`/alternants/${alternantProfilId}/competences`),
  setEvaluation: (alternantProfilId: string, competenceId: string, level: CompetenceLevel) =>
    request<{ competenceId: string; evaluator: EvaluatorRole; level: CompetenceLevel }>(
      `/alternants/${alternantProfilId}/competences/${competenceId}/evaluation`,
      { method: 'PUT', body: JSON.stringify({ level }) },
    ),
  getJournal: (alternantProfilId: string) =>
    request<JournalView>(`/alternants/${alternantProfilId}/journal`),
  createJournalEntry: (alternantProfilId: string, input: { title: string; content: string }) =>
    request<JournalEntry>(`/alternants/${alternantProfilId}/journal`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  reviewJournalEntry: (
    entryId: string,
    input: { status: 'validated' | 'changes_requested'; comment?: string },
  ) =>
    request<{ id: string; status: JournalStatus }>(`/journal/${entryId}/review`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  getMyAlternants: () => request<TutorAlternant[]>('/me/alternants'),
  getBilans: (alternantProfilId: string) =>
    request<BilansView>(`/alternants/${alternantProfilId}/bilans`),
  createBilan: (alternantProfilId: string, input: { label: string; scheduledAt: string }) =>
    request<Bilan>(`/alternants/${alternantProfilId}/bilans`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateBilan: (
    bilanId: string,
    input: { status?: BilanStatus; label?: string; scheduledAt?: string; summary?: string },
  ) => request<Bilan>(`/bilans/${bilanId}`, { method: 'PATCH', body: JSON.stringify(input) }),
  getEcheances: (alternantProfilId: string) =>
    request<EcheancierView>(`/alternants/${alternantProfilId}/echeances`),
  createEcheance: (
    alternantProfilId: string,
    input: { title: string; dueDate: string; description?: string },
  ) =>
    request<Echeance>(`/alternants/${alternantProfilId}/echeances`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getMessages: (alternantProfilId: string) =>
    request<MessagerieView>(`/alternants/${alternantProfilId}/messages`),
  sendMessage: (alternantProfilId: string, body: string) =>
    request<Message>(`/alternants/${alternantProfilId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  getDocuments: (alternantProfilId: string) =>
    request<DocumentsView>(`/alternants/${alternantProfilId}/documents`),
  uploadDocument: async (alternantProfilId: string, file: File, category: string) => {
    const form = new FormData();
    form.append('category', category);
    form.append('file', file);
    const res = await fetch(`${apiURL}/alternants/${alternantProfilId}/documents`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message ?? `Erreur ${res.status}`);
    }
    return res.json() as Promise<DocumentItem>;
  },
  deleteDocument: (documentId: string) =>
    request<{ id: string }>(`/documents/${documentId}`, { method: 'DELETE' }),
  getNotifications: () => request<NotificationsList>('/notifications'),
  markNotificationRead: (id: string) =>
    request<{ ok: true }>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () =>
    request<{ ok: true }>('/notifications/read-all', { method: 'POST' }),
  getTickets: () => request<{ canTriage: boolean; tickets: TicketSummary[] }>('/tickets'),
  createTicket: (input: {
    subject: string;
    type: TicketType;
    priority?: TicketPriority;
    description: string;
  }) => request<TicketSummary>('/tickets', { method: 'POST', body: JSON.stringify(input) }),
  getTicket: (ticketId: string) => request<TicketDetail>(`/tickets/${ticketId}`),
  replyTicket: (ticketId: string, body: string) =>
    request<TicketMessage>(`/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  updateTicket: (ticketId: string, input: { status?: TicketStatus; assignToMe?: boolean }) =>
    request<TicketSummary>(`/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  downloadDocument: async (documentId: string, fileName: string) => {
    const res = await fetch(`${apiURL}/documents/${documentId}/download`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Téléchargement impossible');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },
};
