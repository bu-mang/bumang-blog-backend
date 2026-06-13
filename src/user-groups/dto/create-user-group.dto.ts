import { ApiProperty } from '@nestjs/swagger';
import {
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateUserGroupDto {
  @ApiProperty({ example: 'VIP 멤버', description: '그룹 이름 (최대 30자)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name: string;

  @ApiProperty({
    example: 'vip-members',
    description: 'slug (소문자, 숫자, 하이픈만, 최대 50자)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug는 소문자, 숫자, 하이픈만 사용할 수 있습니다.',
  })
  slug: string;

  @ApiProperty({
    example: '프리미엄 콘텐츠 접근 그룹',
    required: false,
    description: '그룹 설명',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '#FF5733',
    required: false,
    description: '그룹 색상 (HEX)',
  })
  @IsOptional()
  @IsHexColor()
  color?: string;
}
