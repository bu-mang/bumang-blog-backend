import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiProperty({ example: 1, required: false, description: '소속 그룹 ID' })
  @IsOptional()
  @IsNumber()
  groupId?: number;
}
