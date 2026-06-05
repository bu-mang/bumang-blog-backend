import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Post의 글 단위 default audience 컬럼 제거.
 * audience 모델을 "블록 단위 매핑"으로 단순화.
 */
export class DropPostDefaultAudienceGroupIds1780000100000
  implements MigrationInterface
{
  name = 'DropPostDefaultAudienceGroupIds1780000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post_entity" DROP COLUMN IF EXISTS "defaultAudienceGroupIds"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post_entity" ADD COLUMN IF NOT EXISTS "defaultAudienceGroupIds" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }
}
