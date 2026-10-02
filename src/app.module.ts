import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { CategoriesModule } from './categories/categories.module';
import { CommentsModule } from './comments/comments.module';
import { AuthModule } from './auth/auth.module';
import { TagsModule } from './tags/tags.module';
import { S3Module } from './s3/s3.module';
import { AppDataSource } from './data-source';
import { TasksModule } from './tasks/tasks.module';
import { UserGroupsModule } from './user-groups/user-groups.module';
import { AuditModule } from './audit/audit.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CfThrottlerGuard } from './common/guard/cf-throttler.guard';

import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './logger/winston.config';
// Prometheus 지표 수집은 꺼 둔다(2026-10). 수집 서버(prometheus 컨테이너)를 내린 뒤에도
// 앱이 지표를 메모리에 계속 쌓고 있었다. 다시 켜려면 이 파일·main.ts·
// logging.interceptor.ts·logger/app-logger.{module,service}.ts의 주석을 함께 푼다.
// import { MetricsModule } from './metrics/metrics.module';
import { AppLoggerModule } from './logger/app-logger.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

@Module({
  imports: [
    // cron작업용 세팅
    ScheduleModule.forRoot(),
    // 전역 레이트리밋: 방문자 IP당 분당 300회. 페이지 하나가 API를 여러 번 부르므로
    // (본문·관련글·이전다음글·프로필) 사람이 닿을 수 없는 선에서 넉넉하게 잡는다.
    // 가입·로그인은 auth 컨트롤러의 @Throttle이 훨씬 강하게 덮어쓴다.
    // 예전엔 프론트 미들웨어가 같은 일을 메모리 Map으로 했는데 백엔드로 옮겼다.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 300 }]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    // 타입orm 세팅. postgres서버 만들 때 입력했던대로 제공
    TypeOrmModule.forRoot({
      ...AppDataSource.options,
    }),
    WinstonModule.forRoot(winstonConfig),

    UsersModule,
    PostsModule,
    CategoriesModule,
    CommentsModule,
    AuthModule,
    TagsModule,
    S3Module,
    TasksModule,
    UserGroupsModule,
    AuditModule,
    AppLoggerModule,
    // MetricsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LoggingInterceptor,
    // 모듈 설정만으로는 제한이 걸리지 않는다 — 가드를 전역 등록해야 실제로 동작한다.
    { provide: APP_GUARD, useClass: CfThrottlerGuard },
  ],
})
export class AppModule {}
