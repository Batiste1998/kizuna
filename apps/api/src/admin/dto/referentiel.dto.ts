import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** Raw RNCP text pasted by the admin, to be structured by the AI. */
export class ExtractReferentielDto {
  @IsString()
  @MinLength(50, { message: 'Le texte collé est trop court pour être analysé.' })
  @MaxLength(200_000)
  text!: string;
}

export class ReferentielCompetenceDto {
  @ValidateIf((o: ReferentielCompetenceDto) => o.code !== null)
  @IsString()
  @MaxLength(40)
  code!: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  label!: string;

  @ValidateIf((o: ReferentielCompetenceDto) => o.description !== null)
  @IsString()
  @MaxLength(4000)
  description!: string | null;
}

export class ReferentielBlocDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  label!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReferentielCompetenceDto)
  competences!: ReferentielCompetenceDto[];
}

/** The reviewed draft the admin saves — becomes referentiel + blocs + compétences. */
export class SaveReferentielDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @ValidateIf((o: SaveReferentielDto) => o.level !== null)
  @IsInt()
  @Min(1)
  @Max(8)
  level!: number | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReferentielBlocDto)
  blocs!: ReferentielBlocDto[];
}
