import { ApiProperty } from '@nestjs/swagger';
import { PostEntity } from '../entities/post.entity';
import { RolesEnum } from 'src/users/const/roles.const';

export class CategorySimplifiedResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  label: string;
}

export class GroupSimplifiedResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  label: string;
}

export class TagSimplifiedResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  label: string;
}

export class PostDetailResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  previewText: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  authorNickname: string;

  @ApiProperty({ enum: RolesEnum, nullable: true })
  readPermission: RolesEnum | null;

  @ApiProperty({ type: [Number] })
  defaultAudienceGroupIds: number[];

  @ApiProperty({
    description:
      'block.id → groupId[]. 작성자/owner에게만 노출 (편집 페이지에서 필요).',
    required: false,
  })
  blockAudienceMap?: Record<string, number[]>;

  @ApiProperty({
    type: [String],
    description: '마스킹된 블록의 BlockNote id 목록 (프론트에서 블러 적용용)',
  })
  maskedBlockIds: string[];

  @ApiProperty()
  views: number;

  @ApiProperty()
  likes: number;

  // @ApiProperty()
  // isLiked: boolean; // ← 선택적으로 포함

  @ApiProperty({
    type: () => CategorySimplifiedResponse,
    nullable: true,
  })
  category: CategorySimplifiedResponse;

  @ApiProperty({
    type: () => GroupSimplifiedResponse,
    nullable: true,
  })
  group: GroupSimplifiedResponse;

  @ApiProperty({
    type: () => [TagSimplifiedResponse],
  })
  tags: TagSimplifiedResponse[];

  @ApiProperty()
  thumbnailUrl: string;

  static fromEntity(
    post: PostEntity,
    overrides?: {
      content?: string;
      includeBlockAudienceMap?: boolean;
      maskedBlockIds?: string[];
    },
  ): PostDetailResponseDto {
    const dto = new PostDetailResponseDto();
    dto.id = post.id;
    dto.title = post.title;
    dto.content = overrides?.content ?? post.content;
    dto.previewText = post.previewText;

    dto.createdAt = post.createdAt;
    dto.updatedAt = post.updatedAt;

    dto.authorNickname = post.author?.nickname ?? 'unknown';
    dto.readPermission = post.readPermission;
    dto.defaultAudienceGroupIds = post.defaultAudienceGroupIds ?? [];
    if (overrides?.includeBlockAudienceMap) {
      dto.blockAudienceMap = post.blockAudienceMap ?? {};
    }
    dto.maskedBlockIds = overrides?.maskedBlockIds ?? [];
    dto.thumbnailUrl = post.thumbnailUrl;

    dto.views = post.view;
    dto.likes = post.likes;

    dto.category = post.category
      ? {
          id: post.category.id,
          label: post.category.label,
        }
      : null;

    dto.group = post.category.group
      ? {
          id: post.category.group.id,
          label: post.category.group.label,
        }
      : null;

    dto.tags = [...post.tags.map((tag) => ({ id: tag.id, label: tag.title }))];

    return dto;
  }
}
