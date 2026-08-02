import { ApiProperty } from '@nestjs/swagger';
import { PostEntity } from '../entities/post.entity';
import { RolesEnum } from 'src/users/const/roles.const';
import { PostTypeEnum } from '../const/type.const';

export class PostListItemResponseDto {
  @ApiProperty({ example: 0 })
  id: number;

  @ApiProperty({ example: '제목: 프로젝트 후기' })
  title: string;

  @ApiProperty()
  previewText: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ example: 'React' })
  categoryLabel: string;

  @ApiProperty({ example: 1, nullable: true, description: '필터 링크용 카테고리 id' })
  categoryId: number | null;

  @ApiProperty({ example: 'Frontend' })
  groupLabel: string;

  @ApiProperty({ example: 1, nullable: true, description: '필터 링크용 그룹 id' })
  groupId: number | null;

  @ApiProperty({ example: ['React', 'Next.js'] })
  tags: { title: string; id: number }[];

  @ApiProperty({ example: 'Bumang' })
  author: string;

  @ApiProperty({
    example: 'guest',
    enum: RolesEnum,
    nullable: true,
  })
  authorRole: RolesEnum;

  @ApiProperty({
    example: 'guest',
    enum: RolesEnum,
    nullable: true,
  })
  readPermisson: RolesEnum;

  @ApiProperty({ required: false, example: '0' })
  score?: number;

  @ApiProperty()
  thumbnailUrl: string;

  @ApiProperty({
    example: 'life',
    enum: PostTypeEnum,
  })
  type: PostTypeEnum;

  @ApiProperty({ example: 0, description: '조회수' })
  view: number;

  static fromEntity(
    post: PostEntity & { score?: number },
  ): PostListItemResponseDto {
    const dto = new PostListItemResponseDto();
    dto.id = post.id;
    dto.title = post.title;
    dto.previewText = post.previewText;
    dto.createdAt = post.createdAt;
    dto.categoryLabel = post.category?.label ?? null;
    dto.categoryId = post.category?.id ?? null;
    dto.groupLabel = post.category?.group?.label ?? null;
    dto.groupId = post.category?.group?.id ?? null;
    dto.tags =
      post.tags?.map((tag) => ({ title: tag.title, id: tag.id })) ?? [];
    dto.author = post.author?.nickname ?? 'unknown';
    dto.authorRole = post.author?.role ?? null;
    dto.readPermisson = post.readPermission;
    dto.thumbnailUrl = post.thumbnailUrl;
    dto.type = post.type;
    dto.view = post.view ?? 0;

    return dto;
  }
}
