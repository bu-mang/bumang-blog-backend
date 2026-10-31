import { ApiProperty } from '@nestjs/swagger';
import { GroupEntity } from '../entities/group.entity';
import { CategoryEntity } from '../entities/category.entity';

class CategoryResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  label: string;

  @ApiProperty({ example: 'architecture', description: '주소용 고정 키' })
  slug: string;

  @ApiProperty()
  order: number;

  static fromEntity(category: CategoryEntity): CategoryResponseDto {
    const dto = new CategoryResponseDto();
    dto.id = category.id;
    dto.label = category.label;
    dto.slug = category.slug;
    dto.order = category.order;
    return dto;
  }
}

export class GroupedMenuTreeResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  label: string;

  @ApiProperty({
    example: 'life',
    description: '주소·코드 판정용 고정 키 (life면 Life 탭)',
  })
  slug: string;

  @ApiProperty()
  categories: CategoryResponseDto[];

  @ApiProperty()
  totalPostsCount: number;

  static fromEntity(
    group: GroupEntity,
    totalPostsCount = 0,
  ): GroupedMenuTreeResponseDto {
    const dto = new GroupedMenuTreeResponseDto();
    dto.id = group.id;
    dto.label = group.label;
    dto.slug = group.slug;
    dto.totalPostsCount = totalPostsCount;
    dto.categories =
      group.categories
        ?.slice()
        .sort((a, b) => a.order - b.order)
        .map(CategoryResponseDto.fromEntity) ?? [];

    return dto;
  }
}
