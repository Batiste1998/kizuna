import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateJournalEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;
}

export class ReviewJournalEntryDto {
  @IsIn(['validated', 'changes_requested'])
  status!: 'validated' | 'changes_requested';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
