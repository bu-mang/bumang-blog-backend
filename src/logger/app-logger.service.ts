import { Injectable } from '@nestjs/common';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
// import { MetricsService } from 'src/metrics/metrics.service';

// src/logger/custom-logger.service.ts
@Injectable()
export class AppLoggerService {
  constructor(
    // app.module.ts에서 winstonConfig대로 등록했던 logger를 불러온다.
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    // private readonly metricsService: MetricsService,
  ) {}

  // 비즈니스 로직 로깅만 남기기
  logPost(
    action: string,
    postId?: number,
    userId?: number,
    title?: string,
    metadata?: any,
  ) {
    this.logger.info(`Post ${action}`, {
      action,
      postId,
      userId,
      title,
      metadata,
      category: 'blog_post',
    });

    // Prometheus 메트릭 (꺼 둠 — app.module.ts 주석 참고)
    // if (action === 'post_read' && postId) {
    //   this.metricsService.incrementPostViews(postId);
    // }
  }

  logAuth(
    action: string,
    userId?: number,
    email?: string,
    success: boolean = true,
    metadata?: any,
  ) {
    const level = success ? 'info' : 'warn';
    this.logger[level](`Auth ${action}`, {
      action,
      userId,
      email,
      success,
      metadata,
      category: 'auth',
    });

    // Prometheus 메트릭 (꺼 둠 — app.module.ts 주석 참고)
    // if (action.includes('login')) {
    //   this.metricsService.incrementAuthAttempts('login', success);
    // } else if (action.includes('signup')) {
    //   this.metricsService.incrementAuthAttempts('signup', success);
    // }
  }

  logUser(
    action: string,
    userId?: number,
    email?: string,
    success: boolean = true,
    metadata?: any,
  ) {
    const level = success ? 'info' : 'warn';
    this.logger[level](`User ${action}`, {
      action,
      userId,
      email,
      success,
      metadata,
      category: 'user',
    });
  }
}
