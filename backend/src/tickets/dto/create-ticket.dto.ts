import { IsString, IsOptional, IsArray, ValidateNested, IsObject, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class OperationItemDto {
  @IsString()
  @MaxLength(500)
  stepContent: string;
}

export class CreateTicketDto {
  @IsString()
  @MaxLength(200)
  taskName: string;

  @IsString()
  supervisorId: string;

  @IsOptional()
  @IsString()
  approverId?: string;

  @IsOptional()
  @IsString()
  dispatcherId?: string;

  @IsOptional()
  @IsObject()
  basicInfo?: object;

  @IsOptional()
  @IsString()
  workTicketNo?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationItemDto)
  items?: OperationItemDto[];
}
