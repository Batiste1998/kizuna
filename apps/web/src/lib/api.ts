const apiURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// Domain enums & contracts shared with the API (single source of truth).
export type {
  CompetenceLevel,
  EvaluatorRole,
  JournalStatus,
  BilanStatus,
  MemberRole,
  MeResponse,
  MeResponse as Me,
} from '@kizuna/shared';
import type {
  CompetenceLevel,
  EvaluatorRole,
  JournalStatus,
  BilanStatus,
  MeResponse as Me,
} from '@kizuna/shared';

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

export interface Bilan {
  id: string;
  label: string;
  scheduledAt: string;
  status: BilanStatus;
  summary: string | null;
  visioUrl: string | null;
}

export interface BilansView {
  alternantProfilId: string;
  canManage: boolean;
  bilans: Bilan[];
}

export interface PlatformOverview {
  counts: {
    organizations: number;
    users: number;
    alternants: number;
    openTickets: number;
    admins: number;
    pending: number;
  };
}

export interface SuperOrganization {
  id: string;
  name: string;
  type: string | null;
  city: string | null;
  createdAt: string;
  memberCount: number;
  adminCount: number;
  alternantCount: number;
}

export interface EstablishmentType {
  id: string;
  label: string;
  createdAt: string;
}

export interface SuperUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  banned: boolean;
  createdAt: string;
  orgCount: number;
  memberRoles: string[];
  organizations: string[];
}

/** Roles assignable to a new platform user by the super admin. */
export type CreatableSuperRole =
  | 'admin'
  | 'tuteur_pedagogique'
  | 'tuteur_entreprise'
  | 'support'
  | 'super_admin';

export interface AdminOverview {
  organizationName: string;
  counts: { alternants: number; members: number; entreprises: number; promotions: number };
}

export interface AdminDashboard {
  organizationName: string;
  counts: {
    alternants: number;
    associationsComplete: number;
    associationsPartial: number;
    lateBilans: number;
  };
  suiviATraiter: Array<{
    alternantProfilId: string;
    name: string | null;
    reason: string;
    status: 'late' | 'incomplete';
  }>;
  promotions: Array<{ id: string; name: string; alternantCount: number; progressPct: number }>;
}

export type AlternantSuivi = 'a_jour' | 'en_retard' | 'a_completer';

export interface AdminAlternant {
  alternantProfilId: string;
  name: string | null;
  email: string | null;
  promotionName: string | null;
  entrepriseName: string | null;
  tuteurPedaName: string | null;
  tuteurEntrepriseName: string | null;
  suivi: AlternantSuivi;
  progressPct: number;
}

export interface AdminMember {
  id: string;
  userId: string;
  role: string;
  name: string | null;
  email: string | null;
}

export interface CreatedMember {
  userId: string;
  role: string;
  alternantProfilId: string | null;
  /** Dev fallback: set only when the account was just created and no SMTP is configured. */
  temporaryPassword: string | null;
  /** True when the invitation email (password setup link) was actually sent. */
  invitationSent: boolean;
}

export interface Association {
  id: string;
  alternantProfilId: string;
  tuteurPedaUserId: string | null;
  tuteurEntrepriseUserId: string | null;
  entrepriseId: string | null;
}

export interface AdminEntreprise {
  id: string;
  name: string;
  sector: string | null;
  city: string | null;
}

export interface AdminPromotion {
  id: string;
  name: string;
  rncpLevel: number | null;
  periodStart: string | null;
  periodEnd: string | null;
}

/** Draft referentiel returned by the AI extraction, before admin review. */
export interface ReferentielDraft {
  code: string;
  title: string;
  level: number | null;
  blocs: Array<{
    code: string;
    label: string;
    competences: Array<{ code: string | null; label: string; description: string | null }>;
  }>;
}

export interface ReferentielView {
  promotionId: string;
  referentiel: {
    id: string;
    code: string;
    title: string;
    level: number | null;
    blocs: Array<{
      id: string;
      code: string;
      label: string;
      competences: Array<{
        id: string;
        code: string | null;
        label: string;
        description: string | null;
      }>;
    }>;
  } | null;
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
  tuteurPedaName: string | null;
  tuteurEntrepriseName: string | null;
  myRole: 'peda' | 'entreprise';
  progress: { evaluated: number; total: number };
}

export interface TutorDashboard {
  alternants: Array<TutorAlternant & { toEvaluate: number }>;
  upcomingBilans: number;
}

export interface AlternantDashboard {
  titleName: string;
  progressionPct: number;
  blocs: { validated: number; total: number };
  competences: { acquired: number; total: number };
  toSelfEvaluate: number;
  trinome: { peda: string | null; entrepriseTutor: string | null; entreprise: string | null };
  nextBilan: { label: string; scheduledAt: string } | null;
}

export const api = {
  me: () => request<Me>('/me'),
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
  tutorDashboard: () => request<TutorDashboard>('/me/tutor-dashboard'),
  alternantDashboard: () => request<AlternantDashboard | null>('/me/alternant-dashboard'),
  getBilans: (alternantProfilId: string) =>
    request<BilansView>(`/alternants/${alternantProfilId}/bilans`),
  createBilan: (alternantProfilId: string, input: { label: string; scheduledAt: string }) =>
    request<Bilan>(`/alternants/${alternantProfilId}/bilans`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateBilan: (
    bilanId: string,
    input: {
      status?: BilanStatus;
      label?: string;
      scheduledAt?: string;
      summary?: string;
      visioUrl?: string | null;
    },
  ) => request<Bilan>(`/bilans/${bilanId}`, { method: 'PATCH', body: JSON.stringify(input) }),
  generateBilanVisio: (bilanId: string) =>
    request<Bilan>(`/bilans/${bilanId}/visio`, { method: 'POST' }),
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
  superOverview: () => request<PlatformOverview>('/superadmin/overview'),
  superOrganizations: () => request<SuperOrganization[]>('/superadmin/organizations'),
  createSuperOrganization: (input: { name: string; type?: string; city?: string }) =>
    request<SuperOrganization>('/superadmin/organizations', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateSuperOrganization: (id: string, input: { name?: string; type?: string; city?: string }) =>
    request<{ id: string }>(`/superadmin/organizations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteSuperOrganization: (id: string) =>
    request<{ id: string }>(`/superadmin/organizations/${id}`, { method: 'DELETE' }),
  superUsers: () => request<SuperUser[]>('/superadmin/users'),
  createSuperUser: (input: {
    name: string;
    email: string;
    role: CreatableSuperRole;
    organizationIds?: string[];
  }) =>
    request<{ userId: string; temporaryPassword: string }>('/superadmin/users', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateSuperUser: (id: string, input: { banned?: boolean; role?: string }) =>
    request<SuperUser>(`/superadmin/users/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteSuperUser: (id: string) =>
    request<{ id: string }>(`/superadmin/users/${id}`, { method: 'DELETE' }),
  superEstablishmentTypes: () =>
    request<EstablishmentType[]>('/superadmin/establishment-types'),
  createSuperEstablishmentType: (label: string) =>
    request<EstablishmentType>('/superadmin/establishment-types', {
      method: 'POST',
      body: JSON.stringify({ label }),
    }),
  deleteSuperEstablishmentType: (id: string) =>
    request<{ id: string }>(`/superadmin/establishment-types/${id}`, { method: 'DELETE' }),
  adminOverview: () => request<AdminOverview>('/admin/overview'),
  adminDashboard: () => request<AdminDashboard>('/admin/dashboard'),
  adminSchools: () =>
    request<{ activeId: string | null; schools: Array<{ id: string; name: string; city: string | null }> }>(
      '/admin/schools',
    ),
  adminAlternants: () => request<AdminAlternant[]>('/admin/alternants'),
  adminMembers: () => request<AdminMember[]>('/admin/members'),
  updateAdminMember: (
    memberId: string,
    input: { name?: string; role?: 'tuteur_pedagogique' | 'tuteur_entreprise' },
  ) =>
    request<AdminMember>(`/admin/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteAdminMember: (memberId: string) =>
    request<{ id: string }>(`/admin/members/${memberId}`, { method: 'DELETE' }),
  createAdminMember: (input: {
    name: string;
    email: string;
    role: 'admin' | 'tuteur_pedagogique' | 'tuteur_entreprise' | 'alternant';
    promotionId?: string;
  }) => request<CreatedMember>('/admin/members', { method: 'POST', body: JSON.stringify(input) }),
  upsertAdminAssociation: (
    alternantProfilId: string,
    input: { tuteurPedaUserId?: string; tuteurEntrepriseUserId?: string; entrepriseId?: string },
  ) =>
    request<Association>(`/admin/alternants/${alternantProfilId}/association`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  adminEntreprises: () => request<AdminEntreprise[]>('/admin/entreprises'),
  createAdminEntreprise: (input: { name: string; sector?: string; city?: string }) =>
    request<AdminEntreprise>('/admin/entreprises', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateAdminEntreprise: (id: string, input: { name?: string; sector?: string; city?: string }) =>
    request<AdminEntreprise>(`/admin/entreprises/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteAdminEntreprise: (id: string) =>
    request<{ id: string }>(`/admin/entreprises/${id}`, { method: 'DELETE' }),
  adminPromotions: () => request<AdminPromotion[]>('/admin/promotions'),
  createAdminPromotion: (input: {
    name: string;
    rncpLevel?: number;
    periodStart?: string;
    periodEnd?: string;
  }) =>
    request<AdminPromotion>('/admin/promotions', { method: 'POST', body: JSON.stringify(input) }),
  aiStatus: () => request<{ configured: boolean }>('/ai/status'),
  getPromotionReferentiel: (promotionId: string) =>
    request<ReferentielView>(`/admin/promotions/${promotionId}/referentiel`),
  extractReferentiel: (text: string) =>
    request<ReferentielDraft>('/admin/referentiels/extract', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  savePromotionReferentiel: (promotionId: string, draft: ReferentielDraft) =>
    request<ReferentielView>(`/admin/promotions/${promotionId}/referentiel`, {
      method: 'POST',
      body: JSON.stringify(draft),
    }),
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
  downloadBilanPdf: async (bilanId: string, fileName: string) => {
    const res = await fetch(`${apiURL}/bilans/${bilanId}/pdf`, { credentials: 'include' });
    if (!res.ok) throw new Error('Export PDF impossible');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },
};
