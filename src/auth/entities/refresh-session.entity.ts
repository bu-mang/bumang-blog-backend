import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from 'src/users/entities/user.entity';

// 로그인 세션(기기 하나 = 행 하나). refresh 토큰의 서버 쪽 짝이다.
//
// 예전엔 users.refreshToken 컬럼 하나에 평문으로 넣어서, 두 번째 기기로 로그인하면 첫
// 기기의 토큰이 덮어써지고 그 기기의 다음 갱신이 불일치로 실패하며 두 기기가 모두
// 로그아웃됐다(2026-09 잦은 로그아웃). 세션을 행으로 나눠 기기끼리 서로 건드리지 않게 한다.
@Entity('refresh_session_entity')
export class RefreshSessionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  // refresh 토큰의 SHA-256. 토큰 원문은 저장하지 않는다 — DB가 유출돼도 로그인에 쓸 수 없다.
  // (토큰이 256비트 난수라 bcrypt 같은 느린 해시는 필요 없다.)
  @Index({ unique: true })
  @Column({ length: 64 })
  tokenHash: string;

  // 마지막 사용 시점 + REFRESH_TOKEN_TTL. 갱신할 때마다 밀린다.
  @Index()
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp' })
  lastUsedAt: Date;

  // "어느 기기의 세션인가"를 알아보기 위한 기록. 인증 판정에는 쓰지 않는다.
  @Column({ length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
