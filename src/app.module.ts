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

import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './logger/winston.config';
import { MetricsModule } from './metrics/metrics.module';
import { AppLoggerModule } from './logger/app-logger.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';

@Module({
  imports: [
    // cron작업용 세팅
    ScheduleModule.forRoot(),
    // 전역 기본 레이트리밋(느슨). 강한 제한은 auth 컨트롤러에서 @Throttle로 별도 적용
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
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
    AppLoggerModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService, LoggingInterceptor],
})
export class AppModule {}
