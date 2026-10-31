import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class FindPostsQueryDto {
  @ApiProperty({
    description: '그룹 slug로 조회 (예: backend). groupId보다 우선',
    required: false,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  group?: string;

  @ApiProperty({
    description: '카테고리 slug로 조회 (예: architecture). categoryId보다 우선',
    required: false,
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  category?: string;

  @ApiProperty({
    description:
      '태그 slug로 조회 (중첩 가능, 예: kubernetes). tagIds보다 우선',
    required: false,
    type: [String],
    example: ['kubernetes', 'aws'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = (Array.isArray(value) ? value : [value]).filter(
      (v) => typeof v === 'string' && v !== '',
    );
    return arr.length > 0 ? arr : undefined;
  })
  @IsArray()
  @IsString({ each: true })
  tag?: string[];

  // id 필터는 구버전 프론트 호환용으로 남긴다 (새 프론트는 slug만 쓴다).
  @ApiProperty({
    description: '그룹 아이디로 조회 시 (구버전 호환)',
    required: false,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @ApiProperty({
    description: '카테고리 아이디로 조회 시 (구버전 호환)',
    required: false,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiProperty({
    description: '태그 아이디로 조회 (중첩 가능, 구버전 호환)',
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
