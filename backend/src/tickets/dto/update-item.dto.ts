import { IsString, IsIn } from 'class-validator';

export class UpdateItemDto {
  @IsString()
  @IsIn(['execute', 'skip'])
  action: string;
}
