import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesEnum } from 'src/users/const/roles.const';
import { AuditService } from './audit.service';

// 감사 로그는 주인(host)만 열람한다.
@ApiBearerAuth()
@ApiTags('Audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolesEnum.HOST)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('login-attempts')
  @ApiOperation({ summary: '로그인 시도 감사 로그 조회 [HOST]' })
  findLoginAttempts(
    @Query('pageIndex') pageIndex?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const idx = Math.max(1, parseInt(pageIndex ?? '1', 10) || 1);
    const size = Math.min(
      100,
      Math.max(1, parseInt(pageSize ?? '50', 10) || 50),
    );
    return this.auditService.findRecent(idx, size);
  }
}
