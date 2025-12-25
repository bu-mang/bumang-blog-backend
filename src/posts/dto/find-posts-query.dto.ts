import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class FindPostsQueryDto {
  @ApiProperty({
    description: '그룹 아이디로 조회 시',
    required: false,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @ApiProperty({
    description: '카테고리 아이디로 조회 시',
    required: false,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiProperty({
    description: '태그 아이디로 조회 (중첩 가능)',
    required: false,
    type: [Number],
    example: [1, 2, 3],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = Array.isArray(value) ? value : [value];
    const parsed = arr.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));
    return parsed.length > 0 ? parsed : undefined;
  })
  @IsArray()
  tagIds?: number[];

  @ApiProperty({
    description: '페이지당 게시글 수',
    required: false,
    default: 12,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number = 12;

  @ApiProperty({
    description: '페이지 번호',
    required: false,
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageIndex?: number = 1;

  @ApiProperty({
    description: '포스트 타입 (dev, life)',
    required: false,
    type: String,
    example: 'dev',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  type?: string;
}
