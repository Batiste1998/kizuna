import type { CompetenceLevel, EvaluatorRole } from './api';

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

export const EVALUATOR_LABELS: Record<EvaluatorRole, string> = {
  auto: 'Auto',
  peda: 'Tuteur péda.',
  entreprise: 'Tuteur entr.',
};
