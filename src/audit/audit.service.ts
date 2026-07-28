import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as geoip from 'geoip-lite';
import { LoginAttemptEntity } from './entities/login-attempt.entity';

export interface LoginAttemptInput {
  email: string;
  userId?: number | null;
  success: boolean;
  failureReason?: string | null;
  ip?: string | null;
  country?: string | null;
  userAgent?: string | null;
}

// 최근 N건만 유지 (무한 증식 차단 — 2026-07 디스크 포화 502 교훈의 연장선).
const MAX_LOGIN_ATTEMPTS = 1000;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(LoginAttemptEntity)
    private readonly repo: Repository<LoginAttemptEntity>,
  ) {}

  // 로그인 시도 기록.
  // ⚠️ 감사 저장 실패가 로그인 흐름 자체를 막으면 안 되므로 절대 throw하지 않는다.
  async recordLoginAttempt(input: LoginAttemptInput): Promise<void> {
    try {
      const city = input.ip ? geoip.lookup(input.ip)?.city || null : null;

      const attempt = this.repo.create({
        email: input.email,
        userId: input.userId ?? null,
        success: input.success,
        failureReason: input.failureReason ?? null,
        ip: input.ip ?? null,
        country: input.country ?? null,
        city: city && city.length > 0 ? city : null,
        userAgent: input.userAgent ?? null,
      });
      await this.repo.save(attempt);
      await this.trim();
    } catch (err) {
      this.logger.warn(`로그인 감사 기록 실패(로그인 흐름엔 영향 없음): ${err}`);
    }
  }

  // 오래된 로그를 잘라 최근 MAX_LOGIN_ATTEMPTS건만 남긴다.
  private async trim(): Promise<void> {
    const count = await this.repo.count();
    if (count <= MAX_LOGIN_ATTEMPTS) return;

    const excess = count - MAX_LOGIN_ATTEMPTS;
    const oldest = await this.repo.find({
      order: { createdAt: 'ASC', id: 'ASC' },
      take: excess,
      select: ['id'],
    });
    if (oldest.length > 0) {
      await this.repo.delete(oldest.map((o) => o.id));
    }
  }

  // host 조회용 페이지네이션 (최신순).
  async findRecent(pageIndex = 1, pageSize = 50) {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (pageIndex - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, pageIndex, pageSize };
  }
}
