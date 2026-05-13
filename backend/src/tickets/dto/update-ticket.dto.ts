import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateTicketDto, OperationItemDto } from './create-ticket.dto';

export class UpdateTicketDto extends PartialType(OmitType(CreateTicketDto, [] as const)) {
  remarks?: string;
  items?: OperationItemDto[];
}
