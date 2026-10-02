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

- **Path alias**: `src/*` (`tsconfig.json`). `rootDir`를 `./`로 고정해 빌드 결과가 항상 `dist/src/...`에 나온다 — 실행 명령이 그 경로에 의존한다. 절대 `@/`가 아니다 (그건 프론트). import는 `import { X } from 'src/posts/...'` 형태.
- **tsconfig는 strict 아님**: `strictNullChecks:false`, `noImplicitAny:false`. 기존 코드 톤에 맞춰서 과한 null 가드를 강제하지 말 것.
- **Validation** (`main.ts` 전역 `ValidationPipe`): `whitelist:true`(DTO에 없는 필드 제거), `forbidNonWhitelisted:false`(에러는 안 냄 — 프론트 호환), `transform:true`(string→number 등 자동 변환). 그래서 query/param도 DTO 타입으로 받으면 변환된다.
- **Swagger**: 모든 DTO 필드에 `@ApiProperty({ example, description })`를 붙이는 게 관례 (commit `80776aa`). 문서는 `/api-docs`.
- **요청 본문 한도**: json/urlencoded `5mb` (`main.ts`).

## 인증 / 인가

access는 JWT(15분), refresh는 **기기별 세션**(무작위 토큰, DB에는 SHA-256 해시만 — `auth/entities/refresh-session.entity.ts`, 30일 슬라이딩, 유저당 최대 10개). 둘 다 httpOnly 쿠키. 수명의 단일 출처는 `auth/const/token.const.ts`(JWT 만료·쿠키 maxAge·세션 만료가 전부 여기서 나온다 — env의 `JWT_EXPIRATION`은 더 이상 읽지 않는다). CORS는 `main.ts`에서 화이트리스트(`localhost:4000`, `bumang.xyz`).

- refresh 토큰은 **로테이션하지 않는다** — 새 토큰을 실은 응답이 브라우저에 닿기 전에 취소되면(Next 프리페치) 멀쩡한 세션이 끊긴다.
- 로그아웃은 그 기기의 세션만 지운다. `/auth/refresh`·`/auth/logout`은 가드 없이 refresh 쿠키로 판정한다.
- 토큰·비밀번호를 로그에 찍지 말 것(예전에 refresh 토큰 전체를 `console.log`로 출력하고 있었다).

| 가드 (`src/auth/guards/`) | 용도 |
|---|---|
| `jwt-auth.guard.ts` | access 토큰 필수 |
| `optional-jwt.guard.ts` | 로그인/비로그인 모두 허용 (공개+권한 콘텐츠). 단 access는 없는데 refresh 쿠키가 있으면 **401** — 로그인한 사용자가 익명용(마스킹된) 응답을 받지 않고 갱신 후 재요청하게 한다 |
| `roles.guard.ts` | `@Roles(...)` 역할 검사 |
| `is-owner.guard.ts` | `@IsOwner()` 리소스 소유자 검사 |

데코레이터: `@Roles`·`@IsOwner` (`src/auth/decorators/`), `@CurrentUser` (`src/common/decorator/current-user.decorator.ts`). 전략: `src/auth/strategies/jwt.strategy.ts`.

**레이트리밋**: `common/guard/cf-throttler.guard.ts`가 전역 가드(`APP_GUARD`)로 방문자 IP(`CF-Connecting-IP`)당 분당 300회를 센다. 가입·로그인은 `@Throttle`로 더 강하게. 프론트는 레이트리밋을 하지 않는다.

**포스트 권한 로직은 서비스에 흩지 말고 유틸을 재사용**한다 (`src/posts/util/`):
- `canReadPost.ts` / `canCreateOrUpdatePost.ts` — 권한 판정
- `getPermissionCondition.ts` — 목록 쿼리에 들어갈 TypeORM where 조건
- `maskContent.ts` — audience 안 맞는 블록 마스킹

## 관찰성

- 요청 로깅은 전역 `LoggingInterceptor`(`src/interceptors/`)가 Winston으로 남긴다.
- Winston: `logs/{app,error,exceptions}.log`. 프로덕션에서는 호스트의 `/var/log/bumang-blog/backend`에 연결돼 재배포 후에도 남는다.
- **프로세스가 죽었을 때 볼 곳** (프로덕션): ① `/var/log/bumang-blog/{backend/reports,frontend}`의 Node 진단 리포트(JSON — 호출 스택·힙 상태) ② `sudo coredumpctl list`(죽은 시각·시그널 — 덤프 본체는 만들지 않게 설정됨, `/etc/systemd/coredump.conf.d/10-no-dump.conf`) ③ `sudo dmesg -T | grep -i oom`(OOM 킬러). 실행 옵션은 `docker-compose.prod.yaml`의 `command`.
- ⚠️ 프로덕션 컨테이너 안에서 진단용 프로세스(`docker exec ... node -e`)를 띄우지 말 것. 메모리 한도에 붙어 있을 때 본체를 죽인다(2026-10-03, API 4분 중단).
- **Prometheus 지표 수집은 주석 처리로 꺼 둔 상태**(2026-10). 수집 서버 없이 앱이 지표만 메모리에 쌓고 있었고, 라벨에 실제 URL을 넣어 시계열이 끝없이 늘어나는 누수가 있었다. `src/metrics/`·`prometheus/`·`grafana/`·compose의 주석 블록은 그대로 남겨 뒀다. 다시 켜려면 `app.module.ts` 상단 주석의 안내대로 주석을 풀고, 라벨은 라우트 패턴으로 쓴다.
- `/metrics`와 auth 라우트는 보안 강화돼 있음(외부 차단·레이트리밋, commit `1f43086`). auth 컨트롤러는 `@Throttle`로 별도 강한 제한, 전역은 느슨(`ttl 60s / limit 100`).

## 함정 / 정리 후보

- `main.ts`에 **모든 요청을 찍는 디버그 미들웨어**(`console.log('요청 수신됨', ...)` + 쿠키 출력)가 남아 있다. 운영 로그 노이즈이고 쿠키를 평문 출력하므로 손대는 김에 제거 검토.
- Swagger 셋업 경로는 `/api-docs` (README의 `/api`와 다름 — 코드가 정답).
