import { MigrationInterface, QueryRunner } from 'typeorm';

// 그룹·카테고리·태그에 slug(주소·코드 판정용 고정 키)를 추가한다.
// 주소는 `?categoryId=16` 대신 `?category=architecture`, 코드는 `label === 'Life'` 대신
// `slug === 'life'`로 판정한다. 화면 이름(label/title)은 바꿔도 되고 slug는 고정이다.
//
// 기존 행은 지금 이름에서 slug를 채운다 (src/common/util/slugify.ts와 같은 규칙).
// 영문이 하나도 없는 이름(예: 태그 '개미지표')은 '<접두어>-<id>', 겹치면 두 번째부터 '-<id>'.
// 운영 데이터의 실제 slug는 이 마이그레이션 뒤 분류 개편 SQL에서 새 이름에 맞춰 다시 정한다.
//
// 제약 이름은 TypeORM 기본 규칙(DefaultNamingStrategy.uniqueConstraintName)으로 계산한 값이다.
// dev는 synchronize가 스키마를 맞추는데, 이름이 같아야 synchronize가 제약을 지웠다 다시 만들지 않는다.
// (dev에서 기존 데이터가 있으면 synchronize만으로는 NOT NULL 칸을 못 붙인다 → 먼저 migration:run.)
const TABLES = [
  {
    table: 'group_entity',
    source: 'label',
    prefix: 'group',
    uq: 'UQ_20ca37e8ac134d356bd5e3a2d20',
  },
  {
    table: 'category_entity',
    source: 'label',
    prefix: 'category',
    uq: 'UQ_4bd5a4afa26650f75346238811b',
  },
  {
    table: 'tags_entity',
    source: 'title',
    prefix: 'tag',
    uq: 'UQ_4902e1a78e20345bb6316d5e26c',
  },
] as const;

export class AddTaxonomySlugs1787000000000 implements MigrationInterface {
  name = 'AddTaxonomySlugs1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const { table, source, prefix, uq } of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "slug" character varying`,
      );

      // 1) 이름에서 만든다: 소문자 → 영문·숫자 외 연속 구간은 '-' 하나로 → 양끝 '-' 제거
      await queryRunner.query(`
        UPDATE "${table}"
        SET "slug" = NULLIF(btrim(regexp_replace(lower("${source}"), '[^a-z0-9]+', '-', 'g'), '-'), '')
        WHERE "slug" IS NULL
      `);
      // 2) 영문이 없어 비었으면 '<접두어>-<id>'
      await queryRunner.query(
        `UPDATE "${table}" SET "slug" = '${prefix}-' || "id" WHERE "slug" IS NULL`,
      );
      // 3) 겹치면 두 번째부터 '-<id>'를 붙인다
      await queryRunner.query(`
        UPDATE "${table}" AS t
        SET "slug" = t."slug" || '-' || t."id"
        FROM (
          SELECT "id", row_number() OVER (PARTITION BY "slug" ORDER BY "id") AS rn
          FROM "${table}"
        ) AS d
        WHERE d."id" = t."id" AND d.rn > 1
      `);

      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "slug" SET NOT NULL`,
      );
      await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${uq}') THEN
            ALTER TABLE "${table}" ADD CONSTRAINT "${uq}" UNIQUE ("slug");
          END IF;
        END $$
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const { table, uq } of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${uq}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "slug"`,
      );
    }
  }
}
