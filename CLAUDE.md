# Bumang Blog Backend — 에이전트 가이드

NestJS 기반 블로그 REST API. 상위 컨텍스트는 [../CLAUDE.md](../CLAUDE.md) 참고.

**스택**: NestJS 10 · TypeScript 5.7 · PostgreSQL 15 + TypeORM 0.3 · Passport/JWT · Winston · Prometheus · Docker

## 명령어

```bash
npm run start:dev          # ts-node-dev 핫리로드 (기본 포트 4001, APP_PORT 우선)
npm run build              # nest build
npm test                   # jest (*.spec.ts)

# 마이그레이션 (엔티티 변경 후 필수)
npm run migration:generate -- src/migrations/<이름>
npm run migration:run
npm run migration:revert

# Docker 개발환경
npm run docker:up          # .env.development 로드해서 컴포즈 up
npm run docker:down
npm run dev:rebuild        # 강제 재빌드

npm run logs               # tail logs/app.log
npm run logs:error         # tail logs/error.log
```

환경 파일은 `.env.${NODE_ENV}` (`.env.development` / `.env.production`). `ConfigModule`이 global.

## 모듈 패턴 (가장 중요)

도메인별로 같은 형태를 반복한다. **새 도메인 추가 = 이 구조 복제 + `app.module.ts` imports 배열에 등록.**

```
src/<domain>/
├── <domain>.module.ts
├── <domain>.controller.ts
├── <domain>.service.ts        # 비즈니스 로직·TypeORM 쿼리
├── dto/                       # create / update / *-response / query DTO
├── entities/                  # <domain>.entity.ts (TypeORM @Entity)
└── util/                      # 순수 헬퍼 (선택)
```

대표 참고 모듈: **`src/posts/`** (DTO·entity·util·권한이 모두 갖춰진 가장 완성된 예).

기존 도메인: `auth` · `posts` · `categories` · `tags` · `comments` · `users` · `user-groups` · `s3` · `tasks`(cron) + 인프라 모듈(`metrics`, `logger`).

## 컨벤션

- **Path alias**: `src/*`, `types/*` (`tsconfig.json`). 절대 `@/`가 아니다 (그건 프론트). import는 `import { X } from 'src/posts/...'` 형태.
- **tsconfig는 strict 아님**: `strictNullChecks:false`, `noImplicitAny:false`. 기존 코드 톤에 맞춰서 과한 null 가드를 강제하지 말 것.
- **Validation** (`main.ts` 전역 `ValidationPipe`): `whitelist:true`(DTO에 없는 필드 제거), `forbidNonWhitelisted:false`(에러는 안 냄 — 프론트 호환), `transform:true`(string→number 등 자동 변환). 그래서 query/param도 DTO 타입으로 받으면 변환된다.
- **Swagger**: 모든 DTO 필드에 `@ApiProperty({ example, description })`를 붙이는 게 관례 (commit `80776aa`). 문서는 `/api-docs`.
- **요청 본문 한도**: json/urlencoded `5mb` (`main.ts`).

## 인증 / 인가

JWT 이중 토큰 (access 단기 + refresh DB저장·로테이션), httpOnly 쿠키. CORS는 `main.ts`에서 화이트리스트(`localhost:4000`, `bumang.xyz`).

| 가드 (`src/auth/guards/`) | 용도 |
|---|---|
| `jwt-auth.guard.ts` | access 토큰 필수 |
| `optional-jwt.guard.ts` | 로그인/비로그인 모두 허용 (공개+권한 콘텐츠) |
| `jwt-refresh.guard.ts` | refresh 토큰 검증 (재발급용) |
| `roles.guard.ts` | `@Roles(...)` 역할 검사 |
| `is-owner.guard.ts` | `@IsOwner()` 리소스 소유자 검사 |

데코레이터: `@Roles`·`@IsOwner` (`src/auth/decorators/`), `@CurrentUser` (`src/common/decorator/current-user.decorator.ts`). 전략: `src/auth/strategies/{jwt,jwt-refresh}.strategy.ts`.

**포스트 권한 로직은 서비스에 흩지 말고 유틸을 재사용**한다 (`src/posts/util/`):
- `canReadPost.ts` / `canCreateOrUpdatePost.ts` — 권한 판정
- `getPermissionCondition.ts` — 목록 쿼리에 들어갈 TypeORM where 조건
- `maskContent.ts` — audience 안 맞는 블록 마스킹

## 관찰성

- 요청 로깅·메트릭은 전역 `LoggingInterceptor`(`src/interceptors/`)가 `MetricsService`로 보낸다.
- Winston: `logs/{app,error,exceptions}.log`. Prometheus 스크랩 + Grafana.
- `/metrics`와 auth 라우트는 보안 강화돼 있음(외부 차단·레이트리밋, commit `1f43086`). auth 컨트롤러는 `@Throttle`로 별도 강한 제한, 전역은 느슨(`ttl 60s / limit 100`).

## 함정 / 정리 후보

- `main.ts`에 **모든 요청을 찍는 디버그 미들웨어**(`console.log('요청 수신됨', ...)` + 쿠키 출력)가 남아 있다. 운영 로그 노이즈이고 쿠키를 평문 출력하므로 손대는 김에 제거 검토.
- Swagger 셋업 경로는 `/api-docs` (README의 `/api`와 다름 — 코드가 정답).
