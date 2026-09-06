import { MigrationInterface, QueryRunner } from 'typeorm';

// 익명(비로그인) 콘텐츠 조회도 감사 로그에 남기기 위해 userId를 nullable로 완화한다.
// null = 비로그인 방문자. dev는 synchronize가 잡고, 프로덕션은 이 마이그레이션으로 반영.
export class AllowAnonymousContentViews1784000000000
  implements MigrationInterface
{
  name = 'AllowAnonymousContentViews1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "content_view_entity"
        ALTER COLUMN "userId" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // NOT NULL을 되돌리려면 그 사이 쌓인 익명 레코드부터 치워야 한다
    // (남아 있으면 ALTER가 실패한다). 롤백은 익명 로그 폐기를 뜻한다.
    await queryRunner.query(`
      DELETE FROM "content_view_entity" WHERE "userId" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "content_view_entity"
        ALTER COLUMN "userId" SET NOT NULL
    `);
  }
}
