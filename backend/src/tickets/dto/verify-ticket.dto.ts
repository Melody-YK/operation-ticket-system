import { IsString, IsIn, IsOptional } from 'class-validator';

export class VerifyTicketDto {
  @IsString()
  @IsIn(['verify_pass', 'verify_fail'])
  action: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
