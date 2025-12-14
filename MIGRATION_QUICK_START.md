# YooptaEditor → BlockNote 마이그레이션 빠른 시작 가이드

## 🎯 한눈에 보기

YooptaEditor HTML 포맷 → BlockNote JSON 포맷으로 자동 변환합니다.

## ⚡ 빠른 실행 (3단계)

### 1단계: 백업 (필수!)

```bash
# 데이터베이스 백업
pg_dump -U your_username -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2단계: 테스트 실행 (Dry Run)

```bash
# 실제 DB를 수정하지 않고 시뮬레이션만 실행
DRY_RUN=true ts-node -r tsconfig-paths/register src/scripts/migrate-posts.ts
```

출력 예시:
```
🚀 Starting Posts Migration Script
Mode: 🔍 DRY RUN (no changes will be made)

📊 Found 15 posts to process

✅ Post #1: Already in BlockNote format, skipping
🔄 Post #2: Converting from Yoopta to BlockNote...
   [DRY RUN] Would update post #2
✅ Post #3: Successfully migrated
...

📊 Migration Summary:
   Total posts: 15
   ✅ Migrated: 8
   ⏭️  Skipped: 6
   ❌ Errors: 1
```

### 3단계: 실제 마이그레이션 실행

```bash
# TypeORM 마이그레이션 실행 (권장)
npm run migration:run

# 또는 스크립트로 직접 실행
ts-node -r tsconfig-paths/register src/scripts/migrate-posts.ts
```

## 🛠️ 고급 사용법

### 특정 포스트만 마이그레이션

```bash
POST_ID=123 ts-node -r tsconfig-paths/register src/scripts/migrate-posts.ts
```

### 변환기 테스트

```bash
ts-node -r tsconfig-paths/register src/utils/test-yoopta-converter.ts
```

## 📁 생성된 파일들

```
bumang-blog-backend/
├── src/
│   ├── migrations/
│   │   └── 1760454419356-MigrateYooptaToBlockNote.ts   # TypeORM 마이그레이션
│   ├── scripts/
│   │   └── migrate-posts.ts                            # 수동 마이그레이션 스크립트
│   └── utils/
│       ├── yoopta-to-blocknote-converter.ts            # 변환 로직
│       └── test-yoopta-converter.ts                    # 테스트 스크립트
├── YOOPTA_TO_BLOCKNOTE_MIGRATION.md                    # 상세 가이드
└── MIGRATION_QUICK_START.md                            # 이 파일
```

## ⚠️ 주의사항

1. **백업 필수**: 마이그레이션 전 반드시 DB 백업
2. **테스트 먼저**: DRY_RUN으로 먼저 확인
3. **다운타임 고려**: 마이그레이션 중 포스트 작성/수정 금지

## 🔄 롤백

문제 발생 시:

```bash
# 백업에서 복원
psql -U your_username -d your_database < backup_20251214_123456.sql
```

## ✅ 변환 내용

| 기능 | YooptaEditor | BlockNote |
|------|--------------|-----------|
| 저장 형식 | HTML | JSON |
| 헤딩 | `<h1>`, `<h2>`, `<h3>` | `{"type": "heading", "props": {"level": 1}}` |
| 단락 | `<p>` | `{"type": "paragraph"}` |
| 코드 | `<pre><code>` | `{"type": "code"}` |
| 이미지 | `<img>` | `{"type": "image"}` |
| 리스트 | `<ul>`, `<ol>` | `{"type": "bulletListItem"}` |
| 테이블 | `<table>` | `{"type": "table"}` |

## 📚 더 알아보기

- **상세 가이드**: [YOOPTA_TO_BLOCKNOTE_MIGRATION.md](./YOOPTA_TO_BLOCKNOTE_MIGRATION.md)
- **변환기 코드**: [src/utils/yoopta-to-blocknote-converter.ts](./src/utils/yoopta-to-blocknote-converter.ts)
- **마이그레이션 코드**: [src/migrations/1760454419356-MigrateYooptaToBlockNote.ts](./src/migrations/1760454419356-MigrateYooptaToBlockNote.ts)

## 🆘 문제 해결

### "Cannot find module" 에러

```bash
npm install
```

### 데이터베이스 연결 실패

`.env.development` 또는 `.env.production` 파일 확인:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=your_database
```

### 특정 포스트 변환 실패

해당 포스트의 HTML을 확인하고 수동으로 수정:

```bash
# 특정 포스트만 다시 마이그레이션
POST_ID=123 ts-node -r tsconfig-paths/register src/scripts/migrate-posts.ts
```

---

**준비 완료!** 이제 안전하게 마이그레이션을 시작하세요! 🚀
