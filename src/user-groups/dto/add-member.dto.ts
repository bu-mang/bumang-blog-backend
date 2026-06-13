import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({ example: 1, description: '그룹에 추가할 사용자 ID' })
  @IsInt()
  @IsPositive()
  userId: number;
}
