import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { CategoryEntity } from './entities/category.entity';
import { GroupEntity } from './entities/group.entity';

import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { GroupedMenuTreeResponseDto } from './dto/grouped-menu-tree.dto';
import { PostEntity } from 'src/posts/entities/post.entity';
import { resolveSlug } from 'src/common/util/slugify';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,

    @InjectRepository(GroupEntity)
    private readonly groupRepo: Repository<GroupEntity>,

    @InjectRepository(PostEntity)
    private readonly postRepo: Repository<PostEntity>,
  ) {}

  /**
   * @GROUP
   */
  // 1. 그룹 전체 조회
  async findAllGroupRaw() {
    const groups = await this.groupRepo.find({
      relations: ['categories'],
      order: { order: 'ASC' },
    });

    return groups;
  }

  // 2. 그룹 단일 조회
  async findOneGroup(id: number) {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: ['categories'],
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return group;
  }

  // 3. 그룹 추가
  async createOneGroup(dto: CreateGroupDto): Promise<GroupEntity> {
    const { label, order } = dto;
    const slug = resolveSlug(label, dto.slug);

    if (await this.groupRepo.findOne({ where: { slug } })) {
      throw new ConflictException('Group slug is already in use');
    }

    const existingLabel = await this.groupRepo.findOne({
      where: { label },
    });

    if (existingLabel) {
      throw new ConflictException('Group label is already in use');
    }

    let finalOrder: number = order;

    if (typeof order === 'number') {
      const existingOrder = await this.groupRepo.findOne({
        where: { order: finalOrder },
      });

      if (existingOrder) {
        throw new ConflictException('Group Order is already in use');
      }
    } else {
      // order가 null인 경우
      const maxOrderGroup = await this.groupRepo.find({
        order: { order: 'DESC' },
        take: 1,
      });

      // 계층에서 가장 후순위 오더로 지정
      finalOrder = maxOrderGroup[0]?.order ? maxOrderGroup[0].order + 1 : 1;
    }

    const group = this.groupRepo.create({
      label,
      slug,
      order: finalOrder,
    });

    return this.groupRepo.save(group);
  }

  // 4. 그룹 수정
  async updateOneGroup(id: number, dto: UpdateGroupDto) {
    const { label, slug, order } = dto;

    // 아이디로 조회
    const existingGroup = await this.groupRepo.findOne({
      where: { id },
    });

    // 아이디가 존재하지 않으면 에러처리
    if (!existingGroup) {
      throw new NotFoundException('Group not found');
    }

    // 찾으면 newOne에 할당.
    const newOne = existingGroup;
    if (typeof label === 'string') {
      const existingLabel = await this.groupRepo.findOne({
        where: { label },
      });

      if (existingLabel && existingLabel.id !== id) {
        throw new ConflictException('Label already in use');
      }

      newOne.label = label;
    }

    // slug는 라벨을 따라 바뀌지 않는다 — 명시했을 때만 바꾼다.
    if (typeof slug === 'string') {
      const existingSlug = await this.groupRepo.findOne({ where: { slug } });
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException('Slug already in use');
      }
      newOne.slug = slug;
    }

    if (typeof order === 'number') {
      const existingdOrder = await this.groupRepo.findOne({
        where: { order },
      });

      if (existingdOrder && existingdOrder.id !== id) {
        throw new ConflictException('Order already in use');
      }

      newOne.order = order;
    }

    const res = await this.groupRepo.save(newOne);

    return res;
  }

  // 5. 그룹 삭제
  async deleteOneGroup(id: number) {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: ['categories'],
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    if (group.categories?.length > 0) {
      throw new ConflictException(
        'Cannot delete group: categories exist under this group.',
      );
    }

    await this.groupRepo.remove(group); // 따로 응답을 내려주지 않음 (204)
  }

  /**
   * @CATEGORIES
   */
  // 1. 전체 카테고리 조회 (JSON 계층구조 표현 | raw)
  async findAllCategoryRaw() {
    const categories = await this.categoryRepo.find({
      relations: ['group', 'posts'],
      order: { order: 'ASC' },
    });

    return categories;
  }

  // 2. 단일 카테고리 추가
  async createOneCategory(dto: CreateCategoryDto): Promise<CategoryEntity> {
    const { label, order, groupId } = dto;
    const slug = resolveSlug(label, dto.slug);

    // 1. 해당 이름의 카테고리가 이미 있는지 체크
    const existingLabel = await this.categoryRepo.findOne({ where: { label } });
    if (existingLabel) {
      throw new ConflictException('Category label is already in use'); // 409 에러를 던져줌
    }
    if (await this.categoryRepo.findOne({ where: { slug } })) {
      throw new ConflictException('Category slug is already in use');
    }

    // 그룹 찾기 로직
    let group: GroupEntity | null = null;
    if (groupId) {
      group = await this.groupRepo.findOne({
        where: { id: groupId },
      });

      // groupId와 일치하는게 없다면
      if (!group) {
        throw new NotFoundException(`Group not found`); // 404 에러를 던져줌
      }
    }

    // Order 로직
    let finalOrder = order;
    if (order === null) {
      // 요청값에 오더가 없다면
      const maxOrderCategory = await this.categoryRepo.findOne({
        where: group ? { group: { id: group.id } } : { group: null },
        order: { order: 'DESC' },
      });

      // 계층에서 가장 후순위 오더로 지정
      finalOrder = maxOrderCategory ? maxOrderCategory.order + 1 : 1;
    } else {
      // 요청값에 오더가 있다면
      const orderedItem = await this.categoryRepo.findOne({
        where: { order, group: { id: group?.id } },
      });

      // 그 오더가 선점되어 있다면 에러.
      if (orderedItem) {
        throw new ConflictException('The Order is already in use'); // 409 에러를 던져줌
      }
    }

    const category = this.categoryRepo.create({
      label,
      slug,
      order: finalOrder,
      group,
    });

    return this.categoryRepo.save(category);
  }

  // 3. 카테고리 수정
  async updateOneCategory(
    id: number,
    dto: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    const { label, slug, order, groupId } = dto;

    // slug는 라벨을 따라 바뀌지 않는다 — 명시했을 때만 바꾼다.
    if (typeof slug === 'string') {
      const existingSlug = await this.categoryRepo.findOne({
        where: { slug },
      });
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException('this slug has already been used');
      }
    }

    // 라벨 변경 요청 처리
    if (typeof label === 'string') {
      const existingLabel = await this.categoryRepo.findOne({
        where: { label },
      });
      if (existingLabel && existingLabel.id !== id) {
        throw new ConflictException('this label has already been used'); // 409 에러를 던져줌
      }
    }

    // 부모 카테고리 변경 요청
    let parentGroup: GroupEntity | null = null;
    if ('parentId' in dto) {
      parentGroup = await this.groupRepo.findOne({
        where: { id: groupId },
      });

      // 부모 카테고리가 실제로 존재하지 않는다면
      if (!parentGroup) {
        throw new NotFoundException(`Parent with ID ${groupId} not found`);
      }
    }

    // 순서 카테고리 변경 요청
    if (typeof order === 'number') {
      const existingOrder = await this.categoryRepo.findOne({
        where: { order, group: { id: parentGroup ? parentGroup.id : null } },
      });

      // 해당 부모 카테고리의 순서에 이미 있다면
      if (existingOrder && existingOrder.id !== id) {
        throw new ConflictException(
          'this order with parents has already been used',
        );
      }
    }

    const result = await this.categoryRepo.update(id, dto);

    if (result.affected === 0) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const updated = await this.categoryRepo.findOne({ where: { id } });

    if (!updated) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return updated;
  }

  // 4. <DELETE> 카테고리 삭제
  async deleteOneCategory(id: number) {
    const category = await this.categoryRepo.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    await this.categoryRepo.remove(category); // 따로 응답을 내려주지 않음 (204)
  }

  // 메뉴트리 조회
  async findGroupedCategoryTree() {
    const groups = await this.groupRepo.find({
      order: { order: 'ASC' },
      relations: ['categories'],
    });

    // 병렬로 비동기 작업 실행 후 한 번에 기다림
    return await Promise.all(
      groups.map(async (group) => {
        const categoryIds = group.categories.map((c) => c.id);

        const totalPostsCount = await this.postRepo.count({
          where: {
            category: { id: In(categoryIds) },
          },
        });

        // GroupedMenuTreeResponseDto
        return GroupedMenuTreeResponseDto.fromEntity(group, totalPostsCount);
      }),
    );
  }
}
