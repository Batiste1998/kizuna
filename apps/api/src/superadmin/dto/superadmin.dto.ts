import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsEmail()
  email!: string;

  @IsIn(['admin', 'tuteur_pedagogique', 'tuteur_entreprise', 'support', 'super_admin'])
  role!: 'admin' | 'tuteur_pedagogique' | 'tuteur_entreprise' | 'support' | 'super_admin';

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  organizationIds?: string[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  banned?: boolean;

  @IsOptional()
  @IsIn(['user', 'support', 'super_admin'])
  role?: 'user' | 'support' | 'super_admin';
}
