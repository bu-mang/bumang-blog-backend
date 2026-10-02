import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// 로그인 시도 감사 로그. 성공/실패 모두 기록한다.
// 보존은 AuditService가 최근 1000건으로 trim한다(무한 증식 차단).
@Entity('login_attempt_entity')
export class LoginAttemptEntity {
  @PrimaryGeneratedColumn()
  id: number;

  // 시도된 이메일. 존재하지 않는 계정이어도 그대로 저장한다(감사의 핵심).
  @Column({ length: 255 })
  email: string;

  // 성공/기존 계정이면 채우고, 없는 계정이면 null.
  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ default: false })
  success: boolean;

  // 실패 사유: 'user_not_found' | 'password_mismatch' | null(성공)
  @Column({ length: 40, nullable: true })
  failureReason: string | null;

  // 실제 방문자 IP (Cloudflare CF-Connecting-IP 우선). IPv6 대비 45자.
  @Column({ length: 45, nullable: true })
  ip: string | null;

  // 국가 코드 (Cloudflare CF-IPCountry, 예: KR/US, 'XX'·'T1' 등도 있음).
  @Column({ length: 8, nullable: true })
  country: string | null;

  // 시/도 (Cloudflare CF-Region, 대략적·비어있을 수 있음).
  @Column({ length: 128, nullable: true })
  region: string | null;

  // 도시 (Cloudflare CF-IPCity, 대략적·비어있을 수 있음).
  @Column({ length: 128, nullable: true })
  city: string | null;

  // 요청을 받은 Cloudflare 엣지 (CF-Ray 꼬리표, 예: ICN/LAX).
  @Column({ length: 8, nullable: true })
  colo: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
