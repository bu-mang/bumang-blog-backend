import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// 콘텐츠(포스트 상세) 조회 감사 로그.
// 2026-09: 익명 조회도 기록하도록 확장했다(그 전까지는 로그인 유저 한정).
// ⚠️ 보존 전략의 전제가 이때 깨졌다 — TasksService의 자정 크론이 730일로 잘라내는데,
// 그 기간 캡은 "로그인 유저 한정이라 볼륨이 낮다"를 전제로 고른 값이었다. 익명이
// 포함되면 볼륨이 자릿수로 커지므로 건수 캡 병행을 검토해야 한다(2026-07 디스크 포화 502).
@Entity('content_view_entity')
export class ContentViewEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // null이면 비로그인 방문자. 익명 조회를 기록하기 시작하며 nullable로 바뀌었다.
  @Index()
  @Column({ type: 'int', nullable: true })
  userId: number | null;

  // 스냅샷. 유저가 탈퇴하거나 이메일을 바꿔도 로그는 그대로 남아야 한다
  // (login_attempt가 email을 그대로 저장하는 것과 같은 이유).
  @Column({ length: 255, nullable: true })
  userEmail: string | null;

  @Index()
  @Column({ type: 'int' })
  postId: number;

  // 스냅샷. 글이 삭제·제목 변경돼도 "그때 무엇을 봤는지"가 남는다.
  @Column({ length: 255, nullable: true })
  postTitle: string | null;

  // readPermission 미달로 403을 받은 시도. 이 블로그에서 가장 감사 가치가 높은 신호다.
  @Column({ default: false })
  denied: boolean;

  // audience 불일치로 마스킹된 블록 수. 0이면 전문을 다 본 것.
  @Column({ type: 'int', default: 0 })
  maskedBlockCount: number;

  // 실제 방문자 IP (Cloudflare CF-Connecting-IP 우선). IPv6 대비 45자.
  @Column({ length: 45, nullable: true })
  ip: string | null;

  // 국가 코드 (Cloudflare CF-IPCountry, 예: KR/US).
  @Column({ length: 8, nullable: true })
  country: string | null;

  // 도시 (geoip-lite, 대략적·비어있을 수 있음).
  @Column({ length: 128, nullable: true })
  city: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
