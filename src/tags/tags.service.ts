import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TagsEntity } from './entities/tag.entity';
import { GroupEntity } from 'src/categories/entities/group.entity';
import { CommonTagResponseDto } from './dto/common-tag-response.dto';
import { resolveSlug } from 'src/common/util/slugify';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(TagsEntity)
    private readonly tagRepo: Repository<TagsEntity>,

    @InjectRepository(GroupEntity)
    private readonly groupRepo: Repository<GroupEntity>,
  ) {}

  // 1. 태그 생성
  async createTag(createTagDto: CreateTagDto) {
    const { title, groupId } = createTagDto;
    const slug = resolveSlug(title, createTagDto.slug);

    const existingTitle = await this.tagRepo.findOne({
      where: { title },
    });

    if (existingTitle) {
      throw new ConflictException('This tag title is already in use');
    }
    if (await this.tagRepo.findOne({ where: { slug } })) {
      throw new ConflictException('This tag slug is already in use');
    }

    const existingGroup = await this.groupRepo.findOne({
      where: { id: groupId },
    });

    if (!existingGroup) {
      throw new NotFoundException(`Group with ID: ${groupId} does not exist`);
    }

    const tag = await this.tagRepo.save({
      title,
      slug,
      group: existingGroup,
    });

    return CommonTagResponseDto.fromEntity(tag);
  }

  // 2. 모든 태그 조회
  async findAllTag() {
    const tags = await this.tagRepo.find({
      relations: ['group'],
      order: { id: 'ASC' },
    });

    return tags.map(CommonTagResponseDto.fromEntity);
  }

  // 3. 태그 하나 조회
  async findOneTag(id: number) {
    const tag = await this.tagRepo.findOne({
      where: { id },
      relations: ['posts', 'group'],
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return CommonTagResponseDto.fromEntity(tag);
  }

  // 4. 태그 업데이트
  async updateOneTag(id: number, updateTagDto: UpdateTagDto) {
    const tag = await this.tagRepo.findOne({
      where: { id },
      relations: ['group'],
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    // dto에 title이 있다면
    if (updateTagDto.title) {
      const existingTitle = await this.tagRepo.findOne({
        where: { title: updateTagDto.title },
      });

      if (existingTitle && existingTitle.id !== id) {
        throw new ConflictException('This tag title is already in use');
      }
    }

    // slug는 이름을 따라 바뀌지 않는다 — 명시했을 때만 바꾼다.
    if (updateTagDto.slug) {
      const existingSlug = await this.tagRepo.findOne({
        where: { slug: updateTagDto.slug },
      });
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException('This tag slug is already in use');
      }
    }

    await this.tagRepo.save({
      id,
      ...updateTagDto,
    });

    return CommonTagResponseDto.fromEntity(tag);
  }

  // 5. 태그 삭제
  async removeOneTag(id: number) {
    const tag = await this.tagRepo.findOne({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    await this.tagRepo.remove(tag);
  }
}
