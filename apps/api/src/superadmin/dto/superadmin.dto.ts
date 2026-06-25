import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

export class UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  banned?: boolean;

  @IsOptional()
  @IsIn(['user', 'support', 'super_admin'])
  role?: 'user' | 'support' | 'super_admin';
}
