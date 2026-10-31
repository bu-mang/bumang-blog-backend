import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';
import { IsSlug } from 'src/common/decorator/is-slug.decorator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Frontend', description: '카테고리 라벨' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    example: 'architecture',
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

  @ApiProperty({
    example: 1,
    required: false,
    nullable: true,
    description: '소속 그룹 ID',
  })
  @IsOptional()
  @IsNumber()
  groupId: number | null;
}
