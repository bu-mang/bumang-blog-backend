import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostClientRequestId1778670000000 implements MigrationInterface {
  name = 'AddPostClientRequestId1778670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 멱등 키 컬럼 추가 (기존 행은 NULL)
    await queryRunner.query(
      `ALTER TABLE "post_entity" ADD COLUMN IF NOT EXISTS "clientRequestId" uuid`,
    );
    // unique 제약 (Postgres는 NULL 중복을 허용하므로 기존 데이터에 영향 없음)
    await queryRunner.query(
      `ALTER TABLE "post_entity" ADD CONSTRAINT "UQ_post_entity_client_request_id" UNIQUE ("clientRequestId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post_entity" DROP CONSTRAINT IF EXISTS "UQ_post_entity_client_request_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_entity" DROP COLUMN IF EXISTS "clientRequestId"`,
    );
  }
}
