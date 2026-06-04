import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
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

  @ApiProperty({
    type: [Number],
    required: false,
    description:
      '글 단위 기본 audience. 블록 단위 매핑이 없으면 이 값을 따른다. 빈 배열이면 그룹 필터 없음(읽기 권한 통과한 모두에게 노출).',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  defaultAudienceGroupIds?: number[];

  @ApiProperty({
    required: false,
    description:
      'BlockNote block.id → groupId[] 매핑. 빈 배열은 명시적 공개, 키 없으면 글 default 적용.',
  })
  @IsOptional()
  @IsObject()
  blockAudienceMap?: Record<string, number[]>;
}
