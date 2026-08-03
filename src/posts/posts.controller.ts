import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesEnum } from 'src/users/const/roles.const';
import { IsOwner } from 'src/auth/decorators/is-owner.decorator';
import { IsOwnerGuard } from 'src/auth/guards/is-owner.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PostListItemResponseDto } from './dto/post-list-item-response.dto';
import { PaginatedResponseDto } from 'src/common/dto/pagenated-response.dto';
import { CreatePostResponseDto } from './dto/create-post-response.dto';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { CurrentUserDto } from 'src/common/dto/current-user.dto';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt.guard';
import { FindPostsQueryDto } from './dto/find-posts-query.dto';
import { AuditService } from 'src/audit/audit.service';
import { extractRequestMeta } from 'src/common/util/request-meta.util';

@ApiBearerAuth()
@ApiTags('Posts') // Swagger UI 그룹 이름
@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('test')
  @ApiExcludeEndpoint() // 스웨거에 제외
  getHealthCheck() {
    return [{ id: 1, title: '0426 05:28PM' }];
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: '모든 게시글 조회',
    description: 'DB에 있는 모든 게시글 목록을 반환합니다.',
  })
  async findAllPosts(
    @Query() query: FindPostsQueryDto,
    // @CurrentUser() user?: CurrentUserDto,
  ): Promise<PaginatedResponseDto<PostListItemResponseDto>> {
    return await this.postsService.findPosts(query.pageIndex, query.pageSize, {
      groupId: query.groupId,
      categoryId: query.categoryId,
      tagIds: query.tagIds,
      type: query.type,
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolesEnum.MEMBER, RolesEnum.GUEST)
  @ApiOperation({
    summary: '게시글 생성',
    description: 'DB에 게시글을 저장합니다.',
  })
  @ApiBody({ type: CreatePostDto }) // 요청 바디 스웨거 문서
  @ApiCreatedResponse({ type: CreatePostResponseDto }) // 201 Created용 스웨거 데코레이터
  async createPost(
    @Body() createPostDto: CreatePostDto,
    @CurrentUser() user?: CurrentUserDto,
  ): Promise<CreatePostResponseDto> {
    return await this.postsService.createPost(createPostDto, user || null);
  }

  @Get(':id')
  @ApiOperation({
    summary: '게시글 상세 조회',
    description: '특정 게시글을 상세 조회합니다.',
  })
  @UseGuards(OptionalJwtAuthGuard)
  async findPostDetail(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: CurrentUserDto,
  ) {
    // 감사 기록은 로그인 유저만. 익명 조회는 볼륨이 자릿수로 커져서 제외한다.
    // 저장을 await하지 않는 이유: 이 핸들러는 매 페이지 로드(SSR·새로고침 포함)마다
    // 돌기 때문에 DB 왕복을 응답 지연에 얹지 않는다. recordContentView는 throw하지 않는다.
    try {
      const post = await this.postsService.findPostDetail(id, user || null);

      if (user) {
        void this.auditService.recordContentView({
          userId: user.userId,
          userEmail: user.email,
          postId: id,
          postTitle: post.title,
          denied: false,
          maskedBlockCount: post.maskedBlockIds?.length ?? 0,
          ...extractRequestMeta(req),
        });
      }

      return post;
    } catch (err) {
      // 권한 미달로 막힌 시도야말로 감사 가치가 가장 높다. 없는 글(404)은 기록하지 않는다.
      if (user && err instanceof ForbiddenException) {
        void this.auditService.recordContentView({
          userId: user.userId,
          userEmail: user.email,
          postId: id,
          denied: true,
          ...extractRequestMeta(req),
        });
      }
      throw err;
    }
  }

  @Get(':id/related')
  @ApiOperation({
    summary: '관련된 포스트 조회',
    description: '특정 게시물에 관련된 포스트를 세 개 조회합니다.',
  })
  async findRelatedPosts(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PostListItemResponseDto[]> {
    return await this.postsService.findRelatedPosts(id);
  }

  @Get(':id/adjacent')
  @ApiOperation({
    summary: '인접 포스트 조회',
    description: '특정 게시물의 인접 포스트를 조회합니다.',
  })
  @UseGuards(OptionalJwtAuthGuard)
  async findAdjacentPosts(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: CurrentUserDto,
  ): Promise<{
    previous: PostListItemResponseDto;
    next: PostListItemResponseDto;
  }> {
    return await this.postsService.findAdjacentPosts(id, user || null);
  }

  @UseGuards(JwtAuthGuard, IsOwnerGuard)
  @IsOwner('post')
  @Patch(':id')
  @ApiOperation({
    summary: '게시글 수정',
    description: '특정 게시글을 수정합니다.',
  })
  async updatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser() user?: CurrentUserDto,
  ) {
    return await this.postsService.updatePost(id, updatePostDto, user || null);
  }

  @UseGuards(JwtAuthGuard, IsOwnerGuard)
  @IsOwner('post')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: '게시글 삭제',
    description: '특정 게시글을 삭제합니다.',
  })
  async removeOnePost(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: CurrentUserDto,
  ) {
    return await this.postsService.deletePost(id, user || null);
  }

  @Post(':id/likes')
  @ApiOperation({
    summary: '좋아요 추가',
    description: '특정 게시물의 좋아요를 추가합니다.',
  })
  async addLikes(@Param('id', ParseIntPipe) id: number) {
    return await this.postsService.addLikes(id);
  }

  @Post(':id/view')
  @ApiOperation({
    summary: '조회수 추가',
    description: '특정 게시물의 조회수를 추가합니다.',
  })
  async addView(@Param('id', ParseIntPipe) id: number) {
    return await this.postsService.addView(id);
  }
}
