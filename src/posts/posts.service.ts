import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { In, LessThan, MoreThan, Repository } from 'typeorm';
import { PostEntity } from './entities/post.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePostDto } from './dto/create-post.dto';
import { UserEntity } from 'src/users/entities/user.entity';
import { TagsEntity } from 'src/tags/entities/tag.entity';
import { CategoryEntity } from 'src/categories/entities/category.entity';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostListItemResponseDto } from './dto/post-list-item-response.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagenated-response.dto';
import { CreatePostResponseDto } from './dto/create-post-response.dto';
import { UpdatePostResponseDto } from './dto/update-post-response.dto';
import { DeletePostResponseDto } from './dto/delete-post-response.dto';
import { canReadPost } from './util/canReadPost';
import { CurrentUserDto } from 'src/common/dto/current-user.dto';
import { canCreateOrUpdatePost } from './util/canCreateOrUpdatePost';
import { PostDetailResponseDto } from './dto/post-detail-response.dto';
import { getPermissionCondition } from './util/getPermissionCondition';
import { PostTypeEnum } from './const/type.const';
import { GroupEntity } from 'src/categories/entities/group.entity';
import { RolesEnum } from 'src/users/const/roles.const';
import { AppLoggerService } from 'src/logger/app-logger.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepo: Repository<PostEntity>,

    @InjectRepository(GroupEntity)
    private readonly groupRepo: Repository<GroupEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,

    @InjectRepository(TagsEntity)
    private readonly tagRepo: Repository<TagsEntity>,

    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,

    private readonly appLoggerService: AppLoggerService,
  ) {}

  // 1. 포스트 모두 조회
  // 2. 특정 카테고리의 포스트 조회 (pagenation)
  // 3. 특정 그룹의 포스트 조회 (pagenation)
  // 4. 특정 태그의 포스트 조회 (pagenation)
  async findPosts(
    page: number,
    size: number,
    filter: {
      groupId?: number;
      categoryId?: number;
      tagIds?: number[];
      type?: string;
    },
  ): Promise<PaginatedResponseDto<PostListItemResponseDto>> {
    const { groupId, categoryId, tagIds, type } = filter;

    const query = this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.category', 'category')
      .leftJoinAndSelect('category.group', 'group')
      .leftJoinAndSelect('post.author', 'user')
      .leftJoinAndSelect('post.tags', 'tag');

    if (groupId) {
      query.where('group.id = :groupId', { groupId });
    } else if (categoryId) {
      query.where('category.id = :categoryId', { categoryId });
    } else if (Array.isArray(tagIds) && tagIds.length !== 0) {
      query.where('tag.id IN (:...tagIds)', { tagIds });
    } else if (type === 'dev' || type === 'life') {
      query.where('post.type = :type', { type });
    }

    query.orderBy('post.createdAt', 'DESC');

    // pagination 적용
    query.skip((page - 1) * size).take(size);

    const [posts, totalCount] = await query.getManyAndCount();

    const postDtos = posts.map(PostListItemResponseDto.fromEntity);

    let subject = '';

    if (groupId) {
      const targetGroup = await this.groupRepo.findOne({
        where: { id: groupId },
      });
      subject = targetGroup.label;
    } else if (categoryId) {
      const targetCategory = await this.categoryRepo.findOne({
        where: { id: categoryId },
      });
      subject = targetCategory.label;
    } else if (tagIds) {
      const targetTags = await this.tagRepo.find({
        where: { id: In(tagIds) },
      });
      subject = targetTags.map((tag) => tag.title).join(', ');
    }

    if (type) {
      subject = type;
    }

    return new PaginatedResponseDto(
      totalCount, //
      size,
      page,
      postDtos,
      subject,
    );
  }

  // async findPostsAuthenticated(
  //   page: number,
  //   size: number,
  //   filter: {
  //     groupId?: number;
  //     categoryId?: number;
  //     tagIds?: number[];
  //     type?: string;
  //   },
  //   user: CurrentUserDto | null,
  // ): Promise<PaginatedResponseDto<PostListItemResponseDto>> {
  //   console.log(user);
  //   const { groupId, categoryId, tagIds, type } = filter;

  //   const query = this.postRepo
  //     .createQueryBuilder('post')
  //     .leftJoinAndSelect('post.category', 'category')
  //     .leftJoinAndSelect('category.group', 'group')
  //     .leftJoinAndSelect('post.author', 'user')
  //     .leftJoinAndSelect('post.tags', 'tag');

  //   if (groupId) {
  //     query.where('group.id = :groupId', { groupId });
  //   } else if (categoryId) {
  //     query.where('category.id = :categoryId', { categoryId });
  //   } else if (Array.isArray(tagIds) && tagIds.length !== 0) {
  //     // 기존: query.where('tag.id = :tagIds', { tagIds });
  //     query.where('tag.id IN (:...tagIds)', { tagIds });
  //   } else if (type === 'dev' || type === 'life') {
  //     query.where('post.type = :type', { type });
  //   }

  //   query.orderBy('post.id', 'DESC');

  //   // pagination 적용
  //   query.skip((page - 1) * size).take(size);

  //   const [posts, totalCount] = await query.getManyAndCount();

  //   const postDtos = posts.map(PostListItemResponseDto.fromEntity);

  //   let subject = '';

  //   if (groupId) {
  //     const targetGroup = await this.groupRepo.findOne({
  //       where: { id: groupId },
  //     });
  //     subject = targetGroup.label;
  //   } else if (categoryId) {
  //     const targetCategory = await this.categoryRepo.findOne({
  //       where: { id: categoryId },
  //     });
  //     subject = targetCategory.label;
  //   } else if (tagIds) {
  //     const targetTags = await this.tagRepo.find({
  //       where: { id: In(tagIds) },
  //     });
  //     subject = targetTags.map((tag) => tag.title).join(', ');
  //   }

  //   if (type) {
  //     subject = type;
  //   }

  //   return new PaginatedResponseDto(
  //     totalCount, //
  //     size,
  //     page,
  //     postDtos,
  //     subject,
  //   );
  // }

  // 5. 특정 포스트 생성
  async createPost(
    createPostDto: CreatePostDto,
    user: CurrentUserDto | null,
  ): Promise<CreatePostResponseDto> {
    if (!user) {
      throw new UnauthorizedException('Login is required.');
    }

    const authorId = user.userId;
    const {
      title,
      content,
      categoryId,
      tagIds,
      readPermission,
      previewText,
      thumbnailUrl,
    } = createPostDto;

    const existingAuthor = await this.userRepo.findOne({
      where: { id: authorId },
    });

    if (!user || !existingAuthor) {
      throw new NotFoundException(
        `User with ID ${authorId ?? 'none'} not found`,
      );
    }

    // 사용자 권한이 User인데 Admin Only 나 Public 옵션으로 글 쓰려고 할 때.
    if (user.role === RolesEnum.USER && readPermission !== RolesEnum.USER) {
      this.appLoggerService.logPost(
        'post_creation_permission_denied',
        undefined,
        user.userId,
      );
      throw new ForbiddenException(
        `Normal Users cannot create posts with Admin-only permission.`,
      );
    }

    const existingCategory = await this.categoryRepo.findOne({
      where: { id: categoryId },
      relations: ['group'],
    });

    if (!existingCategory) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    let postType = PostTypeEnum.DEV;
    const selectedGroup = existingCategory.group?.label;

    if (selectedGroup === 'Life') {
      postType = PostTypeEnum.LIFE;
    }

    let validTags: TagsEntity[] = [];
    if (tagIds && tagIds.length > 0) {
      // 순회가 끝난 다음에 Promise.all(...)이 resolve or reject를 시작..
      // 그러므로 순회 중에 Promise<TagEntity>가 반환되면 에러나는거 아닌가? 생각할 필요 x
      const tags = await Promise.all(
        tagIds.map((id) => this.tagRepo.findOne({ where: { id } })),
      );

      // 타입만 확정시킴
      validTags = tags.filter((tag): tag is TagsEntity => !!tag);

      // 유효하지 않은 태그가 있었다고 한다면...
      if (validTags.length !== tagIds.length) {
        throw new NotFoundException('Some tags were not found');
      }
    }

    const post = this.postRepo.create({
      title,
      content,
      previewText,
      readPermission,
      thumbnailUrl,
      type: postType,
      author: existingAuthor,
      category: existingCategory,
      tags: validTags,
      comments: [],
    });

    await this.postRepo.save(post);

    return CreatePostResponseDto.fromEntity(post);
  }

  // 6. 특정 포스트 상세 조회
  async findPostDetail(
    id: number,
    currentUser: CurrentUserDto | null,
  ): Promise<PostDetailResponseDto> {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: ['category', 'comments', 'tags', 'category.group', 'author'],
      order: { id: 'DESC' },
    });

    if (!post) {
      throw new NotFoundException('Post were not found');
    }

    const userRole = currentUser?.role || null;
    if (!canReadPost(post.readPermission, userRole)) {
      this.appLoggerService.logPost(
        'post_access_denied',
        id,
        currentUser?.userId,
      );

      throw new ForbiddenException(
        'You do not have permission to view this post.',
      );
    }

    this.appLoggerService.logPost(
      'post_read',
      id,
      currentUser?.userId,
      post.title,
    );

    return PostDetailResponseDto.fromEntity(post);
  }

  // 6. (내부용RAW) 특정 포스트 상세 조회
  async findPostDetailRaw(id: number, currentUser: CurrentUserDto | null) {
    const post = await this.postRepo.findOne({
      where: { id },
      relations: ['category', 'comments', 'tags', 'category.group', 'author'],
      order: { id: 'DESC' },
    });

    if (!post) {
      throw new NotFoundException('Post were not found');
    }

    const userRole = currentUser?.role || null;
    if (!canReadPost(post.readPermission, userRole)) {
      this.appLoggerService.logPost(
        'post_access_denied',
        id,
        currentUser?.userId,
      );

      throw new ForbiddenException(
        'You do not have permission to view this post.',
      );
    }

    return post;
  }

  // 7. 특정 포스트 수정
  async updatePost(
    id: number,
    dto: UpdatePostDto,
    currentUser: CurrentUserDto,
  ): Promise<UpdatePostResponseDto> {
    const {
      title,
      content,
      previewText,
      categoryId,
      tagIds,
      readPermission,
      thumbnailUrl,
    } = dto;

    // 아이디로 조회
    const existingPost = await this.postRepo.findOne({
      where: { id },
      relations: ['category', 'comments', 'tags', 'category.group'],
    });

    if (!existingPost) {
      this.appLoggerService.logPost(
        'post_not_found_for_update',
        id,
        currentUser.userId,
      );

      throw new NotFoundException();
    }

    const userRole = currentUser.role;
    if (!canCreateOrUpdatePost(existingPost.readPermission, userRole)) {
      this.appLoggerService.logPost(
        'post_update_permission_denied',
        id,
        currentUser.userId,
      );

      throw new ForbiddenException(
        'You do not have permission to update this post.',
      );
    }

    if (typeof title !== 'string' || title === '') {
      throw new BadRequestException('Invalid Title');
    }

    existingPost.title = title;

    if (typeof content !== 'string' || content === '') {
      throw new BadRequestException('Invalid Content');
    }

    existingPost.content = content;

    const existingCategory = await this.categoryRepo.findOne({
      where: { id: categoryId },
      relations: ['group'],
    });

    if (typeof previewText !== 'string') {
      throw new BadRequestException('Invalid PreviewText');
    }

    existingPost.previewText = previewText;

    if (!existingCategory) {
      throw new NotFoundException(
        `Category with ID ${categoryId} does not exist`,
      );
    }

    existingPost.category = existingCategory;

    if (existingCategory.group.label === 'Life') {
      existingPost.type = PostTypeEnum.LIFE;
    }

    let validTags: TagsEntity[] = [];
    if (tagIds && tagIds.length > 0) {
      // 순회가 끝난 다음에 Promise.all(...)이 resolve or reject를 시작..
      // 그러므로 순회 중에 Promise<TagEntity>가 반환되면 에러나는거 아닌가? 생각할 필요 x
      const tags = await Promise.all(
        tagIds.map((id) => this.tagRepo.findOne({ where: { id } })),
      );

      // 타입만 확정시킴
      validTags = tags.filter((tag): tag is TagsEntity => !!tag);

      // 유효하지 않은 태그가 있었다고 한다면...
      if (validTags.length !== tagIds.length) {
        throw new NotFoundException('Some tags were not found');
      }
    }

    existingPost.tags = validTags;

    if (
      currentUser.role === RolesEnum.USER &&
      readPermission !== RolesEnum.USER
    ) {
      throw new ForbiddenException('Users can only write public posts.');
    }

    if (readPermission !== undefined) {
      existingPost.readPermission = readPermission;
    }

    if (typeof thumbnailUrl === 'string') {
      existingPost.thumbnailUrl = thumbnailUrl;
    }

    await this.postRepo.save(existingPost);

    return UpdatePostResponseDto.fromEntity(existingPost);
  }

  // 8. 특정 포스트 삭제
  async deletePost(id: number, user: CurrentUserDto) {
    const existingPost = await this.postRepo.findOne({
      where: { id },
    });

    if (!existingPost) {
      throw new NotFoundException(`Post with ID ${id} does not exist`);
    }

    const userRole = user?.role;
    if (!canCreateOrUpdatePost(existingPost.readPermission, userRole)) {
      throw new ForbiddenException(
        'You do not have permission to delete this post.',
      );
    }

    await this.postRepo.remove(existingPost);

    return DeletePostResponseDto.fromEntity(existingPost);
  }

  async findRelatedPosts(postId: number): Promise<PostListItemResponseDto[]> {
    const targetPost = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['tags', 'category', 'category.group'],
    });

    const tagIds = targetPost.tags.map((tag) => tag.id);
    const categoryId = targetPost.category.id;
    const groupId = targetPost.category.group.id;

    const query = this.postRepo
      .createQueryBuilder('post')
      .leftJoin('post.tags', 'tag')
      .leftJoin('post.category', 'category')
      .leftJoin('category.group', 'group')
      .where('post.id != :id', { id: postId }) // 자기 제외
      .andWhere('post.readPermission IS NULL') // 🔒 퍼블릭 제한 등 조건 넣어도 됨. => readPermission null인 것만 OK!
      .select('post.id', 'id') // id라는 컬럼으로 post.id 가져옴
      .addSelect('post.title', 'title') // title이라는 컬럼으로 post.title 가져옴
      .addSelect('post.previewText', 'previewText') // previewText이라는 컬럼으로 post.previewText 가져옴
      .addSelect('post.thumbnailUrl', 'thumbnailUrl') // previewText이라는 컬럼으로 post.previewText 가져옴
      .addSelect('post.createdAt', 'createdAt')
      .addSelect('category.label', 'categoryLabel') // 이미 leftJoin했으니 가능
      .addSelect('group.label', 'groupLabel') // 이미 leftJoin했으니 가능
      .addSelect('post.author', 'author')
      .addSelect('post.readPermission', 'readPermission')
      .addSelect(
        // 유사도 점수 계산: 태그 겹친 수 * 10 + 카테고리 일치 시 5점 + 그룹 일치 시 1점
        `
        COUNT(DISTINCT tag.id) * 10 +
        CASE WHEN category.id = :categoryId THEN 5 ELSE 0 END +
        CASE WHEN group.id = :groupId THEN 1 ELSE 0 END
        `, // DISTINCT는 중복을 허용하지 않는다는 뜻.
        'score',
      )
      .groupBy('post.id')
      .addGroupBy('category.id')
      .addGroupBy('group.id')
      .orderBy('score', 'DESC')
      .limit(3)
      .setParameters({ categoryId, groupId, tagIds });

    const relatedPosts = await query.getRawMany();

    return relatedPosts
      .sort((a, b) => b.score - a.score)
      .map((post) => ({ ...post, score: Number(post.score) }));
  }

  async findAdjacentPosts(postId: number, currentUser: CurrentUserDto | null) {
    const currentPost = await this.postRepo.findOne({
      where: { id: postId },
    });

    if (!currentPost) {
      throw new NotFoundException('Post not found');
    }

    const permissionCondition = getPermissionCondition(currentUser);

    // 이전/다음 포스트 조회
    const [prevPost, nextPost] = await Promise.all([
      this.postRepo.findOne({
        where: permissionCondition.map((condition) => ({
          id: LessThan(postId),
          ...condition,
        })),
        order: { id: 'DESC' },
      }),
      this.postRepo.findOne({
        where: permissionCondition.map((condition) => ({
          id: MoreThan(postId),
          ...condition,
        })),
        order: { id: 'ASC' },
      }),
    ]);

    return {
      previous: prevPost ? PostListItemResponseDto.fromEntity(prevPost) : null,
      next: nextPost ? PostListItemResponseDto.fromEntity(nextPost) : null,
    };
  }

  async addLikes(postId: number) {
    // 존재 여부 확인
    const existingPost = await this.postRepo.findOne({ where: { id: postId } });

    if (!existingPost) {
      throw new NotFoundException(`Post with ID ${postId} does not exist`);
    }

    // PostgreSQL에서 직접 증가 (동시성 안전)
    const result = await this.postRepo
      .createQueryBuilder()
      .update()
      .set({ likes: () => 'likes + 1' }) // ← 꼭 따옴표 필요: "likes"는 컬럼명. 원자성을 가지는 태스크
      .where('id = :id', { id: postId })
      .returning('likes') // PostgreSQL에서 현재 값 반환
      .execute();

    return { id: postId, likes: result.raw[0].likes };
  }

  async addView(postId: number) {
    const existingPost = await this.postRepo.findOne({ where: { id: postId } });

    if (!existingPost) {
      throw new NotFoundException(`Post with ID ${postId} does not exist`);
    }

    // PostgreSQL에서 직접 증가 (동시성 안전)
    const result = await this.postRepo
      .createQueryBuilder()
      .update() // 업데이트문으로 전환
      .set({ view: () => 'view + 1' }) // 업데이트할 컬럼과 업데이트 로직
      .where('id = :id', { id: postId })
      .returning('view') // 따로 select문을 쓰지 않아도 현재 값 반환. POSTGRESQL의 고유 문법
      .execute();

    return { id: postId, view: result.raw[0].view };
  }

  // post.service.ts
  async deletePostsByUserId(userId: number): Promise<number> {
    const result = await this.postRepo
      .createQueryBuilder()
      .delete()
      .where('authorId > :userId', { userId })
      .execute();

    return result.affected ?? 0;
  }
}
