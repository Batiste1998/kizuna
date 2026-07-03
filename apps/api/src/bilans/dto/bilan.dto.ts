import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { BILAN_STATUSES, type BilanStatus } from '@kizuna/db';

export class CreateBilanDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @IsDateString()
  scheduledAt!: string;
}

export class UpdateBilanDto {
  @IsOptional()
  @IsIn(BILAN_STATUSES as readonly string[] as string[])
  status?: BilanStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summary?: string;

  /** URL de visio (https) — `null` pour retirer le lien. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(500)
  visioUrl?: string | null;
}
