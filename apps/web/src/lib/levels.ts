import type { BilanStatus, CompetenceLevel, EvaluatorRole, JournalStatus } from './api';

/*
 * Every badge/chip colour in the app comes from the status scale defined in
 * styles.css (`--color-status-*`) — change the palette there, it changes here.
 */

/** Competence levels with their Kizuna badge colors (from the mockups). */
export const LEVELS: Array<{
  key: CompetenceLevel;
  label: string;
  short: string;
  className: string;
}> = [
  { key: 'NA', label: 'Non acquis', short: 'NA', className: 'bg-status-neutral text-status-neutral-fg' },
  { key: 'EC', label: 'En cours', short: 'EC', className: 'bg-status-amber text-status-amber-fg' },
  { key: 'A', label: 'Acquis', short: 'A', className: 'bg-status-green text-status-green-fg' },
  { key: 'M', label: 'Maîtrisé', short: 'M', className: 'bg-status-teal text-status-teal-fg' },
];

export const LEVEL_BY_KEY = Object.fromEntries(LEVELS.map((l) => [l.key, l])) as Record<
  CompetenceLevel,
  (typeof LEVELS)[number]
>;

export const JOURNAL_STATUS_META: Record<JournalStatus, { label: string; className: string }> = {
  pending: { label: 'En attente de validation', className: 'bg-status-amber text-status-amber-fg' },
  validated: { label: 'Validé', className: 'bg-status-green text-status-green-fg' },
  changes_requested: {
    label: 'Modifications demandées',
    className: 'bg-status-orange text-status-orange-fg',
  },
};

export const BILAN_STATUS_META: Record<BilanStatus, { label: string; className: string }> = {
  planned: { label: 'Planifié', className: 'bg-status-blue text-status-blue-fg' },
  done: { label: 'Réalisé', className: 'bg-status-amber text-status-amber-fg' },
  signed: { label: 'Signé', className: 'bg-status-green text-status-green-fg' },
};

export const AUTHOR_RELATION_META: Record<
  'alternant' | 'peda' | 'entreprise' | 'other',
  { label: string; className: string; role: string }
> = {
  alternant: {
    label: 'Alternant',
    className: 'bg-status-mint text-status-mint-fg',
    role: 'alternant',
  },
  peda: {
    label: 'Tuteur péda.',
    className: 'bg-status-blue text-status-blue-fg',
    role: 'tuteur_pedagogique',
  },
  entreprise: {
    label: 'Tuteur entr.',
    className: 'bg-status-orange text-status-orange-fg',
    role: 'tuteur_entreprise',
  },
  other: { label: 'Autre', className: 'bg-status-neutral text-status-neutral-fg', role: 'user' },
};

export const DOCUMENT_CATEGORY_LABELS: Record<
  'convention' | 'livret' | 'compte_rendu' | 'bulletin' | 'autre',
  string
> = {
  convention: 'Convention',
  livret: 'Livret',
  compte_rendu: 'Compte-rendu',
  bulletin: 'Bulletin',
  autre: 'Autre',
};

export const TICKET_STATUS_META: Record<
  'open' | 'in_progress' | 'resolved',
  { label: string; className: string }
> = {
  open: { label: 'Ouvert', className: 'bg-status-amber text-status-amber-fg' },
  in_progress: { label: 'En cours', className: 'bg-status-blue text-status-blue-fg' },
  resolved: { label: 'Résolu', className: 'bg-status-green text-status-green-fg' },
};

export const TICKET_PRIORITY_META: Record<
  'basse' | 'moyenne' | 'haute',
  { label: string; className: string }
> = {
  basse: { label: 'Basse', className: 'bg-status-neutral text-status-neutral-fg' },
  moyenne: { label: 'Moyenne', className: 'bg-status-blue text-status-blue-fg' },
  haute: { label: 'Haute', className: 'bg-status-orange text-status-orange-fg' },
};

export const TICKET_TYPE_LABELS: Record<'bug' | 'demande', string> = {
  bug: 'Bug',
  demande: 'Demande',
};

export const NOTIFICATION_TYPE_META: Record<
  'journal' | 'message' | 'bilan' | 'echeance' | 'ticket' | 'system',
  { label: string; dot: string }
> = {
  journal: { label: 'Journal', dot: 'bg-voice-auto' },
  message: { label: 'Message', dot: 'bg-voice-peda' },
  bilan: { label: 'Bilan', dot: 'bg-status-violet-fg' },
  echeance: { label: 'Échéance', dot: 'bg-voice-entreprise' },
  ticket: { label: 'Support', dot: 'bg-status-amber-fg' },
  system: { label: 'Système', dot: 'bg-status-neutral-fg' },
};

export const EVALUATOR_LABELS: Record<EvaluatorRole, string> = {
  auto: 'Auto',
  peda: 'Tuteur péda.',
  entreprise: 'Tuteur entr.',
};

/** Full display name of each voice (legend of the thread, radar traces). */
export const EVALUATOR_VOICE_LABELS: Record<EvaluatorRole, string> = {
  auto: 'Auto-évaluation',
  peda: 'Tuteur école',
  entreprise: 'Tuteur entreprise',
};

/**
 * Colour identity of each voice of the trinôme. The values live once, in the
 * `--voice-*` tokens of styles.css — build translucent glows/fills with
 * `color-mix(in srgb, <color> X%, transparent)`.
 */
export const EVALUATOR_VOICE_COLORS: Record<EvaluatorRole, { color: string }> = {
  auto: { color: 'var(--voice-auto)' },
  peda: { color: 'var(--voice-peda)' },
  entreprise: { color: 'var(--voice-entreprise)' },
};
