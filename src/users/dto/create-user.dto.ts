import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
import { RolesEnum } from '../const/roles.const';

export class CreateUserDto {
  @ApiProperty({ example: 'bumang', description: '닉네임' })
  @IsString()
  @IsNotEmpty()
  nickname: string;

  @ApiProperty({ example: 'user@example.com', description: '이메일' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123', description: '비밀번호 (최소 6자)' })
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    enum: RolesEnum,
    example: RolesEnum.GUEST,
    description: '사용자 권한',
  })
  @IsEnum(RolesEnum)
  @IsNotEmpty()
  role: RolesEnum;
}
