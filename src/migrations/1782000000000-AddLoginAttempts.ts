import { MigrationInterface, QueryRunner } from 'typeorm';

// 로그인 시도 감사 로그 테이블. dev는 synchronize가 잡고, 프로덕션은 이 마이그레이션으로 생성.
export class AddLoginAttempts1782000000000 implements MigrationInterface {
  name = 'AddLoginAttempts1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "login_attempt_entity" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) NOT NULL,
        "userId" INTEGER,
        "success" BOOLEAN NOT NULL DEFAULT false,
        "failureReason" VARCHAR(40),
        "ip" VARCHAR(45),
        "country" VARCHAR(8),
        "city" VARCHAR(128),
        "userAgent" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_login_attempt_createdAt"
        ON "login_attempt_entity" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_login_attempt_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "login_attempt_entity"`);
  }
}
