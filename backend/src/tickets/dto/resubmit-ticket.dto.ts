import { IsOptional, IsString } from 'class-validator';

export class ResubmitTicketDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
