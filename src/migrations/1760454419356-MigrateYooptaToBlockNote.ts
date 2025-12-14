import { MigrationInterface, QueryRunner } from 'typeorm';
import { convertYooptaToBlockNote } from '../utils/yoopta-to-blocknote-converter';

export class MigrateYooptaToBlockNote1760454419356
  implements MigrationInterface
{
  /**
   * 컨텐츠 포맷 감지
   */
  private detectContentFormat(
    content: string,
  ): 'blocknote' | 'yoopta' | 'unknown' {
    if (!content || content.trim() === '') {
      return 'unknown';
    }

    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        if (
          parsed.length === 0 ||
          (parsed[0] && typeof parsed[0] === 'object' && 'type' in parsed[0])
        ) {
          return 'blocknote';
        }
      }
      return 'unknown';
    } catch {
      if (content.includes('<') && content.includes('>')) {
        return 'yoopta';
      }
      return 'unknown';
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🚀 Starting Yoopta to BlockNote migration...');

    // 1. content 컬럼을 text 타입으로 변경 (더 큰 데이터 저장 가능)
    console.log('📝 Changing content column type to TEXT...');
    await queryRunner.query(
      `ALTER TABLE "post_entity" ALTER COLUMN "content" TYPE text`,
    );

    // 2. 모든 포스트 조회
    const posts = await queryRunner.query(
      `SELECT id, content FROM "post_entity"`,
    );

    console.log(`📊 Found ${posts.length} posts to process`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 3. 각 포스트의 content를 확인하고 변환
    for (const post of posts) {
      const { id, content } = post;

      // 컨텐츠가 없는 경우 스킵
      if (!content) {
        console.log(`⏭️  Post #${id}: Empty content, skipping`);
        skippedCount++;
        continue;
      }

      const format = this.detectContentFormat(content);

      // 이미 BlockNote 포맷인 경우 스킵
      if (format === 'blocknote') {
        console.log(`✅ Post #${id}: Already in BlockNote format, skipping`);
        skippedCount++;
        continue;
      }

      // Yoopta 포맷이 아닌 경우 스킵
      if (format !== 'yoopta') {
        console.log(`⚠️  Post #${id}: Unknown format, skipping`);
        skippedCount++;
        continue;
      }

      try {
        console.log(`🔄 Post #${id}: Converting from Yoopta to BlockNote...`);

        // Yoopta HTML을 BlockNote JSON으로 변환
        const blockNoteJson = convertYooptaToBlockNote(content);

        // DB 업데이트
        await queryRunner.query(
          `UPDATE "post_entity" SET "content" = $1 WHERE "id" = $2`,
          [blockNoteJson, id],
        );

        console.log(`✅ Post #${id}: Successfully migrated`);
        migratedCount++;
      } catch (error) {
        console.error(`❌ Post #${id}: Migration failed`, error);
        errorCount++;
      }
    }

    // 4. 마이그레이션 결과 출력
    console.log('\n📊 Migration Summary:');
    console.log(`   Total posts: ${posts.length}`);
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('\n🎉 Migration completed!\n');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log(
      '⚠️  WARNING: Reverting this migration will NOT restore original Yoopta HTML content.',
    );
    console.log('   The BlockNote JSON will remain in the database.');
    console.log('   Make sure you have a backup before proceeding.\n');

    // content 컬럼을 원래 타입으로 되돌리기
    console.log('📝 Reverting content column type to VARCHAR...');
    await queryRunner.query(
      `ALTER TABLE "post_entity" ALTER COLUMN "content" TYPE character varying`,
    );

    console.log('✅ Column type reverted to VARCHAR');
    console.log('⚠️  Note: Content data remains in BlockNote format');
  }
}
