import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Frontend', description: '카테고리 라벨' })
  @IsString()
  @IsNotEmpty()
  label: string;

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
