import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GeneratePresignedUrlDto {
  @ApiProperty({ example: 'image.png', description: '업로드할 파일명' })
  @IsString()
  filename: string;

  @ApiProperty({ example: 'image/png', description: '파일 MIME 타입' })
  @IsString()
  mimetype: string;
}
