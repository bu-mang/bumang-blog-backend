// tasks.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostsService } from 'src/posts/posts.service';
import { AuditService } from 'src/audit/audit.service';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly postService: PostsService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
  ) {}

  // 매일 자정에 실행: USER 등급 유저의 글 삭제
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async handleDeletePosts() {
    const deletedCount = await this.postService.deletePostsByUserRole();
    this.logger.log(`🧹 Deleted ${deletedCount} posts from USER role members`);
  }

  // 매일 자정에 실행: 보존기간(730일) 지난 콘텐츠 조회 감사 로그 삭제.
  // 배치 실패가 다른 크론을 죽이지 않도록 예외를 여기서 삼킨다.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async handlePurgeContentViews() {
    try {
      const purged = await this.auditService.purgeOldContentViews();
      if (purged > 0) {
        this.logger.log(`🧹 Purged ${purged} content view logs (730일 초과)`);
      }
    } catch (err) {
      this.logger.warn(`콘텐츠 조회 로그 정리 실패: ${err}`);
    }
  }

  // 매일 자정에 실행: 만료된 로그인 세션(refresh 토큰) 삭제.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Asia/Seoul',
  })
  async handlePurgeExpiredSessions() {
    try {
      const purged = await this.authService.purgeExpiredSessions();
      if (purged > 0) {
        this.logger.log(`🧹 Purged ${purged} expired login sessions`);
      }
    } catch (err) {
      this.logger.warn(`만료 세션 정리 실패: ${err}`);
    }
  }
}
