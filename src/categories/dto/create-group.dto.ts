import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ example: '개발', description: '그룹 라벨' })
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
}
