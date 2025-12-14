# YooptaEditor → BlockNote 마이그레이션 가이드

## 📋 목차

1. [개요](#개요)
2. [마이그레이션 준비](#마이그레이션-준비)
3. [마이그레이션 실행](#마이그레이션-실행)
4. [확인 및 검증](#확인-및-검증)
5. [롤백 방법](#롤백-방법)
6. [주의사항](#주의사항)

---

## 개요

이 마이그레이션은 기존 YooptaEditor HTML 포맷으로 저장된 포스트 content를 BlockNote JSON 포맷으로 변환합니다.

### 변경 사항

- **데이터베이스 스키마**: `content` 컬럼 타입이 `VARCHAR`에서 `TEXT`로 변경됩니다.
- **데이터 포맷**: Yoopta HTML → BlockNote JSON
- **자동 감지**: 이미 BlockNote 포맷인 포스트는 자동으로 스킵됩니다.

### 마이그레이션 파일

```
src/
├── migrations/
│   └── 1760454419356-MigrateYooptaToBlockNote.ts    # 마이그레이션 스크립트
└── utils/
    └── yoopta-to-blocknote-converter.ts              # 변환 유틸리티
```

---

## 마이그레이션 준비

### 1. 데이터베이스 백업

⚠️ **중요**: 마이그레이션 전 반드시 데이터베이스를 백업하세요!

```bash
# PostgreSQL 백업
pg_dump -U your_username -d your_database_name > backup_before_migration.sql

# 또는 Docker를 사용하는 경우
docker exec your_postgres_container pg_dump -U your_username your_database_name > backup_before_migration.sql
```

### 2. 현재 포스트 상태 확인

```sql
-- 전체 포스트 개수
SELECT COUNT(*) FROM post_entity;

-- 포맷별 포스트 개수 확인 (수동)
SELECT
  id,
  title,
  CASE
    WHEN content LIKE '[%' THEN 'blocknote'
    WHEN content LIKE '<%' THEN 'yoopta'
    ELSE 'unknown'
  END as format
FROM post_entity;
```

### 3. 환경 변수 확인

`.env.development` 또는 `.env.production` 파일에서 데이터베이스 연결 정보 확인:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=your_database_name
```

---

## 마이그레이션 실행

### 1. 개발 환경에서 먼저 테스트

```bash
# 1. 의존성 설치
npm install

# 2. 마이그레이션 실행 (개발 환경)
npm run migration:run

# 또는 TypeORM CLI 직접 사용
ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d src/data-source.ts
```

### 2. 마이그레이션 진행 상황 확인

마이그레이션 실행 시 다음과 같은 로그가 출력됩니다:

```
🚀 Starting Yoopta to BlockNote migration...
📝 Changing content column type to TEXT...
📊 Found 15 posts to process

✅ Post #1: Already in BlockNote format, skipping
🔄 Post #2: Converting from Yoopta to BlockNote...
✅ Post #2: Successfully migrated
⏭️  Post #3: Empty content, skipping
🔄 Post #4: Converting from Yoopta to BlockNote...
✅ Post #4: Successfully migrated
...

📊 Migration Summary:
   Total posts: 15
   ✅ Migrated: 8
   ⏭️  Skipped: 6
   ❌ Errors: 1

🎉 Migration completed!
```

### 3. 프로덕션 배포

개발 환경에서 충분히 테스트한 후:

```bash
# 1. 프로덕션 데이터베이스 백업
pg_dump -U prod_username -d prod_database > backup_prod_$(date +%Y%m%d_%H%M%S).sql

# 2. 프로덕션 마이그레이션 실행
NODE_ENV=production npm run migration:run
```

---

## 확인 및 검증

### 1. 데이터베이스 스키마 확인

```sql
-- content 컬럼 타입이 TEXT로 변경되었는지 확인
\d post_entity

-- 또는
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'post_entity' AND column_name = 'content';
```

### 2. 변환된 데이터 샘플 확인

```sql
-- 첫 번째 포스트의 content 확인
SELECT id, title, LEFT(content, 200) as content_preview
FROM post_entity
WHERE id = 1;

-- BlockNote 포맷인지 확인 (JSON 배열 형태)
SELECT id, title
FROM post_entity
WHERE content LIKE '[%'
LIMIT 5;
```

### 3. 프론트엔드 확인

1. 블로그 포스트 상세 페이지 접속
2. BlockNote 에디터로 정상적으로 렌더링되는지 확인
3. 이미지, 코드 블록, 링크 등 모든 요소가 제대로 표시되는지 확인

### 4. 변환 품질 확인

수동으로 몇 개의 포스트를 확인하여:

- 텍스트 내용이 유지되었는지
- 헤딩 레벨이 올바른지 (h1, h2, h3)
- 코드 블록의 언어 설정이 유지되었는지
- 이미지 URL과 캡션이 유지되었는지
- 리스트 항목이 올바르게 변환되었는지

---

## 롤백 방법

### Option 1: 마이그레이션 되돌리기 (권장하지 않음)

⚠️ **경고**: 이 방법은 스키마만 되돌리고 데이터는 BlockNote 포맷으로 남아있습니다!

```bash
npm run migration:revert
```

이렇게 하면:
- ✅ `content` 컬럼이 다시 `VARCHAR`로 변경됨
- ❌ 하지만 데이터는 여전히 BlockNote JSON 포맷으로 남아있음

### Option 2: 백업에서 복원 (권장)

완전히 이전 상태로 되돌리려면 백업에서 복원:

```bash
# PostgreSQL 복원
psql -U your_username -d your_database_name < backup_before_migration.sql

# 또는 Docker를 사용하는 경우
docker exec -i your_postgres_container psql -U your_username your_database_name < backup_before_migration.sql
```

### Option 3: 특정 포스트만 복원

백업 파일에서 특정 포스트만 추출하여 복원:

```sql
-- 백업에서 특정 포스트의 INSERT 문을 찾아서 실행
UPDATE post_entity
SET content = '원본 HTML 내용...'
WHERE id = 123;
```

---

## 주의사항

### 1. 완벽한 변환 불가능한 경우

다음과 같은 경우 변환이 완벽하지 않을 수 있습니다:

- **복잡한 HTML 구조**: 중첩된 div, 커스텀 스타일 등
- **특수 YooptaEditor 플러그인**: BlockNote에서 지원하지 않는 기능
- **비표준 HTML**: 잘못된 HTML 구조

이런 경우 수동으로 확인하고 수정이 필요할 수 있습니다.

### 2. 대량 데이터 처리

포스트가 매우 많은 경우 (1000개 이상):

- 마이그레이션이 시간이 오래 걸릴 수 있습니다
- 데이터베이스 타임아웃 설정 확인
- 배치 처리를 고려할 수 있습니다

### 3. 동시성 문제

마이그레이션 실행 중:

- 새로운 포스트 작성 금지
- 기존 포스트 수정 금지
- 서비스 다운타임 고려

### 4. VARCHAR 길이 제한

기존에 `VARCHAR`를 사용했다면 긴 content가 잘렸을 수 있습니다. 이제 `TEXT`로 변경되어 길이 제한이 없어졌습니다.

---

## 변환 예시

### Before (YooptaEditor HTML)

```html
<body id="yoopta-clipboard">
  <h2>제목</h2>
  <p>본문 텍스트입니다.</p>
  <pre data-language="javascript"><code>console.log('Hello');</code></pre>
  <img src="https://example.com/image.jpg" alt="이미지" />
</body>
```

### After (BlockNote JSON)

```json
[
  {
    "id": "block-1760454419356-0",
    "type": "heading",
    "props": { "level": 2 },
    "content": [{ "type": "text", "text": "제목" }]
  },
  {
    "id": "block-1760454419356-1",
    "type": "paragraph",
    "content": [{ "type": "text", "text": "본문 텍스트입니다." }]
  },
  {
    "id": "block-1760454419356-2",
    "type": "code",
    "props": { "language": "javascript" },
    "content": [{ "type": "text", "text": "console.log('Hello');" }]
  },
  {
    "id": "block-1760454419356-3",
    "type": "image",
    "props": {
      "url": "https://example.com/image.jpg",
      "caption": "이미지"
    }
  }
]
```

---

## 문제 해결

### 문제: 마이그레이션이 실패했습니다

**해결책**:
1. 에러 로그 확인
2. 데이터베이스 연결 확인
3. 특정 포스트 ID 확인 후 수동 변환

### 문제: 변환된 포스트가 제대로 표시되지 않습니다

**해결책**:
1. 프론트엔드 contentFormat 감지 로직 확인
2. BlockNote 에디터 초기화 확인
3. 브라우저 콘솔에서 JSON 파싱 에러 확인

### 문제: 일부 포스트만 변환되지 않았습니다

**해결책**:
1. 해당 포스트의 HTML 구조 확인
2. 수동으로 변환 유틸리티 테스트
3. 필요시 수동 수정

---

## 추가 리소스

- [BlockNote 공식 문서](https://www.blocknotejs.org/)
- [TypeORM 마이그레이션 가이드](https://typeorm.io/migrations)
- [PostgreSQL TEXT vs VARCHAR](https://www.postgresql.org/docs/current/datatype-character.html)

---

## 지원

문제가 발생하거나 질문이 있으면:

1. 에러 로그 수집
2. 문제가 발생한 포스트 ID 확인
3. 개발팀에 문의

---

**마지막 업데이트**: 2025-12-14
