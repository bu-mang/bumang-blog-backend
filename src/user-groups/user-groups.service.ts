import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserGroupEntity } from './entities/user-group.entity';
import { UserGroupMembershipEntity } from './entities/user-group-membership.entity';
import { UserEntity } from 'src/users/entities/user.entity';
import { CreateUserGroupDto } from './dto/create-user-group.dto';
import { UpdateUserGroupDto } from './dto/update-user-group.dto';

@Injectable()
export class UserGroupsService {
  constructor(
    @InjectRepository(UserGroupEntity)
    private readonly groupRepo: Repository<UserGroupEntity>,
    @InjectRepository(UserGroupMembershipEntity)
    private readonly membershipRepo: Repository<UserGroupMembershipEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async findAll() {
    return this.groupRepo.find({
      order: { createdAt: 'ASC' },
      relations: ['memberships', 'memberships.user'],
    });
  }

  async findOne(id: number) {
    const group = await this.groupRepo.findOne({
      where: { id },
      relations: ['memberships', 'memberships.user'],
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  async create(dto: CreateUserGroupDto) {
    const dup = await this.groupRepo.findOne({
      where: [{ name: dto.name }, { slug: dto.slug }],
    });
    if (dup) {
      throw new ConflictException(
        dup.name === dto.name ? 'name already in use' : 'slug already in use',
      );
    }
    const group = this.groupRepo.create(dto);
    return this.groupRepo.save(group);
  }

  async update(id: number, dto: UpdateUserGroupDto) {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Group ${id} not found`);

    if (dto.name && dto.name !== group.name) {
      const dup = await this.groupRepo.findOne({ where: { name: dto.name } });
      if (dup) throw new ConflictException('name already in use');
    }
    if (dto.slug && dto.slug !== group.slug) {
      const dup = await this.groupRepo.findOne({ where: { slug: dto.slug } });
      if (dup) throw new ConflictException('slug already in use');
    }

    Object.assign(group, dto);
    return this.groupRepo.save(group);
  }

  async remove(id: number) {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    await this.groupRepo.remove(group);
  }

  async addMember(groupId: number, userId: number) {
    const group = await this.groupRepo.findOne({ where: { id: groupId } });
    if (!group) throw new NotFoundException(`Group ${groupId} not found`);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const existing = await this.membershipRepo.findOne({
      where: { groupId, userId },
    });
    if (existing) throw new ConflictException('User is already a member');

    const membership = this.membershipRepo.create({ groupId, userId });
    return this.membershipRepo.save(membership);
  }

  async removeMember(groupId: number, userId: number) {
    const membership = await this.membershipRepo.findOne({
      where: { groupId, userId },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    await this.membershipRepo.remove(membership);
  }

  /**
   * viewer가 속한 group id 집합. 마스킹 판정에 사용.
   * 비로그인은 빈 Set.
   */
  async getViewerGroupIds(userId: number | null | undefined): Promise<Set<number>> {
    if (!userId) return new Set();
    const memberships = await this.membershipRepo.find({
      where: { userId },
      select: ['groupId'],
    });
    return new Set(memberships.map((m) => m.groupId));
  }

  /**
   * 주어진 group id들이 모두 존재하는지 확인. 글 저장 시 검증용.
   */
  async assertGroupsExist(groupIds: number[]): Promise<void> {
    if (groupIds.length === 0) return;
    const found = await this.groupRepo.find({
      where: { id: In(groupIds) },
      select: ['id'],
    });
    if (found.length !== groupIds.length) {
      const missing = groupIds.filter(
        (id) => !found.some((g) => g.id === id),
      );
      throw new NotFoundException(`Groups not found: ${missing.join(', ')}`);
    }
  }
}
