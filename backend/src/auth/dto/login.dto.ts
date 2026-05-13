import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  personnelId: string;

  @IsString()
  @MinLength(1)
  password: string;
}