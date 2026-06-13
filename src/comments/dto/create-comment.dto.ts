import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: '좋은 글 감사합니다!', description: '댓글 내용' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
