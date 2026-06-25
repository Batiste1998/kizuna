import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEcheanceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
