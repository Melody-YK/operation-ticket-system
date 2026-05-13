import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum PersonnelRoleEnum {
  OPERATOR = 'OPERATOR',
  SUPERVISOR = 'SUPERVISOR',
  APPROVER = 'APPROVER',
  DISPATCHER = 'DISPATCHER',
}

export class CreatePersonnelDto {
  @IsString()
  name: string;

  @IsEnum(PersonnelRoleEnum)
  role: PersonnelRoleEnum;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  team?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  qualification?: string;
}
