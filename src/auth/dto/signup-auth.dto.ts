import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class SignupAuthDto {
  @ApiProperty({ example: 'bumang', description: '닉네임 (2~20자)' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  nickname: string;

  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호 (6~30자)' })
  @IsString()
  @MinLength(6)
  @MaxLength(30)
  password: string;
}
