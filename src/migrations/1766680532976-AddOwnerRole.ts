import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnerRole1766680532976 implements MigrationInterface {
  name = 'AddOwnerRole1766680532976';

  // ALTER TYPE ADD VALUE는 트랜잭션 내에서 실행할 수 없으므로 transaction: false 설정
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // user_entity의 role enum에 'owner' 추가
    await queryRunner.query(
      `ALTER TYPE "public"."user_entity_role_enum" ADD VALUE IF NOT EXISTS 'owner'`,
    );

    // post_entity의 readPermission enum에 'owner' 추가
    await queryRunner.query(
      `ALTER TYPE "public"."post_entity_readpermission_enum" ADD VALUE IF NOT EXISTS 'owner'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL은 enum 값 제거를 직접 지원하지 않음
    // enum 값을 제거하려면 enum 타입을 재생성해야 함
    // 롤백 시 기존 값('admin', 'user')만 남기고 enum 타입을 재생성

    // 1. 임시 컬럼 생성
    await queryRunner.query(
      `ALTER TABLE "user_entity" ADD COLUMN "role_old" "public"."user_entity_role_enum"`,
    );
    await queryRunner.query(
      `UPDATE "user_entity" SET "role_old" = "role" WHERE "role" IN ('admin', 'user')`,
    );

    // 2. 기존 컬럼 삭제
    await queryRunner.query(`ALTER TABLE "user_entity" DROP COLUMN "role"`);

    // 3. enum 타입 삭제 및 재생성
    await queryRunner.query(`DROP TYPE "public"."user_entity_role_enum"`);
    await queryRunner.query(
      `CREATE TYPE "public"."user_entity_role_enum" AS ENUM('admin', 'user')`,
    );

    // 4. 컬럼 재생성
    await queryRunner.query(
      `ALTER TABLE "user_entity" ADD COLUMN "role" "public"."user_entity_role_enum" NOT NULL DEFAULT 'user'`,
    );
    await queryRunner.query(
      `UPDATE "user_entity" SET "role" = "role_old" WHERE "role_old" IS NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "user_entity" DROP COLUMN "role_old"`);

    // post_entity의 readPermission도 동일하게 처리
    await queryRunner.query(
      `ALTER TABLE "post_entity" ADD COLUMN "readPermission_old" "public"."post_entity_readpermission_enum"`,
    );
    await queryRunner.query(
      `UPDATE "post_entity" SET "readPermission_old" = "readPermission" WHERE "readPermission" IN ('admin', 'user')`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_entity" DROP COLUMN "readPermission"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."post_entity_readpermission_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."post_entity_readpermission_enum" AS ENUM('admin', 'user')`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_entity" ADD COLUMN "readPermission" "public"."post_entity_readpermission_enum"`,
    );
    await queryRunner.query(
      `UPDATE "post_entity" SET "readPermission" = "readPermission_old" WHERE "readPermission_old" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_entity" DROP COLUMN "readPermission_old"`,
    );
  }
}
