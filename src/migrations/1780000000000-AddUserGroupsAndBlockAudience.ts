import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserGroupsAndBlockAudience1780000000000
  implements MigrationInterface
{
  name = 'AddUserGroupsAndBlockAudience1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // user_group_entity
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_group_entity" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(30) NOT NULL UNIQUE,
        "slug" VARCHAR(50) NOT NULL UNIQUE,
        "description" TEXT,
        "color" VARCHAR(20),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // user_group_membership_entity (composite PK)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_group_membership_entity" (
        "userId" INTEGER NOT NULL,
        "groupId" INTEGER NOT NULL,
        "addedAt" TIMESTAMP NOT NULL DEFAULT now(),
        PRIMARY KEY ("userId", "groupId"),
        CONSTRAINT "FK_user_group_membership_user"
          FOREIGN KEY ("userId") REFERENCES "user_entity"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_group_membership_group"
          FOREIGN KEY ("groupId") REFERENCES "user_group_entity"("id") ON DELETE CASCADE
      )
    `);

    // post_entity.defaultAudienceGroupIds (jsonb, default [])
    await queryRunner.query(`
      ALTER TABLE "post_entity"
      ADD COLUMN IF NOT EXISTS "defaultAudienceGroupIds" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    // post_entity.blockAudienceMap (jsonb, default {})
    await queryRunner.query(`
      ALTER TABLE "post_entity"
      ADD COLUMN IF NOT EXISTS "blockAudienceMap" jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "post_entity" DROP COLUMN IF EXISTS "blockAudienceMap"`,
    );
    await queryRunner.query(
      `ALTER TABLE "post_entity" DROP COLUMN IF EXISTS "defaultAudienceGroupIds"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "user_group_membership_entity"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_group_entity"`);
  }
}
