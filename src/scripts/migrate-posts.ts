import { DataSource } from 'typeorm';
import { PostEntity } from '../posts/entities/post.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CategoryEntity } from '../categories/entities/category.entity';
import { GroupEntity } from '../categories/entities/group.entity';
import { TagsEntity } from '../tags/entities/tag.entity';
import { CommentEntity } from '../comments/entities/comment.entity';
import { Task } from '../tasks/entities/task.entity';
import { convertYooptaToBlockNote } from '../utils/yoopta-to-blocknote-converter';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * 포스트 마이그레이션 스크립트
 *
 * 실행 방법:
 * ts-node -r tsconfig-paths/register src/scripts/migrate-posts.ts
 *
 * 옵션:
 * - DRY_RUN=true: 실제로 DB를 수정하지 않고 시뮬레이션만 실행
 * - POST_ID=123: 특정 포스트만 마이그레이션
 */

// 환경 변수 로드
const envFile = `.env.${process.env.NODE_ENV || 'development'}`;
dotenv.config({
  path: path.resolve(process.cwd(), envFile),
});
console.log(`📄 Loading environment from: ${envFile}`);

const DRY_RUN = process.env.DRY_RUN === 'true';
const TARGET_POST_ID = process.env.POST_ID
  ? parseInt(process.env.POST_ID)
  : null;

/**
 * 컨텐츠 포맷 감지
 */
function detectContentFormat(
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

/**
 * 마이그레이션 통계
 */
interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ id: number; error: string }>;
}

/**
 * 포스트 마이그레이션 실행
 */
async function migratePost(
  dataSource: DataSource,
  post: PostEntity,
  stats: MigrationStats,
): Promise<void> {
  const { id, content } = post;

  // 컨텐츠가 없는 경우
  if (!content) {
    console.log(`⏭️  Post #${id}: Empty content, skipping`);
    stats.skipped++;
    return;
  }

  // 포맷 감지
  const format = detectContentFormat(content);

  // 이미 BlockNote 포맷인 경우
  if (format === 'blocknote') {
    console.log(`✅ Post #${id}: Already in BlockNote format, skipping`);
    stats.skipped++;
    return;
  }

  // Yoopta 포맷이 아닌 경우
  if (format !== 'yoopta') {
    console.log(`⚠️  Post #${id}: Unknown format, skipping`);
    stats.skipped++;
    return;
  }

  try {
    console.log(`🔄 Post #${id}: Converting from Yoopta to BlockNote...`);

    // 변환
    const blockNoteJson = convertYooptaToBlockNote(content);

    // Dry run 모드
    if (DRY_RUN) {
      console.log(`   [DRY RUN] Would update post #${id}`);
      console.log(
        `   Original length: ${content.length} → New length: ${blockNoteJson.length}`,
      );
      console.log(`   Preview: ${blockNoteJson.substring(0, 100)}...`);
    } else {
      // 실제 업데이트
      await dataSource
        .createQueryBuilder()
        .update(PostEntity)
        .set({ content: blockNoteJson })
        .where('id = :id', { id })
        .execute();

      console.log(`✅ Post #${id}: Successfully migrated`);
    }

    stats.migrated++;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Post #${id}: Migration failed - ${errorMessage}`);
    stats.errors++;
    stats.errorDetails.push({ id, error: errorMessage });
  }
}

/**
 * 메인 함수
 */
async function main() {
  console.log('\n🚀 Starting Posts Migration Script\n');
  console.log(
    `Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '💾 LIVE RUN'}`,
  );
  console.log(
    `Target: ${TARGET_POST_ID ? `Post #${TARGET_POST_ID}` : 'All posts'}\n`,
  );

  // DataSource 생성
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.POSTGRES_USER || process.env.DB_USERNAME,
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.POSTGRES_DB || process.env.DB_DATABASE,
    entities: [
      PostEntity,
      UserEntity,
      CategoryEntity,
      GroupEntity,
      TagsEntity,
      CommentEntity,
      Task,
    ],
    synchronize: false,
  });

  const dbOptions = dataSource.options as any;
  console.log(`🔗 Connecting to database:`);
  console.log(`   Host: ${dbOptions.host}`);
  console.log(`   Port: ${dbOptions.port}`);
  console.log(`   Database: ${dbOptions.database}`);

  try {
    // 데이터베이스 연결
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // 통계 초기화
    const stats: MigrationStats = {
      total: 0,
      migrated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: [],
    };

    // 포스트 조회
    const postRepository = dataSource.getRepository(PostEntity);
    let posts: PostEntity[];

    if (TARGET_POST_ID) {
      const post = await postRepository.findOne({
        where: { id: TARGET_POST_ID },
      });
      posts = post ? [post] : [];
    } else {
      posts = await postRepository.find({
        order: { id: 'ASC' },
      });
    }

    stats.total = posts.length;
    console.log(`📊 Found ${posts.length} posts to process\n`);

    // 각 포스트 마이그레이션
    for (const post of posts) {
      await migratePost(dataSource, post, stats);
    }

    // 결과 출력
    console.log('\n' + '='.repeat(80));
    console.log('📊 Migration Summary:');
    console.log(`   Total posts: ${stats.total}`);
    console.log(`   ✅ Migrated: ${stats.migrated}`);
    console.log(`   ⏭️  Skipped: ${stats.skipped}`);
    console.log(`   ❌ Errors: ${stats.errors}`);

    if (stats.errorDetails.length > 0) {
      console.log('\n❌ Error Details:');
      stats.errorDetails.forEach(({ id, error }) => {
        console.log(`   Post #${id}: ${error}`);
      });
    }

    console.log('='.repeat(80) + '\n');

    if (DRY_RUN) {
      console.log(
        '🔍 This was a DRY RUN. No changes were made to the database.',
      );
      console.log('   Run without DRY_RUN=true to apply changes.\n');
    } else {
      console.log('🎉 Migration completed!\n');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // 연결 종료
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('✅ Database connection closed\n');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
