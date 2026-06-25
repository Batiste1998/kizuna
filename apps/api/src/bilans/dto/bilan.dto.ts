import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
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
}
