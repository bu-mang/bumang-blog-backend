import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { LoginAttemptEntity } from './entities/login-attempt.entity';
import { ContentViewEntity } from './entities/content-view.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoginAttemptEntity, ContentViewEntity]),
    // 컨트롤러 가드(RolesGuard)를 AuthModule에서 가져온다.
    // AuthModule도 AuditService를 쓰므로 상호 순환 → forwardRef로 해소.
    forwardRef(() => AuthModule),
  ],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
