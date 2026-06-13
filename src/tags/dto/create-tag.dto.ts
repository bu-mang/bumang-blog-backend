import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'React', description: '태그 이름' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 1, description: '소속 그룹 ID' })
  @IsNumber()
  @IsNotEmpty()
  groupId: number;
}
