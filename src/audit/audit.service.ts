import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as geoip from 'geoip-lite';
import { LoginAttemptEntity } from './entities/login-attempt.entity';
import { ContentViewEntity } from './entities/content-view.entity';

export interface LoginAttemptInput {
  email: string;
  userId?: number | null;
  success: boolean;
  failureReason?: string | null;
  ip?: string | null;
  country?: string | null;
  userAgent?: string | null;
}

export interface ContentViewInput {
  userId: number;
  userEmail?: string | null;
  postId: number;
  postTitle?: string | null;
  denied?: boolean;
  maskedBlockCount?: number;
  ip?: string | null;
  country?: string | null;
  userAgent?: string | null;
}

// 최근 N건만 유지 (무한 증식 차단 — 2026-07 디스크 포화 502 교훈의 연장선).
const MAX_LOGIN_ATTEMPTS = 1000;

// 콘텐츠 조회 로그 보존 기간. 로그인 유저 한정이라 볼륨이 낮아 건수 캡 대신 기간으로 간다
// ("언제부터의 기록인가"가 예측 가능해서 감사 로그로선 이쪽이 유용하다).
const CONTENT_VIEW_RETENTION_DAYS = 730;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(LoginAttemptEntity)
    private readonly repo: Repository<LoginAttemptEntity>,
    @InjectRepository(ContentViewEntity)
    private readonly contentViewRepo: Repository<ContentViewEntity>,
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

  // 로그인 유저의 콘텐츠 조회 기록.
  // ⚠️ 감사 저장 실패가 글 조회 자체를 막으면 안 되므로 절대 throw하지 않는다.
  //    호출부는 await하지 않는다(매 요청에 얹히는 지연을 피하려고) — 그래서 여기서
  //    모든 예외를 삼키지 않으면 unhandled rejection이 된다.
  async recordContentView(input: ContentViewInput): Promise<void> {
    try {
      const city = input.ip ? geoip.lookup(input.ip)?.city || null : null;

      const view = this.contentViewRepo.create({
        userId: input.userId,
        userEmail: input.userEmail?.slice(0, 255) ?? null,
        postId: input.postId,
        postTitle: input.postTitle?.slice(0, 255) ?? null,
        denied: input.denied ?? false,
        maskedBlockCount: input.maskedBlockCount ?? 0,
        ip: input.ip ?? null,
        country: input.country ?? null,
        city: city && city.length > 0 ? city : null,
        userAgent: input.userAgent ?? null,
      });
      await this.contentViewRepo.save(view);
    } catch (err) {
      this.logger.warn(`콘텐츠 조회 감사 기록 실패(조회엔 영향 없음): ${err}`);
    }
  }

  // 보존 기간(730일)이 지난 조회 로그를 지운다. TasksService의 자정 크론이 호출.
  // 로그인 시도의 trim-on-write와 달리 배치로 도는 이유는 볼륨 차이 —
  // 매 조회마다 count()를 도는 건 낭비다.
  async purgeOldContentViews(): Promise<number> {
    const cutoff = new Date(
      Date.now() - CONTENT_VIEW_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const result = await this.contentViewRepo.delete({
      createdAt: LessThan(cutoff),
    });
    return result.affected ?? 0;
  }

  // host 조회용 페이지네이션 (최신순).
  async findRecentContentViews(pageIndex = 1, pageSize = 50) {
    const [items, total] = await this.contentViewRepo.findAndCount({
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (pageIndex - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, pageIndex, pageSize };
  }
}
