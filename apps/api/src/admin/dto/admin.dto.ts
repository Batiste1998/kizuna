import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CREATABLE_MEMBER_ROLES, type CreatableMemberRole } from '@kizuna/shared';

export class CreateEntrepriseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  city?: string;
}

export class CreatePromotionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  rncpLevel?: number;

  @IsOptional()
  @IsString()
  periodStart?: string;

  @IsOptional()
  @IsString()
  periodEnd?: string;
}

export class UpdateEntrepriseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sector?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  city?: string;
}

/** Only tutors are editable from the Membres page (admins & alternants have their own flows). */
export const EDITABLE_MEMBER_ROLES = ['tuteur_pedagogique', 'tuteur_entreprise'] as const;
export type EditableMemberRole = (typeof EDITABLE_MEMBER_ROLES)[number];

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsIn(EDITABLE_MEMBER_ROLES)
  role?: EditableMemberRole;
}

export class CreateMemberDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsEmail()
  email!: string;

  @IsIn(CREATABLE_MEMBER_ROLES)
  role!: CreatableMemberRole;

  /** Only used when role === 'alternant' (optional cohort assignment). */
  @IsOptional()
  @IsString()
  promotionId?: string;
}

export class UpsertAssociationDto {
  @IsOptional()
  @IsString()
  tuteurPedaUserId?: string;

  @IsOptional()
  @IsString()
  tuteurEntrepriseUserId?: string;

  @IsOptional()
  @IsString()
  entrepriseId?: string;
}
