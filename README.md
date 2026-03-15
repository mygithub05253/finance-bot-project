# 금융 뉴스 스크랩 & 투자 리서치 자동화 봇

> 개인용 금융 뉴스 큐레이션 + 아카이빙 자동화 도구
> Perplexity 자동 수집 + Claude AI 분류 + 카카오톡 알림 + 웹 대시보드

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
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui | 웹 대시보드 |
| **api-server** | Spring Boot 3.x (Java 17), JPA, Flyway | 핵심 CRUD API |
| **ai-service** | Node.js (Express) | AI 오케스트레이터 |
| **Database** | Supabase (PostgreSQL 15) | 뉴스/종목 아카이브 |
| **Cache** | Redis | URL 중복 방지 (TTL) |
| **자동화** | n8n Cloud | 매일 07:00 KST 스케줄러 |
| **배포** | Vercel (FE), Railway (BE) | 호스팅 |

---

## 프로젝트 구조

```
finance-bot-project/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI: 빌드 + 테스트
├── .claude/                    # Claude 컨텍스트 파일
├── docs/
│   ├── PRD/PRD.md              # 제품 요구사항 문서 (v1.2)
│   └── velog/                  # Velog 포스팅 초안
├── api-server/                 # Spring Boot 3.x
├── ai-service/                 # Node.js Express
├── frontend/                   # Next.js 15
├── data-service/               # FastAPI (Level 2 이후)
├── infra/
│   ├── docker-compose.yml      # 로컬 개발용 (PostgreSQL + Redis)
│   └── n8n/workflows/          # n8n 워크플로우 JSON
└── README.md
```

---

## 로컬 실행 방법

### 사전 요구사항
- Java 17+
- Node.js 18+
- Docker Desktop

### 1. 로컬 인프라 실행
```bash
cd infra
docker-compose up -d
```

PostgreSQL(`localhost:5432`), Redis(`localhost:6379`) 컨테이너가 실행됩니다.

### 2. 환경변수 설정

**api-server** (`api-server/src/main/resources/application-local.yml`)
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/financebot
    username: postgres
    password: localdev
```

**ai-service** (`ai-service/.env`)
```
# .env.example 파일을 복사하여 실제 값으로 채워주세요
cp ai-service/.env.example ai-service/.env
```

**frontend** (`frontend/.env.local`)
```
cp frontend/.env.local.example frontend/.env.local
```

### 3. 서비스 실행
```bash
# api-server
cd api-server && ./gradlew bootRun --args='--spring.profiles.active=local'

# ai-service
cd ai-service && npm run start:dev

# frontend
cd frontend && npm run dev
```

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

## API 엔드포인트

상세 API 명세: [`.claude/api.md`](.claude/api.md)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/v1/stocks` | 관심 종목 목록 조회 |
| POST | `/api/v1/stocks` | 관심 종목 등록 |
| PUT | `/api/v1/stocks/{id}` | 관심 종목 수정 |
| DELETE | `/api/v1/stocks/{id}` | 관심 종목 비활성화 |
| GET | `/api/v1/news` | 뉴스 목록 조회 (필터 지원) |
| POST | `/api/v1/ai/news/register` | 수동 URL 등록 (ai-service) |

---

## 개발 진행 현황

### Week 1: BE 기초 (진행 중)
- [x] 모노레포 구조 세팅
- [x] Docker Compose (PostgreSQL + Redis) 설정
- [x] Spring Boot api-server: stock CRUD API
- [x] Flyway 마이그레이션 초기 스키마
- [x] GitHub Actions CI 설정

### Week 2: AI 파이프라인 (예정)
- [ ] Node.js ai-service 세팅 (Express + 서비스 구조)
- [ ] Perplexity API 연동
- [ ] n8n 워크플로우 구성
- [ ] Claude 수동 등록 분류 API
- [ ] Redis 중복 방지 구현

### Week 3: 알림 & 프론트엔드 (예정)
- [ ] 카카오톡 REST API 연동
- [ ] Next.js 대시보드 (뉴스 카드 목록)
- [ ] 수동 URL 등록 UI

### Week 4: 배포 & 검증 (예정)
- [ ] Railway 배포
- [ ] Supabase 프로덕션 연결
- [ ] Vercel 배포
- [ ] n8n Cloud 실 운영

---

## 관련 포스팅 (Velog 시리즈)

**[금융 뉴스 큐레이터] n8n + AI로 나만의 투자 뉴스 아카이브 만들기**

- [#1 설계 편 - Spring Boot + Node.js + n8n 아키텍처 설계](https://velog.io/@kik328288/posts) *(작성 예정)*
- [#2 AI 파이프라인 편 - Perplexity + Claude API 연동](https://velog.io/@kik328288/posts) *(작성 예정)*
- [#3 배포 완성 편 - 카카오톡 알림 + Railway/Vercel 배포](https://velog.io/@kik328288/posts) *(작성 예정)*

---

## 라이선스

개인 프로젝트 (포트폴리오 목적)
