import { MigrationInterface, QueryRunner } from 'typeorm';

// 기기별 로그인 세션 테이블. refresh 토큰을 users.refreshToken(계정당 1개·평문) 대신
// 여기에 해시로 저장한다. dev는 synchronize가 잡고, 프로덕션은 이 마이그레이션으로 생성.
//
// user_entity.refreshToken 컬럼은 여기서 지우지 않는다 — 배포 중에는 이 마이그레이션이
// 끝난 뒤에도 구버전 앱이 잠깐 요청을 받는데, 구버전은 그 컬럼을 SELECT하므로 지우면
// 교체되는 동안 유저 조회가 전부 실패한다. 코드에서 더는 쓰지 않으니 정리는 다음에 따로.
export class AddRefreshSessions1786000000000 implements MigrationInterface {
  name = 'AddRefreshSessions1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_session_entity" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "user_entity"("id") ON DELETE CASCADE,
        "tokenHash" VARCHAR(64) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "lastUsedAt" TIMESTAMP NOT NULL,
        "ip" VARCHAR(45),
        "userAgent" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_refresh_session_tokenHash"
        ON "refresh_session_entity" ("tokenHash")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_session_userId"
        ON "refresh_session_entity" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_refresh_session_expiresAt"
        ON "refresh_session_entity" ("expiresAt")
    `);
    // 예전 방식으로 저장돼 있던 평문 토큰은 이제 쓸 수 없으니 비운다.
    await queryRunner.query(
      `UPDATE "user_entity" SET "refreshToken" = NULL WHERE "refreshToken" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_session_entity"`);
  }
}
