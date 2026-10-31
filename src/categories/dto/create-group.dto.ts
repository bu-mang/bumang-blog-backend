import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import { IsSlug } from 'src/common/decorator/is-slug.decorator';

export class CreateGroupDto {
  @ApiProperty({ example: '개발', description: '그룹 라벨' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    example: 'backend',
    required: false,
    description:
      '주소용 고정 키 (소문자·숫자를 하이픈으로 이음, 최대 50자). 생략하면 라벨에서 만든다. 라벨을 고쳐도 따라 바뀌지 않는다.',
  })
  @IsOptional()
  @IsSlug()
  slug?: string;

  @ApiProperty({
    example: 0,
    required: false,
    nullable: true,
    description: '정렬 순서',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  order: number | null;
}
