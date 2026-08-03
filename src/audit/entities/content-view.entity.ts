import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// 로그인한 유저의 콘텐츠(포스트 상세) 조회 감사 로그.
// 익명 조회는 기록하지 않는다 — 볼륨이 자릿수로 커지고, 조회수 dedup과 역할이 겹친다.
// 보존은 TasksService의 자정 크론이 730일 기준으로 잘라낸다(트림 온 라이트 아님 —
// 로그인 시도와 달리 매 요청마다 count()를 도는 비용을 감당할 볼륨이 아니다).
@Entity('content_view_entity')
export class ContentViewEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  userId: number;

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
