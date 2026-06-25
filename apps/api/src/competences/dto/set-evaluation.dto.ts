import { IsIn } from 'class-validator';
import { COMPETENCE_LEVELS, type CompetenceLevel } from '@kizuna/db';

export class SetEvaluationDto {
  @IsIn(COMPETENCE_LEVELS as readonly string[] as string[])
  level!: CompetenceLevel;
}
