import { MigrationInterface, QueryRunner } from 'typeorm';

// 감사 로그에 시/도(region)·경유 엣지(colo)·유입 경로(referer) 추가.
// 전부 Cloudflare/브라우저 헤더에서 읽는 값이라 기존 행은 null로 남는다.
// dev는 synchronize가 잡고, 프로덕션은 이 마이그레이션으로 반영.
export class AddAuditRegionColoReferer1785000000000
  implements MigrationInterface
{
  name = 'AddAuditRegionColoReferer1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "login_attempt_entity"
        ADD COLUMN IF NOT EXISTS "region" VARCHAR(128),
        ADD COLUMN IF NOT EXISTS "colo" VARCHAR(8)
    `);
    await queryRunner.query(`
      ALTER TABLE "content_view_entity"
        ADD COLUMN IF NOT EXISTS "region" VARCHAR(128),
        ADD COLUMN IF NOT EXISTS "colo" VARCHAR(8),
        ADD COLUMN IF NOT EXISTS "referer" VARCHAR(512)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "content_view_entity"
        DROP COLUMN IF EXISTS "referer",
        DROP COLUMN IF EXISTS "colo",
        DROP COLUMN IF EXISTS "region"
    `);
    await queryRunner.query(`
      ALTER TABLE "login_attempt_entity"
        DROP COLUMN IF EXISTS "colo",
        DROP COLUMN IF EXISTS "region"
    `);
  }
}
