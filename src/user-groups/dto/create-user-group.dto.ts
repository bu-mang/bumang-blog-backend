import { ApiProperty } from '@nestjs/swagger';
import {
  IsHexColor,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsSlug } from 'src/common/decorator/is-slug.decorator';

export class CreateUserGroupDto {
  @ApiProperty({ example: 'VIP 멤버', description: '그룹 이름 (최대 30자)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  name: string;

  @ApiProperty({
    example: 'vip-members',
    required: false,
    description:
      'slug (소문자·숫자를 하이픈으로 이음, 최대 50자). 생략하면 이름에서 만든다 — 이름이 한글이면 직접 지정해야 한다.',
  })
  @IsOptional()
  @IsSlug()
  slug?: string;

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
