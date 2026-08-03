import { MigrationInterface, QueryRunner } from 'typeorm';

// 로그인 유저의 콘텐츠 조회 감사 로그 테이블.
// dev는 synchronize가 잡고, 프로덕션은 이 마이그레이션으로 생성.
export class AddContentViews1783000000000 implements MigrationInterface {
  name = 'AddContentViews1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "content_view_entity" (
        "id" SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "userEmail" VARCHAR(255),
        "postId" INTEGER NOT NULL,
        "postTitle" VARCHAR(255),
        "denied" BOOLEAN NOT NULL DEFAULT false,
        "maskedBlockCount" INTEGER NOT NULL DEFAULT 0,
        "ip" VARCHAR(45),
        "country" VARCHAR(8),
        "city" VARCHAR(128),
        "userAgent" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    // 목록은 최신순 페이지네이션이라 createdAt이 핵심.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_content_view_createdAt"
        ON "content_view_entity" ("createdAt")
    `);
    // "이 사람이 뭘 봤나" / "이 글을 누가 봤나" 필터용.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_content_view_userId"
        ON "content_view_entity" ("userId")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_content_view_postId"
        ON "content_view_entity" ("postId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_content_view_postId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_content_view_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_content_view_createdAt"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "content_view_entity"`);
  }
}
