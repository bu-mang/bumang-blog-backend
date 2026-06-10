import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 역할/권한 계층 enum 값 리네임: user→guest, admin→member, owner→host.
 * PostgreSQL의 ALTER TYPE ... RENAME VALUE 는 라벨만 바꾸므로 기존 행 데이터가
 * 자동으로 갱신되며, 컬럼 default(enum 값 참조)도 그대로 유지된다.
 * RENAME VALUE 는 트랜잭션 내 실행 가능(PG12+)하므로 별도 transaction=false 불필요.
 */
export class RenameRoleValues1781000000000 implements MigrationInterface {
  name = 'RenameRoleValues1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const type of [
      'user_entity_role_enum',
      'post_entity_readpermission_enum',
    ]) {
      await queryRunner.query(
        `ALTER TYPE "public"."${type}" RENAME VALUE 'user' TO 'guest'`,
      );
      await queryRunner.query(
        `ALTER TYPE "public"."${type}" RENAME VALUE 'admin' TO 'member'`,
      );
      await queryRunner.query(
        `ALTER TYPE "public"."${type}" RENAME VALUE 'owner' TO 'host'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const type of [
      'user_entity_role_enum',
      'post_entity_readpermission_enum',
    ]) {
      await queryRunner.query(
        `ALTER TYPE "public"."${type}" RENAME VALUE 'guest' TO 'user'`,
      );
      await queryRunner.query(
        `ALTER TYPE "public"."${type}" RENAME VALUE 'member' TO 'admin'`,
      );
      await queryRunner.query(
        `ALTER TYPE "public"."${type}" RENAME VALUE 'host' TO 'owner'`,
      );
    }
  }
}
