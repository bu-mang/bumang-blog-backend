import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Repository } from 'typeorm';

import { UserEntity } from './entities/user.entity';
import { PostEntity } from 'src/posts/entities/post.entity';
import { CommentEntity } from 'src/comments/entities/comment.entity';

import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDetailResponseDto } from './dto/user-detail-response.dto';
import * as bcrypt from 'bcrypt';
import { AppLoggerService } from 'src/logger/app-logger.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(PostEntity)
    private readonly postRepo: Repository<PostEntity>,

    @InjectRepository(CommentEntity)
    private readonly commentRepo: Repository<CommentEntity>,

    private readonly appLoggerService: AppLoggerService,
  ) {}

  // 전체 유저 조회
  async findAllUser(): Promise<UserEntity[]> {
    return this.userRepo.find({
      relations: ['posts', 'comments'], // 옵션
    });
  }

  // 특정 유저 조회 (아이디로)
  async findOneUserById(id: number): Promise<UserDetailResponseDto> {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with this ID does not exist`); // 404 에러를 던져줌
    }

    // 연결된 관계가 혹여 없다고 해도 에러가 나지 않고 0이 나옴.
    const [postsCount, commentsCount] = await Promise.all([
      this.postRepo.count({
        where: { author: { id: user.id } },
      }),
      this.commentRepo.count({
        where: { author: { id: user.id } },
      }),
    ]);

    return UserDetailResponseDto.fromEntity(user, postsCount, commentsCount);
  }

  // 특정 유저 조회 (아이디로)
  async validateOneUserById(id: number): Promise<UserEntity> {
    const user = await this.userRepo.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with this ID does not exist`); // 404 에러를 던져줌
    }

    return user;
  }

  // 특정 유저 조회 (이메일로)
  async findOneUserByEmail(email: string): Promise<UserDetailResponseDto> {
    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['posts', 'comments'],
    });

    if (!user) {
      throw new NotFoundException(`User with this Email does not exist`); // 404 에러를 던져줌
    }

    // 연결된 관계가 혹여 없다고 해도 에러가 나지 않고 0이 나옴.
    const [postsCount, commentsCount] = await Promise.all([
      this.postRepo.count({
        where: { author: { id: user.id } },
      }),
      this.commentRepo.count({
        where: { author: { id: user.id } },
      }),
    ]);

    return UserDetailResponseDto.fromEntity(user, postsCount, commentsCount);
  }

  // 특정 유저 조회 (이메일로, 비밀번호, 리프레시토큰 포함)
  async validateOneUserPasswordByEmail(email: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException(`User with this Email does not exist`); // 404 에러를 던져줌
    }

    return user;
  }

  // 특정 유저 조회 (닉네임으로)
  async findOneUserByNickname(
    nickname: string,
  ): Promise<UserDetailResponseDto> {
    const user = await this.userRepo.findOne({
      where: { nickname },
      relations: ['posts', 'comments'],
    });

    if (!user) {
      throw new UnauthorizedException(`User with this Email does not exist`); // 404 에러를 던져줌
    }

    // 연결된 관계가 혹여 없다고 해도 에러가 나지 않고 0이 나옴.
    const [postsCount, commentsCount] = await Promise.all([
      this.postRepo.count({
        where: { author: { id: user.id } },
      }),
      this.commentRepo.count({
        where: { author: { id: user.id } },
      }),
    ]);

    return UserDetailResponseDto.fromEntity(user, postsCount, commentsCount);
  }

  // 사용가능한 이메일인지 여부
  async isEmailAvailable(email: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { email },
    });

    return !user;
  }

  // 사용가능한 닉네임인지 여부
  async isNicknameAvailable(nickname: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { nickname },
    });

    return !user;
  }

  // 유저 생성
  async createUser(dto: CreateUserDto): Promise<UserDetailResponseDto> {
    const { email, nickname, password } = dto;

    // Promise.all로 동시 조회
    const [existingEmail, existingNickname] = await Promise.all([
      this.userRepo.findOne({ where: { email } }),
      this.userRepo.findOne({ where: { nickname } }),
    ]);

    if (existingEmail) {
      this.appLoggerService.logUser(
        'user_not_created_existing_email',
        undefined,
        email,
        false,
      );
      throw new ConflictException('this email has already been used'); // 409 에러를 던져줌
    }
    if (existingNickname) {
      this.appLoggerService.logUser(
        'user_not_created_existing_nickname',
        undefined,
        email,
        false,
      );
      throw new ConflictException('this nickname has already been used');
    }

    const hashedPassword = await bcrypt.hash(password, 10); // 필요 시

    const user = this.userRepo.create({
      ...dto,
      password: hashedPassword,
    });

    // const user = this.userRepo.create(dto);
    const saved = await this.userRepo.save(user);
    this.appLoggerService.logUser('user_created', user.id, email, true);
    return UserDetailResponseDto.fromEntity(saved, 0, 0);
  }

  // 유저 수정
  async updateUser(
    id: number,
    dto: UpdateUserDto,
  ): Promise<UserDetailResponseDto> {
    const { email, nickname } = dto;
    if (dto.email) {
      const existingEmail = await this.userRepo.findOne({ where: { email } });
      if (existingEmail && existingEmail.id !== id) {
        this.appLoggerService.logUser(
          'user_not_updated_attempt_to_change_existing_email',
          existingEmail.id,
          email,
          false,
        );
        throw new ConflictException('this email has already been used'); // 409 에러를 던져줌
      }
    }

    if (dto.nickname) {
      const existingNickname = await this.userRepo.findOne({
        where: { nickname },
      });
      if (existingNickname && existingNickname.id !== id) {
        this.appLoggerService.logUser(
          'user_not_updated_attempt_to_change_existing_nickname',
          existingNickname.id,
          email,
          false,
        );
        throw new ConflictException('this nickname has already been used');
      }
    }

    const result = await this.userRepo.update(id, dto);

    if (result.affected === 0) {
      this.appLoggerService.logUser(
        'user_not_found_for_update',
        undefined,
        dto.email,
        false,
      );
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updated = await this.userRepo.findOne({ where: { id } });
    // {
    //   affected?: number;     // 영향받은 행 수 (수정된 행의 개수)
    //   generatedMaps: any[];  // 생성된 값들
    //   raw: any;             // 원시 결과
    // }

    if (!updated) {
      this.appLoggerService.logUser(
        'user_not_found_after_update',
        id,
        dto.email,
        false,
      );
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // 성공
    this.appLoggerService.logUser('user_updated', id, dto.email, true);

    // 연결된 관계가 혹여 없다고 해도 에러가 나지 않고 0이 나옴.
    const [postsCount, commentsCount] = await Promise.all([
      this.postRepo.count({
        where: { author: { id: updated.id } },
      }),
      this.commentRepo.count({
        where: { author: { id: updated.id } },
      }),
    ]);

    return UserDetailResponseDto.fromEntity(updated, postsCount, commentsCount);
  }

  // 유저 삭제 (host 전용). 종속 데이터를 정리해 FK 제약을 안전하게 통과시킨다.
  async removeUser(id: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      this.appLoggerService.logUser(
        'user_not_found_for_removal',
        id, // ← id라도 남기기
        undefined,
        false,
      );
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const tempEmail = user.email;

    // 하나의 트랜잭션으로: 글 존재 시 차단 → 댓글 정리 → 유저 삭제(멤버십은 FK CASCADE).
    await this.userRepo.manager.transaction(async (manager) => {
      // 작성한 글이 있으면 콘텐츠 유실 방지를 위해 삭제를 막는다.
      // soft-delete된 글도 FK가 남아 user 삭제를 막으므로, TypeORM 필터를 우회하는 raw count로 센다.
      const rows: Array<{ count: number }> = await manager.query(
        'SELECT count(*)::int AS count FROM post_entity WHERE "authorId" = $1',
        [id],
      );
      const postCount = rows[0]?.count ?? 0;
      if (postCount > 0) {
        throw new ConflictException(
          `이 유저(id=${id})가 작성한 글이 ${postCount}건 있어 삭제할 수 없습니다. 글을 먼저 이관하거나 삭제해 주세요.`,
        );
      }

      // 댓글은 유저 종속 데이터라 함께 삭제 (comment_entity.authorId → NO ACTION).
      await manager.query('DELETE FROM comment_entity WHERE "authorId" = $1', [
        id,
      ]);

      // 그룹 멤버십은 FK CASCADE로 자동 삭제됨. 감사 로그(login_attempt)는 FK 없음(이력 보존).
      await manager.delete(UserEntity, id);
    });

    this.appLoggerService.logUser('user_removed', id, tempEmail, true);
  }
}
