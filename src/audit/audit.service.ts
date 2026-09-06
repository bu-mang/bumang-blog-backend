import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as geoip from 'geoip-lite';
import { LoginAttemptEntity } from './entities/login-attempt.entity';
import { ContentViewEntity } from './entities/content-view.entity';
import { isBotUserAgent } from 'src/common/util/request-meta.util';

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
  // null이면 비로그인 방문자.
  userId: number | null;
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

// 콘텐츠 조회 로그 보존 기간. "언제부터의 기록인가"가 예측 가능해서 감사 로그로선 유용하다.
// 다만 기간 캡만으로는 크기가 안 잡힌다 — 오늘 폭증한 분량은 730일 동안 그대로 남는다.
// 그래서 아래 건수 캡을 함께 둔다(기간 캡=정상 운영용, 건수 캡=사고 방지용).
const CONTENT_VIEW_RETENTION_DAYS = 730;

// 콘텐츠 조회 로그 상한. 정상 트래픽으로는 몇 년이 걸려도 닿지 않고, 폭주 시에만 걸리는
// 천장으로 잡는다. 목적은 디스크 포화로 DB 쓰기가 막혀 API가 통째로 죽는 것 방지
// (2026-07 디스크 포화 502 교훈).
const MAX_CONTENT_VIEWS = 3_000_000;

// 상한 검사 확률. 매 조회마다 count()를 도는 건 낭비라, 평균 이 빈도로만 검사한다.
// 폭주 시엔 요청이 많으므로 금방 걸리고, 평시엔 사실상 비용이 없다.
const CONTENT_VIEW_TRIM_SAMPLE_RATE = 1 / 1000;

// 같은 방문자가 같은 글을 이 창 안에 다시 열면 로그를 남기지 않는다.
// 새로고침·뒤로가기·SSR 재요청이 한 줄로 접히고, 반복 요청 폭주도 크게 눌린다.
const CONTENT_VIEW_DEDUP_WINDOW_MS = 10 * 60 * 1000;

// 중복 억제 맵의 엔트리 상한. 넘으면 만료분을 청소하고, 그래도 넘치면 통째로 비운다
// (비워도 손해는 "로그가 조금 더 남는 것"뿐이라 안전한 방향의 실패다).
const DEDUP_MAX_ENTRIES = 50_000;

// 상한 초과분을 한 번에 지우는 최대 건수. 초과분이 수백만이어도 DELETE 한 방이
// 테이블을 오래 잠그지 않도록 나눠 지운다. 남은 분량은 다음 표본에서 이어서 지운다.
const TRIM_BATCH_SIZE = 50_000;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  // 최근 조회 기록(중복 억제용). key -> 마지막 기록 시각(ms).
  // 프로세스 로컬이라 재시작·다중 인스턴스에서 느슨해지지만, 그 방향은 안전하다.
  private readonly recentContentViews = new Map<string, number>();

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

  // 콘텐츠 조회 기록(익명 포함).
  // ⚠️ 감사 저장 실패가 글 조회 자체를 막으면 안 되므로 절대 throw하지 않는다.
  //    호출부는 await하지 않는다(매 요청에 얹히는 지연을 피하려고) — 그래서 여기서
  //    모든 예외를 삼키지 않으면 unhandled rejection이 된다.
  async recordContentView(input: ContentViewInput): Promise<void> {
    try {
      // 크롤러는 감사 가치가 없고 볼륨만 키운다.
      if (isBotUserAgent(input.userAgent)) return;

      // 같은 방문자가 짧은 시간에 같은 글을 다시 연 것은 한 줄로 접는다.
      if (this.isDuplicateContentView(input)) return;

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

      // 상한 검사는 매번이 아니라 표본으로만. 폭주 시엔 요청량 자체가 많아 금방 걸린다.
      if (Math.random() < CONTENT_VIEW_TRIM_SAMPLE_RATE) {
        await this.trimContentViews();
      }
    } catch (err) {
      this.logger.warn(`콘텐츠 조회 감사 기록 실패(조회엔 영향 없음): ${err}`);
    }
  }

  /**
   * 같은 방문자(IP)가 같은 글을 최근에 이미 열었는가.
   *
   * 프로세스 메모리에만 둔다. 재시작하거나 인스턴스가 여럿이면 억제가 느슨해지는데,
   * 그 방향의 실패는 "로그가 몇 줄 더 남는 것"이라 안전하다. 반대로 과하게 억제해
   * 기록이 사라지는 일은 구조상 일어나지 않는다.
   *
   * denied를 키에 넣는 이유: 권한이 풀려 403 → 정상 열람으로 바뀐 순간은 감사 가치가
   * 높아서 창 안이라도 따로 남겨야 한다.
   */
  private isDuplicateContentView(
    input: ContentViewInput,
    now = Date.now(),
  ): boolean {
    const key = [
      input.ip ?? '-',
      input.postId,
      input.userId ?? 'anon',
      input.denied ? 'd' : 'v',
    ].join('|');

    const last = this.recentContentViews.get(key);
    if (last !== undefined && now - last < CONTENT_VIEW_DEDUP_WINDOW_MS) {
      return true;
    }

    this.recentContentViews.set(key, now);
    this.pruneDedupCache(now);
    return false;
  }

  private pruneDedupCache(now: number): void {
    if (this.recentContentViews.size <= DEDUP_MAX_ENTRIES) return;

    for (const [key, ts] of this.recentContentViews) {
      if (now - ts >= CONTENT_VIEW_DEDUP_WINDOW_MS) {
        this.recentContentViews.delete(key);
      }
    }
    // 만료분을 다 걷어내고도 상한을 넘으면(짧은 시간에 고유 키가 폭증) 통째로 비운다.
    if (this.recentContentViews.size > DEDUP_MAX_ENTRIES) {
      this.recentContentViews.clear();
    }
  }

  // 상한을 넘은 만큼 오래된 것부터 잘라낸다. 기간 캡(자정 크론)이 못 막는
  // "오늘 안에 폭증한 분량"을 여기서 막는다.
  //
  // 로그인 시도의 trim()처럼 id를 전부 읽어 IN 절로 지우지 않는 이유: 상한이 300만이라
  // 초과분이 수십만~수백만이 될 수 있고, 그러면 id 배열이 메모리를 먹고 IN 절도 감당이
  // 안 된다. 그래서 서브쿼리 한 방으로 DB 안에서 지우고, 한 번에 지우는 양도 제한한다
  // (덜 지워도 다음 표본에서 이어서 지운다 — 요청이 몰릴수록 표본도 자주 뽑힌다).
  private async trimContentViews(): Promise<void> {
    const count = await this.contentViewRepo.count();
    if (count <= MAX_CONTENT_VIEWS) return;

    const excess = Math.min(count - MAX_CONTENT_VIEWS, TRIM_BATCH_SIZE);
    await this.contentViewRepo.query(
      `DELETE FROM "content_view_entity"
       WHERE "id" IN (
         SELECT "id" FROM "content_view_entity"
         ORDER BY "createdAt" ASC, "id" ASC
         LIMIT $1
       )`,
      [excess],
    );

    this.logger.warn(
      `콘텐츠 조회 로그 상한(${MAX_CONTENT_VIEWS}) 초과 — 오래된 ${excess}건 삭제 (조회 당시 ${count}건)`,
    );
  }

  // 보존 기간(730일)이 지난 조회 로그를 지운다. TasksService의 자정 크론이 호출.
  // 기간 정리는 급하지 않아 배치로 돈다 — 매 조회마다 도는 건 낭비다.
  // 크기 상한은 별도로 trimContentViews()가 표본 검사로 지킨다(크론 사이 폭주 대비).
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
