import type { BilanStatus, CompetenceLevel, EvaluatorRole, JournalStatus } from './api';

/** Competence levels with their Kizuna badge colors (from the mockups). */
export const LEVELS: Array<{
  key: CompetenceLevel;
  label: string;
  short: string;
  className: string;
}> = [
  { key: 'NA', label: 'Non acquis', short: 'NA', className: 'bg-[#EDEDE9] text-[#76766F]' },
  { key: 'EC', label: 'En cours', short: 'EC', className: 'bg-[#F7EFDA] text-[#9A6B12]' },
  { key: 'A', label: 'Acquis', short: 'A', className: 'bg-[#E4F2EC] text-[#2C7A63]' },
  { key: 'M', label: 'Maîtrisé', short: 'M', className: 'bg-[#D4EAE0] text-[#1F7A63]' },
];

export const LEVEL_BY_KEY = Object.fromEntries(LEVELS.map((l) => [l.key, l])) as Record<
  CompetenceLevel,
  (typeof LEVELS)[number]
>;

export const JOURNAL_STATUS_META: Record<JournalStatus, { label: string; className: string }> = {
  pending: { label: 'En attente de validation', className: 'bg-[#F7EFDA] text-[#9A6B12]' },
  validated: { label: 'Validé', className: 'bg-[#E4F2EC] text-[#2C7A63]' },
  changes_requested: { label: 'Modifications demandées', className: 'bg-[#FBEBE3] text-[#B54F2C]' },
};

export const BILAN_STATUS_META: Record<BilanStatus, { label: string; className: string }> = {
  planned: { label: 'Planifié', className: 'bg-[#E8EEF7] text-[#3D5E8E]' },
  done: { label: 'Réalisé', className: 'bg-[#F7EFDA] text-[#9A6B12]' },
  signed: { label: 'Signé', className: 'bg-[#E4F2EC] text-[#2C7A63]' },
};

export const AUTHOR_RELATION_META: Record<
  'alternant' | 'peda' | 'entreprise' | 'other',
  { label: string; className: string }
> = {
  alternant: { label: 'Alternant', className: 'bg-[#E8F4EF] text-[#1F7A63]' },
  peda: { label: 'Tuteur péda.', className: 'bg-[#EAF0F8] text-[#2E5288]' },
  entreprise: { label: 'Tuteur entr.', className: 'bg-[#FBEBE3] text-[#B54F2C]' },
  other: { label: 'Autre', className: 'bg-[#EDEDE9] text-[#76766F]' },
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
  open: { label: 'Ouvert', className: 'bg-[#F7EFDA] text-[#9A6B12]' },
  in_progress: { label: 'En cours', className: 'bg-[#E8EEF7] text-[#3D5E8E]' },
  resolved: { label: 'Résolu', className: 'bg-[#E4F2EC] text-[#2C7A63]' },
};

export const TICKET_PRIORITY_META: Record<
  'basse' | 'moyenne' | 'haute',
  { label: string; className: string }
> = {
  basse: { label: 'Basse', className: 'bg-[#EDEDE9] text-[#76766F]' },
  moyenne: { label: 'Moyenne', className: 'bg-[#E8EEF7] text-[#3D5E8E]' },
  haute: { label: 'Haute', className: 'bg-[#FBEBE3] text-[#B54F2C]' },
};

export const TICKET_TYPE_LABELS: Record<'bug' | 'demande', string> = {
  bug: 'Bug',
  demande: 'Demande',
};

export const EVALUATOR_LABELS: Record<EvaluatorRole, string> = {
  auto: 'Auto',
  peda: 'Tuteur péda.',
  entreprise: 'Tuteur entr.',
};
