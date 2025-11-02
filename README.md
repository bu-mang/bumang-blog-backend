# Bumang Blog Backend

NestJS 기반의 개인 블로그 플랫폼 백엔드입니다.

## 개요

JWT 인증, AWS S3 통합, 완전한 관찰성 스택(Prometheus + Grafana), Docker 기반 배포 및 SSL/TLS 지원을 갖춘 종합 블로그 API 시스템입니다.

**기술 스택:** NestJS 10 · TypeScript 5.7 · PostgreSQL 15 · TypeORM · Docker · Nginx · Prometheus · Grafana

## 주요 기능

### 핵심 기능
- **블로그 포스트 관리**: 마크다운 지원, 썸네일, 조회수, 좋아요 등을 포함한 완전한 CRUD 작업
- **콘텐츠 구조화**: 그룹(Groups), 카테고리(Categories), 태그(Tags)를 활용한 계층적 구조
- **사용자 인증**: JWT 기반 인증, Refresh Token 로테이션, 역할 기반 접근 제어
- **댓글 시스템**: 작성자 추적이 가능한 사용자 댓글
- **AWS S3 통합**: 안전한 클라이언트 측 업로드를 위한 Presigned URL 패턴

### 고급 기능
- **이중 토큰 시스템**: 액세스 토큰(단기) + 리프레시 토큰(장기, DB 영구 저장)
- **선택적 인증**: 공개 콘텐츠와 인증 콘텐츠 모두 지원
- **관련 포스트 알고리즘**: 이전/다음 포스트 탐색을 포함한 스마트 콘텐츠 발견
- **스케줄 작업**: Cron 스케줄링을 통한 자동 정리 작업
- **권한 레벨**: 역할 기반 및 소유자 기반 가드를 통한 세밀한 접근 제어

### CI/CD 및 고급 모니터링 기능을 학습하기 위한 테스트 배드
- **관찰성**: Prometheus 메트릭, Winston 구조화 로깅, Grafana 대시보드
- **보안**: Let's Encrypt SSL을 통한 HTTPS, bcrypt 패스워드 해싱, httpOnly 쿠키, CORS 화이트리스트
- **성능**: Docker 메모리 제한, 로그 로테이션, 데이터베이스 쿼리 최적화, 페이지네이션
- **문서화**: 포괄적인 Swagger/OpenAPI 명세

## 아키텍처

```
📦 bumang-blog-backend
├── 🔐 인증 모듈
│   ├── JWT 전략 (Passport)
│   ├── Refresh Token 로테이션
│   ├── 역할 기반 가드 (USER, ADMIN)
│   └── 소유자 기반 리소스 가드
├── 📝 블로그 포스트 모듈
│   ├── CRUD 작업
│   ├── 조회수 & 좋아요
│   ├── 관련 포스트
│   └── 이전/다음 탐색
├── 🗂️ 콘텐츠 구조화
│   ├── 그룹 (최상위)
│   ├── 카테고리 (계층적)
│   └── 태그 (다대다)
├── 💬 댓글 시스템
├── 👤 사용자 관리
├── ☁️ AWS S3 통합
├── 📊 메트릭 & 모니터링
│   ├── Prometheus 메트릭
│   ├── Winston 로깅
│   └── Grafana 대시보드
└── ⏰ 스케줄 작업
```

## 데이터베이스 스키마

### 엔티티 관계

```
UserEntity (1) ──< (N) PostEntity (N) ──> (M) TagsEntity
                          │
                          ├──> (1) CategoryEntity (N) ──> (1) GroupEntity
                          │
                          └──< (N) CommentEntity (N) ──> (1) UserEntity
```

### 핵심 엔티티
- **User**: nickname, email, password (해시화), role, refreshToken
- **Post**: title, content, previewText, thumbnailUrl, type, readPermission, likes, view
- **Category**: label, order (그룹당 고유)
- **Group**: label, order
- **Tag**: title (포스트와 다대다 관계)
- **Comment**: content, author, post

## API 엔드포인트

### 인증
```
POST   /auth/signup     회원가입
POST   /auth/login      로그인 (httpOnly 쿠키 설정)
POST   /auth/logout     로그아웃 및 토큰 무효화
POST   /auth/refresh    액세스 토큰 갱신
```

### 블로그 포스트
```
GET    /posts                      공개 포스트 목록 (필터링)
GET    /posts/authenticated        인증 필요 포스트 목록
POST   /posts                      포스트 생성 [인증 필요]
GET    /posts/:id                  포스트 상세
GET    /posts/:id/related          관련 포스트
GET    /posts/:id/adjacent         이전/다음 포스트
PATCH  /posts/:id                  포스트 수정 [소유자]
DELETE /posts/:id                  포스트 삭제 [소유자]
POST   /posts/:id/likes            좋아요 증가
POST   /posts/:id/view             조회수 증가
```

### 기타 모듈
- **Categories**: CRUD 작업, 그룹 연관
- **Tags**: CRUD 작업, 포스트 태깅
- **Comments**: CRUD 작업, 작성자 추적
- **Users**: 프로필 관리
- **S3**: Presigned URL 생성 (60초 만료)
- **Metrics**: Prometheus 스크랩 엔드포인트

전체 API 문서는 `/api` (Swagger UI)에서 확인 가능합니다.

## 기술 스택

### 백엔드 프레임워크
- **NestJS 10**: 의존성 주입을 사용한 모듈식 아키텍처
- **TypeScript 5.7**: 타입 안전 개발
- **Express**: 기본 HTTP 서버

### 데이터베이스 & ORM
- **PostgreSQL 15** (Alpine): 프로덕션 데이터베이스
- **TypeORM 0.3**: 엔티티 관리, 마이그레이션, 쿼리 빌더

### 인증 & 보안
- **Passport.js + JWT**: 토큰 기반 인증
- **bcrypt**: 패스워드 해싱
- **Cookie-parser**: 안전한 쿠키 처리
- **class-validator**: 입력 유효성 검증

### 클라우드 & 스토리지
- **AWS S3**: Presigned URL을 사용한 파일 저장
- **클라이언트 측 업로드**: 브라우저에서 S3로 직접 업로드

### 관찰성
- **Prometheus**: 메트릭 수집 (HTTP 요청, 인증 시도, 포스트 조회)
- **Grafana**: 시각화 대시보드
- **Winston**: 구조화 로깅 (app.log, error.log, exceptions.log)
- **Node Exporter**: 시스템 메트릭
- **PostgreSQL Exporter**: 데이터베이스 메트릭

### 배포
- **Docker**: 멀티 컨테이너 오케스트레이션
- **Nginx**: SSL 종료를 포함한 리버스 프록시
- **Let's Encrypt**: 자동 SSL 인증서 관리
- **Docker Compose**: 프로덕션 환경 설정

## 프로젝트 구조

```
src/
├── auth/                    # 인증 & 권한 부여
│   ├── decorators/         # @Roles, @IsOwner
│   ├── guards/             # JWT, Refresh, Optional, Roles, Owner
│   └── strategies/         # Passport JWT 전략
├── posts/                   # 블로그 포스트 관리
│   ├── dto/                # Create, Update, Response DTOs
│   ├── entities/           # Post 엔티티
│   └── const/              # Post type enum
├── categories/             # 카테고리 & 그룹 시스템
├── tags/                   # 태그 관리
├── comments/               # 댓글 시스템
├── users/                  # 사용자 관리
│   └── const/              # Roles enum
├── s3/                     # AWS S3 통합
├── tasks/                  # 스케줄 작업 모듈
├── metrics/                # Prometheus 메트릭 서비스
├── logger/                 # Winston 설정
├── interceptors/           # 로깅 인터셉터
├── common/                 # 공유 유틸리티
│   ├── decorator/          # @CurrentUser
│   ├── dto/                # PaginatedResponse, CurrentUser
│   └── constant/           # Cookie 옵션
├── migrations/             # TypeORM 마이그레이션
├── app.module.ts           # 루트 모듈
├── data-source.ts          # TypeORM 설정
└── main.ts                 # 부트스트랩
```

## 설정 및 개발

### 사전 요구사항
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+
- AWS 계정 (S3용)

### 환경 변수

`.env.development` 또는 `.env.production` 파일 생성:

```bash
NODE_ENV=development
APP_PORT=3000

# Database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=bumang_blog
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# JWT
JWT_SECRET=your-super-secret-jwt-key

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-northeast-2
AWS_BUCKET_NAME=your-bucket-name

# Grafana (선택)
GF_SECURITY_ADMIN_PASSWORD=admin_password
```

### 설치

```bash
# 의존성 설치
npm install

# 마이그레이션 실행
npm run migration:run
```

### 애플리케이션 실행

```bash
# 개발 모드 (핫 리로드)
npm run start:dev

# 프로덕션 빌드
npm run build
npm run start:prod

# Docker 개발 환경
npm run dev:restart

# Docker 개발 (볼륨 초기화)
npm run dev:restart:clean
```

### 데이터베이스 마이그레이션

```bash
# 엔티티 변경사항으로부터 마이그레이션 생성
npm run migration:generate -- src/migrations/MigrationName

# 대기 중인 마이그레이션 실행
npm run migration:run

# 마지막 마이그레이션 되돌리기
npm run migration:revert
```

### 로깅

```bash
# 애플리케이션 로그 모니터링
npm run logs

# 에러 로그 모니터링
npm run logs:error
```

### 테스트

```bash
# 유닛 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 테스트 커버리지
npm run test:cov

# Watch 모드
npm run test:watch
```

## Docker 배포

### 프로덕션 설정

```bash
# 모든 서비스 빌드 및 시작
docker-compose -f docker-compose.prod.yaml up -d --build

# 로그 확인
docker-compose -f docker-compose.prod.yaml logs -f app

# 서비스 중지
docker-compose -f docker-compose.prod.yaml down
```

### 서비스 목록
- **app** (NestJS): 메인 애플리케이션 서버
- **postgres**: 영구 볼륨을 사용한 데이터베이스
- **nginx**: 리버스 프록시 (포트 80, 443)
- **prometheus**: 메트릭 수집
- **grafana**: 대시보드 (포트 3100)
- **node-exporter**: 시스템 메트릭
- **postgres-exporter**: 데이터베이스 메트릭

### SSL 인증서 설정

```bash
# 초기 인증서 생성
docker-compose -f docker-compose.prod.yaml run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d your-domain.com -d www.your-domain.com

# 자동 갱신 (docker-compose에 설정됨)
# 인증서는 12시간마다 자동 갱신됩니다
```

## 설정 하이라이트

### 쿠키 설정
- 액세스 토큰: 단기, httpOnly
- 리프레시 토큰: 장기, httpOnly, DB 영구 저장
- 프로덕션: Secure 플래그 활성화, SameSite='none'
- 프로덕션에서 도메인 특정

### CORS 화이트리스트
- `localhost:4000` (개발 환경)
- `bumang.xyz`, `www.bumang.xyz` (프로덕션)
- Credentials: 활성화 (쿠키용)

### Prometheus 메트릭
- HTTP 요청 수 및 지속 시간
- 인증 시도 (성공/실패)
- 포스트 조회수 및 좋아요
- 커스텀 비즈니스 메트릭
- 프로덕션에서 5분 집계

### 로그 로테이션
- 애플리케이션 로그: 최대 50MB
- 에러 로그: 최대 20MB
- 예외 로그: 최대 20MB
- 자동 파일 로테이션

### 리소스 제한
- App 컨테이너: 512MB 메모리
- PostgreSQL: 256MB 메모리
- Prometheus 보관: 7일, 최대 500MB
- Grafana: 128MB 메모리

## 모니터링 & 관찰성

### Prometheus 메트릭 (`:9090`)
- 커스텀 애플리케이션 메트릭
- HTTP 요청/응답 추적
- 인증 성공/실패율
- 포스트 참여도 (조회수, 좋아요)
- 시스템 메트릭 (CPU, 메모리, 디스크)
- 데이터베이스 메트릭 (연결, 쿼리)

### Grafana 대시보드 (`:3100`)
- 애플리케이션 성능 개요
- HTTP 요청 분석
- 데이터베이스 성능
- 시스템 리소스 활용도
- 커스텀 비즈니스 메트릭

### Winston 로깅
```javascript
// 로그 파일 위치: ./logs/
// - app.log: 일반 애플리케이션 로그
// - error.log: 에러 레벨 로그
// - exceptions.log: 잡히지 않은 예외
```

## API 문서

대화형 Swagger 문서:
- **개발 환경**: `http://localhost:3000/api`
- **프로덕션**: `https://your-domain.com/api`

기능:
- 완전한 엔드포인트 문서
- 요청/응답 스키마
- Bearer 토큰 인증 테스트
- Try-it-out 기능

## 보안 기능

### 인증
- 시크릿 기반 서명을 사용한 JWT
- 리프레시 토큰 로테이션
- 데이터베이스 영구 저장 리프레시 토큰
- 쿠키 기반 토큰 전달 (httpOnly, secure)

### 권한 부여
- 역할 기반 접근 제어 (USER, ADMIN)
- 소유자 기반 리소스 가드
- 공개 콘텐츠에 대한 선택적 인증

### 입력 유효성 검증
- class-validator와 엄격한 규칙
- 화이트리스트 유효성 검증 (알 수 없는 속성 제거)
- 화이트리스트에 없는 속성 금지
- 타입 변환 및 새니타이제이션

### 네트워크 보안
- HSTS를 통한 HTTPS 강제
- Let's Encrypt SSL 인증서
- CORS 화이트리스트
- Nginx 리버스 프록시

### 패스워드 보안
- bcrypt 해싱 (10 라운드)
- 평문 저장 없음
- 안전한 패스워드 재설정 플로우

## 성능 최적화

- **페이지네이션**: 대용량 데이터셋 처리
- **데이터베이스 인덱싱**: 최적화된 쿼리
- **로그 로테이션**: 디스크 오버플로우 방지
- **메모리 제한**: 컨테이너 리소스 제한
- **커넥션 풀링**: 데이터베이스 연결
- **메트릭 집계**: 5분 간격
- **S3 Presigned URL**: 직접 클라이언트 업로드
- **스테이트리스 인증**: 수평 확장을 위한 JWT

## 개발 도구

- **ESLint**: TypeScript 규칙을 사용한 코드 린팅
- **Prettier**: 코드 포맷팅
- **ts-node-dev**: 개발 환경에서 핫 리로드
- **Jest**: 유닛 및 E2E 테스트 프레임워크
- **TypeORM CLI**: 마이그레이션 관리
- **Swagger**: API 문서 자동 생성

## 프로젝트 통계

- **약 5,124줄**의 TypeScript 코드
- **8개 핵심 모듈** (Auth, Posts, Categories, Tags, Comments, Users, S3, Tasks)
- **7개 엔티티**와 복잡한 관계
- **20개 이상의 API 엔드포인트**
- Docker 배포를 통한 **프로덕션 준비 완료**

## 고유한 강점

### 1. 엔터프라이즈급 관찰성
Prometheus 메트릭, Winston 구조화 로깅, Grafana 대시보드를 포함한 완전한 관찰성 스택을 기본 제공합니다.

### 2. 정교한 인증 시스템
리프레시 로테이션을 포함한 이중 토큰 시스템, 쿠키 기반 전달, 공개 및 인증 콘텐츠 모두 지원합니다.

### 3. 프로덕션 준비 완료된 배포
Nginx 리버스 프록시, SSL 자동화, 리소스 제한을 포함한 완전한 Docker 설정. 설정 불필요 배포.

### 4. 보안 우선 설계
HTTPS 강제, 입력 유효성 검증, HSTS 헤더, 안전한 쿠키 처리를 포함한 다층 보안.

### 5. 개발자 경험
핫 리로드, 포괄적인 Swagger 문서, TypeScript strict 모드, 마이그레이션 시스템, 구조화 로깅.

### 6. 확장성 고려사항
스테이트리스 인증, 데이터베이스 풀링, 메트릭 집계, 컨테이너 리소스 관리.

## 라이선스

UNLICENSED - 비공개 프로젝트

## 작성자

Bumang

---

**프로덕션 URL**: https://bumang.xyz
