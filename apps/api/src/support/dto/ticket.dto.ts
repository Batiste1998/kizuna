import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TYPES,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
} from '@kizuna/db';

export class CreateTicketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @IsIn(TICKET_TYPES as readonly string[] as string[])
  type!: TicketType;

  @IsOptional()
  @IsIn(TICKET_PRIORITIES as readonly string[] as string[])
  priority?: TicketPriority;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description!: string;
}

export class ReplyTicketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}

export class UpdateTicketDto {
  @IsOptional()
  @IsIn(TICKET_STATUSES as readonly string[] as string[])
  status?: TicketStatus;

  @IsOptional()
  @IsBoolean()
  assignToMe?: boolean;
}
