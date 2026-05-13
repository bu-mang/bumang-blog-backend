import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { RolesEnum } from 'src/users/const/roles.const';

export class CreatePostDto {
  @ApiProperty({
    required: false,
    description:
      '생성 요청 멱등 키(UUID). 같은 키로 재요청 시 중복 생성 없이 기존 글을 반환합니다.',
  })
  @IsOptional()
  @IsUUID()
  clientRequestId?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty()
  @IsString()
  previewText: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  thumbnailUrl: string;

  @ApiProperty()
  @IsNumber()
  categoryId: number;

  @ApiProperty({ type: [Number], required: false })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tagIds: number[];

  @ApiProperty({ enum: RolesEnum, required: false, nullable: true })
  @IsOptional()
  @IsEnum(RolesEnum)
  readPermission: RolesEnum | null;
}
