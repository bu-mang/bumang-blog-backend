import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

import { UsersModule } from 'src/users/users.module';
import { PostsModule } from 'src/posts/posts.module';
import { CommentsModule } from 'src/comments/comments.module';
import { IsOwnerGuard } from './guards/is-owner.guard';
import { AppLoggerModule } from 'src/logger/app-logger.module';
import { AuditModule } from 'src/audit/audit.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshSessionEntity } from './entities/refresh-session.entity';
import { ACCESS_TOKEN_TTL_SEC } from './const/token.const';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshSessionEntity]),
    AppLoggerModule,
    forwardRef(() => UsersModule), // 순환참조 방지 지연 로딩
    forwardRef(() => PostsModule), // 순환참조 방지 지연 로딩
    forwardRef(() => CommentsModule), // 순환참조 방지 지연 로딩
    forwardRef(() => AuditModule), // AuthService가 감사 기록에 AuditService 사용
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: ACCESS_TOKEN_TTL_SEC },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // 커스텀
    RolesGuard,
    IsOwnerGuard,
  ],
  // AuthService는 TasksService(만료 세션 정리 크론)가 쓴다.
  exports: [AuthService, JwtStrategy, RolesGuard, IsOwnerGuard],
})
export class AuthModule {}
