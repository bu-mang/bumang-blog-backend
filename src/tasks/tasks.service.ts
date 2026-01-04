// tasks.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostsService } from 'src/posts/posts.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly postService: PostsService) {}

  // 매일 자정에 실행: USER 등급 유저의 글 삭제
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/seoul',
  })
  async handleDeletePosts() {
    const deletedCount = await this.postService.deletePostsByUserRole();
    this.logger.log(
      `🧹 Deleted ${deletedCount} posts from USER role members`,
    );
  }
}
