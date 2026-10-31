-- =====================================================================
-- 2026-11-01 분류 체계 개편 — 운영 DB 전용 · 1회 실행
--   그룹 7 → 8, 카테고리 29 → 16, 태그 14 → 7, 글 82편 재배치
--   근거: bumang-blog/PLANNING.md "2026-11-01 · 분류 체계 전면 개편"
--
-- ⚠️ 운영 데이터의 번호(글·카테고리·태그 id)를 직접 쓴다. 로컬 DB에서 돌리지 말 것.
--
-- 전제: 백엔드가 먼저 배포돼 마이그레이션 AddTaxonomySlugs1787000000000 이 끝나 있어야 한다
--       (slug 칸). 없으면 0단계에서 멈춘다.
--
-- 실행 순서
--   1. 백업: pg_dump (DBeaver: DB 우클릭 → Tools → Backup)
--   2. DBeaver에서 이 파일 전체를 "Execute SQL Script"(Alt+X)로 실행
--      — 맨 위 BEGIN으로 트랜잭션이 열리고, 끝에 COMMIT은 없다.
--   3. 맨 아래 확인 쿼리 결과를 본다 (그룹 8 · 카테고리 16 · 태그 7 · 글 82).
--   4. 맞으면 COMMIT; 아니면 ROLLBACK;  ← 직접 실행
--   중간에 에러가 나면 트랜잭션이 깨진 상태라 COMMIT해도 아무것도 반영되지 않는다 → ROLLBACK 후 원인 확인.
--
-- 안전장치
--   - 0단계: 이어 쓸 그룹·카테고리·태그의 현재 이름이 예상과 다르면 멈춘다 (두 번 실행해도 여기서 멈춤).
--   - 0단계: 매핑에 없는 살아있는 글이 있으면(분석 뒤 새 글을 썼다면) 그 번호를 알려주고 멈춘다.
--   - 마지막 단계: 개수와 빈 칸을 다시 검사하고 틀리면 멈춘다.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. 전제 확인
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'category_entity' AND column_name = 'slug'
  ) THEN
    RAISE EXCEPTION 'slug 칸이 없습니다. 백엔드를 먼저 배포하세요 (마이그레이션 AddTaxonomySlugs).';
  END IF;
END $$;

-- 이어 쓸 행이 지금 예상한 이름인지 (id 번호가 다른 행을 가리키면 엉뚱하게 바뀐다)
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM (VALUES (1, 'Life'), (2, 'Project'), (3, 'Frontend'), (4, 'Backend'),
               (5, 'Computer Science'), (6, 'Interactive'), (7, 'Infra & Tooling')) AS v(id, label)
  JOIN group_entity g ON g.id = v.id AND g.label = v.label;
  IF n <> 7 THEN
    RAISE EXCEPTION '그룹이 예상과 다릅니다 (일치 %/7). 이미 실행했거나 분류가 바뀌었습니다.', n;
  END IF;
  SELECT count(*) INTO n
  FROM (VALUES (1, 'Diary'), (11, 'JS / TS'), (12, 'React / Next.js'),
               (16, 'Node / Express / Nest.js'), (18, 'DB / SQL / ORM'), (21, 'Cloud'),
               (24, 'Operating Systems'), (25, 'Network'), (29, 'Game Programming'),
               (33, 'Bundler / Tooling')) AS v(id, label)
  JOIN category_entity c ON c.id = v.id AND c.label = v.label;
  IF n <> 10 THEN
    RAISE EXCEPTION '카테고리가 예상과 다릅니다 (일치 %/10).', n;
  END IF;
  SELECT count(*) INTO n
  FROM (VALUES (3, 'Bumang Route53'), (11, 'AWS'), (12, 'Blai'), (13, 'K8s'), (14, '개미지표')) AS v(id, title)
  JOIN tags_entity t ON t.id = v.id AND t.title = v.title;
  IF n <> 5 THEN
    RAISE EXCEPTION '태그가 예상과 다릅니다 (일치 %/5).', n;
  END IF;
END $$;

-- 글 → 새 카테고리 (살아있는 글 82편 전부)
CREATE TEMP TABLE post_category_map (
  post_id int PRIMARY KEY,
  category_slug text NOT NULL
) ON COMMIT DROP;

INSERT INTO post_category_map (post_id, category_slug) VALUES
  -- Frontend
  (18, 'javascript-typescript'), (32, 'javascript-typescript'), (55, 'javascript-typescript'), (56, 'javascript-typescript'),
  (15, 'react-web'), (22, 'react-web'), (24, 'react-web'), (25, 'react-web'), (36, 'react-web'), (87, 'react-web'), (90, 'react-web'), (108, 'react-web'),
  -- Backend
  (26, 'architecture'), (37, 'architecture'), (70, 'architecture'), (114, 'architecture'), (122, 'architecture'), (123, 'architecture'), (125, 'architecture'),
  (53, 'payments'), (65, 'payments'), (66, 'payments'), (68, 'payments'), (109, 'payments'), (110, 'payments'),
  -- Database
  (19, 'sql-rdbms'), (76, 'sql-rdbms'), (77, 'sql-rdbms'), (84, 'sql-rdbms'), (91, 'sql-rdbms'), (127, 'sql-rdbms'), (128, 'sql-rdbms'),
  (21, 'orm-performance'), (64, 'orm-performance'), (71, 'orm-performance'), (75, 'orm-performance'), (78, 'orm-performance'), (112, 'orm-performance'),
  (41, 'nosql'), (52, 'nosql'), (72, 'nosql'), (74, 'nosql'), (98, 'nosql'), (117, 'nosql'),
  -- DevOps
  (20, 'cloud-ops'), (40, 'cloud-ops'), (61, 'cloud-ops'), (62, 'cloud-ops'), (63, 'cloud-ops'), (82, 'cloud-ops'), (83, 'cloud-ops'), (124, 'cloud-ops'),
  (43, 'build-tooling'), (89, 'build-tooling'), (103, 'build-tooling'),
  -- AI
  (96, 'agents'), (97, 'agents'), (101, 'agents'), (102, 'agents'), (118, 'agents'), (126, 'agents'),
  (67, 'llm-apps'), (113, 'llm-apps'),
  -- Computer Science
  (80, 'network'), (119, 'network'), (120, 'network'), (121, 'network'),
  (27, 'os-hardware'), (29, 'os-hardware'), (81, 'os-hardware'),
  -- Game Dev
  (17, 'unity-csharp'), (45, 'unity-csharp'),
  -- Life
  (85, 'career'), (94, 'career'), (106, 'career'), (111, 'career'), (115, 'career'),
  (86, 'journal'), (92, 'journal'), (95, 'journal'), (105, 'journal'), (116, 'journal');

DO $$
DECLARE
  ids text;
BEGIN
  SELECT string_agg(p.id::text, ', ' ORDER BY p.id) INTO ids
  FROM post_entity p
  WHERE p."deletedAt" IS NULL
    AND NOT EXISTS (SELECT 1 FROM post_category_map m WHERE m.post_id = p.id);
  IF ids IS NOT NULL THEN
    RAISE EXCEPTION '매핑에 없는 글이 있습니다: % — post_category_map에 추가한 뒤 다시 실행하세요.', ids;
  END IF;
  SELECT string_agg(m.post_id::text, ', ' ORDER BY m.post_id) INTO ids
  FROM post_category_map m
  WHERE NOT EXISTS (SELECT 1 FROM post_entity p WHERE p.id = m.post_id AND p."deletedAt" IS NULL);
  IF ids IS NOT NULL THEN
    RAISE EXCEPTION '없거나 삭제된 글이 매핑에 있습니다: %', ids;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 1. 그룹 — 기존 7개를 이어 쓰고(이름·slug·순서) Database만 새로 만든다. 지우는 그룹은 없다.
-- ---------------------------------------------------------------------
UPDATE group_entity SET "order" = "order" + 1000;  -- 순서를 다시 매기는 동안 겹치지 않게

UPDATE group_entity AS g
SET label = v.label, slug = v.slug, "order" = v.ord, "updatedAt" = now()
FROM (VALUES
  (3, 'Frontend',         'frontend',         1),
  (4, 'Backend',          'backend',          2),
  (7, 'DevOps',           'devops',           4),
  (2, 'AI',               'ai',               5),
  (5, 'Computer Science', 'computer-science', 6),
  (6, 'Game Dev',         'game-dev',         7),
  (1, 'Life',             'life',             8)   -- slug 'life'가 Life 탭과 글 type을 정한다. 바꾸지 말 것.
) AS v(id, label, slug, ord)
WHERE g.id = v.id;

INSERT INTO group_entity (label, slug, "order") VALUES ('Database', 'database', 3);

-- ---------------------------------------------------------------------
-- 2. 카테고리 — 뜻이 이어지는 10개는 이어 쓰고, 6개는 새로 만든다.
-- ---------------------------------------------------------------------
UPDATE category_entity SET "order" = "order" + 1000;  -- (그룹, 순서) 유일 제약에 안 걸리게

UPDATE category_entity AS c
SET label = v.label, slug = v.slug, "order" = v.ord, "groupId" = g.id, "updatedAt" = now()
FROM (VALUES
  (11, 'JavaScript & TypeScript', 'javascript-typescript', 'frontend',         1),
  (12, 'React & Web',             'react-web',             'frontend',         2),
  (16, 'Architecture',            'architecture',          'backend',          1),
  (18, 'SQL & RDBMS',             'sql-rdbms',             'database',         1),
  (21, 'Cloud & Ops',             'cloud-ops',             'devops',           1),
  (33, 'Build & Tooling',         'build-tooling',         'devops',           2),
  (25, 'Network',                 'network',               'computer-science', 1),
  (24, 'OS & Hardware',           'os-hardware',           'computer-science', 2),
  (29, 'Unity & C#',              'unity-csharp',          'game-dev',         1),
  (1,  'Journal',                 'journal',               'life',             2)
) AS v(id, label, slug, group_slug, ord)
JOIN group_entity g ON g.slug = v.group_slug
WHERE c.id = v.id;

INSERT INTO category_entity (label, slug, "order", "groupId")
SELECT v.label, v.slug, v.ord, g.id
FROM (VALUES
  ('Payments',          'payments',        'backend',  2),
  ('ORM & Performance', 'orm-performance', 'database', 2),
  ('NoSQL',             'nosql',           'database', 3),
  ('Agents',            'agents',          'ai',       1),
  ('LLM Apps',          'llm-apps',        'ai',       2),
  ('Career',            'career',          'life',     1)
) AS v(label, slug, group_slug, ord)
JOIN group_entity g ON g.slug = v.group_slug;

-- ---------------------------------------------------------------------
-- 3. 글 재배치 + dev/life 다시 판정 (그룹 slug가 'life'면 life)
--    글의 updatedAt은 건드리지 않는다 — 본문이 바뀐 게 아니다.
-- ---------------------------------------------------------------------
UPDATE post_entity AS p
SET "categoryId" = c.id
FROM post_category_map m
JOIN category_entity c ON c.slug = m.category_slug
WHERE p.id = m.post_id;

UPDATE post_entity AS p SET type = 'life'
FROM category_entity c JOIN group_entity g ON g.id = c."groupId"
WHERE p."categoryId" = c.id AND g.slug = 'life' AND p.type <> 'life';

UPDATE post_entity AS p SET type = 'dev'
FROM category_entity c JOIN group_entity g ON g.id = c."groupId"
WHERE p."categoryId" = c.id AND g.slug <> 'life' AND p.type <> 'dev';

-- ---------------------------------------------------------------------
-- 4. 옛 카테고리 19개 삭제 — 살아있는 글은 3단계에서 다 옮겼다.
--    (지워진 글이 가리키던 카테고리는 FK ON DELETE SET NULL로 비워진다)
-- ---------------------------------------------------------------------
DELETE FROM category_entity
WHERE slug NOT IN (
  'javascript-typescript', 'react-web', 'architecture', 'payments',
  'sql-rdbms', 'orm-performance', 'nosql', 'cloud-ops', 'build-tooling',
  'agents', 'llm-apps', 'network', 'os-hardware', 'unity-csharp', 'career', 'journal'
);

-- ---------------------------------------------------------------------
-- 5. 태그 — 5개 이어 쓰고 2개 새로 만들고 9개 삭제, 글-태그 연결은 새로 깐다.
--    태그의 그룹은 화면에 안 쓰이지만 칸이 필수라 가까운 그룹에 둔다.
-- ---------------------------------------------------------------------
UPDATE tags_entity AS t
SET title = v.title, slug = v.slug, "groupId" = g.id, "updatedAt" = now()
FROM (VALUES
  (12, 'Blai',       'blai',       'backend'),
  (14, 'Ant-Index',  'ant-index',  'ai'),        -- 원래 '개미지표'
  (3,  'bumang.xyz', 'bumang-xyz', 'frontend'),  -- 원래 'Bumang Route53' (AWS Route53으로 오해되기 쉬움)
  (13, 'Kubernetes', 'kubernetes', 'devops'),    -- 원래 'K8s'
  (11, 'AWS',        'aws',        'devops')
) AS v(id, title, slug, group_slug)
JOIN group_entity g ON g.slug = v.group_slug
WHERE t.id = v.id;

INSERT INTO tags_entity (title, slug, "groupId")
SELECT v.title, v.slug, g.id
FROM (VALUES
  ('Camfit',          'camfit',          'backend'),
  ('Troubleshooting', 'troubleshooting', 'backend')
) AS v(title, slug, group_slug)
JOIN group_entity g ON g.slug = v.group_slug;

-- 태그 FK가 ON DELETE NO ACTION이라, 지울 태그의 연결(지워진 글 것 포함)을 먼저 지운다.
DELETE FROM post_entity_tags_tags_entity
WHERE "postEntityId" IN (SELECT id FROM post_entity WHERE "deletedAt" IS NULL)
   OR "tagsEntityId" IN (
     SELECT id FROM tags_entity
     WHERE slug NOT IN ('blai', 'camfit', 'ant-index', 'bumang-xyz', 'troubleshooting', 'kubernetes', 'aws')
   );

INSERT INTO post_entity_tags_tags_entity ("postEntityId", "tagsEntityId")
SELECT m.post_id, t.id
FROM (VALUES
  -- Blai
  (26, 'blai'), (41, 'blai'), (62, 'blai'), (65, 'blai'), (66, 'blai'), (68, 'blai'), (70, 'blai'), (106, 'blai'),
  -- Blai (추정 — 시기와 미리보기로 판단. 아니면 이 줄에서 빼고 실행)
  (52, 'blai'), (53, 'blai'), (63, 'blai'), (64, 'blai'), (72, 'blai'), (74, 'blai'),
  -- Camfit
  (94, 'camfit'), (98, 'camfit'), (102, 'camfit'), (106, 'camfit'), (109, 'camfit'), (110, 'camfit'), (112, 'camfit'),
  (114, 'camfit'), (115, 'camfit'), (122, 'camfit'), (123, 'camfit'), (125, 'camfit'), (126, 'camfit'),
  -- Ant-Index
  (67, 'ant-index'), (75, 'ant-index'), (83, 'ant-index'),
  -- bumang.xyz (37은 원래 Bumang Route53 태그가 붙어 있던 글이라 유지)
  (15, 'bumang-xyz'), (20, 'bumang-xyz'), (36, 'bumang-xyz'), (37, 'bumang-xyz'), (40, 'bumang-xyz'), (61, 'bumang-xyz'),
  (87, 'bumang-xyz'), (90, 'bumang-xyz'), (96, 'bumang-xyz'), (97, 'bumang-xyz'), (119, 'bumang-xyz'), (120, 'bumang-xyz'), (124, 'bumang-xyz'),
  -- bumang.xyz (추정)
  (22, 'bumang-xyz'),
  -- Troubleshooting
  (15, 'troubleshooting'), (20, 'troubleshooting'), (36, 'troubleshooting'), (53, 'troubleshooting'),
  (64, 'troubleshooting'), (109, 'troubleshooting'), (110, 'troubleshooting'), (112, 'troubleshooting'),
  -- Kubernetes
  (62, 'kubernetes'), (63, 'kubernetes'), (66, 'kubernetes'), (68, 'kubernetes'),
  -- AWS
  (52, 'aws'), (61, 'aws'), (66, 'aws'), (72, 'aws'), (74, 'aws'), (124, 'aws')
) AS m(post_id, tag_slug)
JOIN tags_entity t ON t.slug = m.tag_slug;

DELETE FROM tags_entity
WHERE slug NOT IN ('blai', 'camfit', 'ant-index', 'bumang-xyz', 'troubleshooting', 'kubernetes', 'aws');

-- ---------------------------------------------------------------------
-- 6. 검사 — 틀리면 멈춘다 (COMMIT 전에 실패하므로 아무것도 반영되지 않는다)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n FROM group_entity;
  IF n <> 8 THEN RAISE EXCEPTION '그룹 수가 8이 아닙니다: %', n; END IF;
  SELECT count(*) INTO n FROM category_entity;
  IF n <> 16 THEN RAISE EXCEPTION '카테고리 수가 16이 아닙니다: %', n; END IF;
  SELECT count(*) INTO n FROM tags_entity;
  IF n <> 7 THEN RAISE EXCEPTION '태그 수가 7이 아닙니다: %', n; END IF;
  SELECT count(*) INTO n FROM post_entity WHERE "deletedAt" IS NULL AND "categoryId" IS NULL;
  IF n <> 0 THEN RAISE EXCEPTION '카테고리가 빈 글이 %편 있습니다', n; END IF;
  SELECT count(*) INTO n
  FROM category_entity c
  WHERE NOT EXISTS (SELECT 1 FROM post_entity p WHERE p."categoryId" = c.id AND p."deletedAt" IS NULL);
  IF n <> 0 THEN RAISE EXCEPTION '글이 없는 카테고리가 %개 있습니다', n; END IF;
  SELECT count(*) INTO n
  FROM post_entity p
  JOIN category_entity c ON c.id = p."categoryId"
  JOIN group_entity g ON g.id = c."groupId"
  WHERE p."deletedAt" IS NULL AND (g.slug = 'life') <> (p.type = 'life');
  IF n <> 0 THEN RAISE EXCEPTION 'dev/life 판정이 그룹과 다른 글이 %편 있습니다', n; END IF;
END $$;

-- 눈으로 확인: 그룹 > 카테고리별 글 번호
SELECT g."order" AS g_ord, g.label AS "group", c."order" AS c_ord, c.label AS category,
       count(p.id) AS posts, string_agg(p.id::text, ',' ORDER BY p.id) AS post_ids
FROM group_entity g
JOIN category_entity c ON c."groupId" = g.id
LEFT JOIN post_entity p ON p."categoryId" = c.id AND p."deletedAt" IS NULL
GROUP BY g."order", g.label, c."order", c.label
ORDER BY g."order", c."order";

-- 눈으로 확인: 태그별 글 번호
SELECT t.title AS tag, count(p.id) AS posts, string_agg(p.id::text, ',' ORDER BY p.id) AS post_ids
FROM tags_entity t
LEFT JOIN post_entity_tags_tags_entity pt ON pt."tagsEntityId" = t.id
LEFT JOIN post_entity p ON p.id = pt."postEntityId" AND p."deletedAt" IS NULL
GROUP BY t.title
ORDER BY t.title;

-- 결과가 맞으면:   COMMIT;
-- 이상하면:        ROLLBACK;
