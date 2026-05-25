import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostSoftDelete1779753600000 implements MigrationInterface {
  name = 'AddPostSoftDelete1779753600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // soft delete 컬럼 추가 (기존 행은 NULL = 살아있는 상태)
    await queryRunner.query(
      `ALTER TABLE "post_entity" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post_entity" DROP COLUMN IF EXISTS "deletedAt"`,
    );
  }
}
