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

export const api = {
  myAlternantProfile: () => request<{ alternantProfilId: string }>('/me/alternant'),
  getCompetences: (alternantProfilId: string) =>
    request<AlternantCompetences>(`/alternants/${alternantProfilId}/competences`),
  setEvaluation: (alternantProfilId: string, competenceId: string, level: CompetenceLevel) =>
    request<{ competenceId: string; evaluator: EvaluatorRole; level: CompetenceLevel }>(
      `/alternants/${alternantProfilId}/competences/${competenceId}/evaluation`,
      { method: 'PUT', body: JSON.stringify({ level }) },
    ),
};
