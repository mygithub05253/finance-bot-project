# 금융 뉴스 스크랩 & 투자 리서치 자동화 봇

> 개인용 금융 뉴스 큐레이션 + 아카이빙 자동화 도구
> Perplexity 자동 수집 + Claude AI 분류 + 카카오톡 알림 + Next.js 웹 대시보드

[![CI](https://github.com/mygithub05253/finance-bot-project/actions/workflows/ci.yml/badge.svg)](https://github.com/mygithub05253/finance-bot-project/actions/workflows/ci.yml)

---

## 개요

매일 아침 관심 종목의 최신 뉴스를 AI가 수집·요약하여 카카오톡으로 발송하고, 웹 대시보드에서 날짜/종목/카테고리별로 뉴스 이력을 검색할 수 있는 개인 투자 보조 도구입니다.

**핵심 기능:**
- 매일 07:30 이전 카카오톡으로 관심 종목 뉴스 요약 자동 수신
- URL 입력 시 Claude AI가 3초 이내 종목 분류·요약 후 아카이브 저장
- 웹 대시보드에서 뉴스 이력 검색 (날짜, 종목, 카테고리 필터)

---

## 시스템 아키텍처

```
[Next.js FE (Vercel)]
        ↓ REST API
[Spring Boot api-server (Railway)]  ←→  [Supabase PostgreSQL + Redis (Railway)]
        ↓ HTTP (내부, X-Internal-Secret)       ↕
[Node.js ai-service (Railway)]       [n8n Cloud (Scheduler 07:00 KST)]
        ↓ External API
[Perplexity API]  [Claude API]  [카카오톡 REST API]
```

---

## 기술 스택

| 서비스 | 기술 | 역할 |
|--------|------|------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query | 웹 대시보드 |
| **api-server** | Spring Boot 3.2 (Java 21), JPA, Flyway | 핵심 CRUD API |
| **ai-service** | Node.js 20 (Express) | AI 오케스트레이터 |
| **Database** | Supabase (PostgreSQL 15) | 뉴스/종목 아카이브 |
| **Cache** | Redis | URL 중복 방지 (TTL) |
| **자동화** | n8n Cloud | 매일 07:00 KST 스케줄러 |
| **배포** | Vercel (FE), Railway (BE + Redis) | 호스팅 |

---

## 프로젝트 구조

```
finance-bot-project/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI (Java + Node.js + Next.js)
├── .claude/                    # Claude 컨텍스트 파일 (db.md, api.md, security.md)
├── docs/
│   ├── PRD/PRD.md              # 제품 요구사항 문서 (v1.9)
│   ├── deploy/                 # 배포 가이드 (Railway, Supabase, Vercel, n8n)
│   ├── monitoring/             # KPI 모니터링 체크리스트
│   └── velog/                  # Velog 포스팅 초안 (#1~#6)
├── api-server/                 # Spring Boot 3.2 (Java 21)
│   ├── Dockerfile              # multi-stage build (JDK21 → JRE21-alpine)
│   └── src/main/resources/
│       ├── application.yml
│       ├── application-local.yml
│       └── application-prod.yml
├── ai-service/                 # Node.js 20 (Express)
│   ├── Dockerfile              # node:20-alpine
│   └── src/
│       ├── services/           # perplexity, claude, kakao, dedup
│       └── controllers/        # news, notify
├── frontend/                   # Next.js 15 (App Router)
│   ├── Dockerfile              # standalone build
│   └── app/
│       ├── page.tsx            # 뉴스 대시보드
│       ├── stocks/             # 종목 관리
│       ├── register/           # URL 등록
│       └── news/[id]/          # 뉴스 상세
├── infra/
│   ├── docker-compose.yml      # 로컬 개발용 (PostgreSQL + Redis)
│   └── n8n/workflows/
│       └── daily-news-collection.json  # n8n Cloud 임포트용 워크플로우
└── README.md
```

---

## 로컬 실행 방법

### 사전 요구사항

- **Java 21+** (api-server)
- **Node.js 20+** (ai-service, frontend)
- **Docker Desktop** (로컬 PostgreSQL + Redis)

### 1. 레포지토리 클론

```bash
git clone https://github.com/mygithub05253/finance-bot-project.git
cd finance-bot-project
```

### 2. 로컬 인프라 실행 (PostgreSQL + Redis)

```bash
cd infra
docker-compose up -d
```

> PostgreSQL: `localhost:5432` (DB: `financebot`, user: `postgres`, pw: `localdev`)
> Redis: `localhost:6379`

### 3. 환경변수 설정

**ai-service**
```bash
cp ai-service/.env.example ai-service/.env
# .env 파일에서 아래 값을 실제 값으로 채워주세요:
# PERPLEXITY_API_KEY=
# CLAUDE_API_KEY=
# KAKAO_REST_API_KEY=
# KAKAO_ACCESS_TOKEN=
# INTERNAL_API_SECRET=local-dev-secret
```

**frontend**
```bash
cp frontend/.env.local.example frontend/.env.local
# 기본값으로 로컬 실행 가능 (별도 수정 불필요)
# NEXT_PUBLIC_API_SERVER_URL=http://localhost:8080
# NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:3001
```

> api-server는 `application-local.yml`에 DB 설정이 고정되어 있어 별도 환경변수 불필요

### 4. 서비스 실행 (터미널 3개)

```bash
# 터미널 1: api-server (포트 8080)
cd api-server
./gradlew bootRun --args='--spring.profiles.active=local'

# 터미널 2: ai-service (포트 3001)
cd ai-service
npm install
npm run start:dev

# 터미널 3: frontend (포트 3000)
cd frontend
npm install
npm run dev
```

### 5. 접속 확인

| 서비스 | URL |
|--------|-----|
| 웹 대시보드 | http://localhost:3000 |
| 뉴스 대시보드 | http://localhost:3000 |
| 종목 관리 | http://localhost:3000/stocks |
| URL 등록 | http://localhost:3000/register |
| api-server | http://localhost:8080/api/v1/stocks |
| ai-service 헬스 | http://localhost:3001/health |

---

## 배포 가이드

실제 클라우드 배포는 `docs/deploy/` 폴더의 가이드를 순서대로 따라주세요:

1. [`docs/deploy/railway-guide.md`](docs/deploy/railway-guide.md) — Railway api-server + ai-service + Redis
2. [`docs/deploy/supabase-guide.md`](docs/deploy/supabase-guide.md) — Supabase 프로덕션 DB
3. [`docs/deploy/vercel-guide.md`](docs/deploy/vercel-guide.md) — Vercel Next.js 배포
4. [`docs/deploy/n8n-cloud-guide.md`](docs/deploy/n8n-cloud-guide.md) — n8n Cloud 워크플로우 + 카카오 토큰

---

## API 엔드포인트

상세 API 명세: [`.claude/api.md`](.claude/api.md)

| 메서드 | 경로 | 서비스 | 설명 |
|--------|------|--------|------|
| GET | `/api/v1/stocks` | api-server | 관심 종목 목록 조회 |
| POST | `/api/v1/stocks` | api-server | 관심 종목 등록 |
| PUT | `/api/v1/stocks/{id}` | api-server | 관심 종목 수정 |
| DELETE | `/api/v1/stocks/{id}` | api-server | 관심 종목 비활성화 |
| GET | `/api/v1/news` | api-server | 뉴스 목록 조회 (필터: stockId, category, fromDate) |
| POST | `/api/news/register` | ai-service | URL 수동 등록 (Claude 분류/요약) |
| POST | `/api/news/batch` | ai-service | n8n 배치 수집 (Perplexity) |
| POST | `/api/notify/daily` | ai-service | 카카오톡 일일 발송 |
| GET | `/health` | ai-service | 헬스체크 |

---

## 개발 진행 현황

### Week 1: BE 기초 ✅ 완료
- [x] 모노레포 구조 세팅 (api-server, ai-service, frontend, data-service)
- [x] Docker Compose (PostgreSQL + Redis) 로컬 인프라
- [x] Spring Boot api-server: stock CRUD API + Flyway 마이그레이션
- [x] GitHub Actions CI (Java + Node.js + Next.js 병렬 빌드)
- [x] Next.js 15 프론트엔드 기본 세팅

### Week 2: AI 파이프라인 ✅ 완료
- [x] parseJson 유틸 + AppError + Redis 싱글톤 + 컨트롤러 레이어 분리
- [x] Perplexity API 연동 (재시도, 유효성 검증, 단위 테스트 8개)
- [x] Claude 분류 API (sentiment/category 검증, 단위 테스트 11개)
- [x] Redis 중복 방지 dedup.service (자동 24h/수동 7d TTL, 단위 테스트 10개)
- [x] api-server news CRUD (NewsArticle + NewsSummary + JSONB keywords)

### Week 3: 알림 & 프론트엔드 ✅ 완료
- [x] 카카오톡 나에게 보내기 API 연동 (memo API, 테스트 13개)
- [x] Next.js 15 대시보드 (뉴스 카드, 필터, 스켈레톤, 상세 페이지)
- [x] 종목 관리 페이지 + 수동 URL 등록 UI (3초 이내 결과)
- [x] CORS 설정 (api-server + ai-service), PostgreSQL null 타입 오류 수정
- [x] Velog #4 CI/CD 파이프라인 삽질기 작성

### Week 4: 배포 준비 ✅ 완료 (실제 클라우드 배포는 별도 진행)
- [x] Dockerfile 생성 (api-server multi-stage, ai-service, frontend)
- [x] Supabase 프로덕션 설정 (SSL, HikariCP 안정성 옵션)
- [x] Next.js standalone 빌드 + 보안 헤더
- [x] n8n 워크플로우 JSON (`infra/n8n/workflows/daily-news-collection.json`)
- [x] 배포 가이드 문서 4종 (`docs/deploy/`)
- [x] KPI 모니터링 체크리스트 (`docs/monitoring/`)

---

## 관련 포스팅 (Velog 시리즈)

**[금융 뉴스 큐레이터] n8n + AI로 나만의 투자 뉴스 아카이브 만들기**

- [#1 설계 편 - Spring Boot + Node.js + n8n 아키텍처 설계](docs/velog/01-design.md) *(업로드 예정)*
- [#2 Spring Boot api-server CRUD 구현](docs/velog/02-spring-boot-crud.md) *(업로드 예정)*
- [#3 AI 파이프라인 - Perplexity + Claude + Redis](docs/velog/03-ai-pipeline.md) *(업로드 예정)*
- [#4 GitHub Actions CI 구축 삽질기](docs/velog/04-ci-cd-pipeline.md) *(업로드 예정)*
- [#5 카카오톡 알림 + Next.js 15 대시보드](docs/velog/05-kakao-frontend.md) *(업로드 예정)*
- [#6 Railway + Vercel + n8n 배포기](docs/velog/06-week4-deploy.md) *(업로드 예정)*

> Velog 주소는 업로드 후 업데이트 예정

---

## 데이터 모델

```
stock ──────────────────────────────┐
  └──< news_summary >──< news_article
              ↓
       notification_log
```

상세 ERD: [`.claude/db.md`](.claude/db.md)

---

## 라이선스

개인 프로젝트 (포트폴리오 목적)
