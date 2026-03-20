# PRD - 금융 뉴스 스크랩 및 투자 리서치 자동화 봇

---

## 메타 정보
| 항목 | 내용 |
|------|------|
| **버전** | v1.9 |
| **작성일** | 2026-03-20 |
| **상태** | 확정 |
| **작성자** | 개인 프로젝트 |

### 변경 이력
| 버전 | 날짜 | 내용 |
|------|------|------|
| v1.0 | 2026-03-15 | 초안 작성 |
| v1.1 | 2026-03-15 | MySQL → Supabase(PostgreSQL)로 전환. MCP 전략 업데이트 |
| v1.2 | 2026-03-15 | MVP 개발 계획 Supabase 반영, Week 4 배포 대상 수정 |
| v1.3 | 2026-03-15 | Week 1 완료 반영 (모노레포, Spring Boot CRUD, CI, Next.js 세팅) |
| v1.4 | 2026-03-16 | 개발 워크플로우 개선 (브랜치 전략, Velog 연계, Skill.md 가이드 강화) |
| v1.5 | 2026-03-16 | Week 2 세분화: 6개 브랜치, ai-service 품질 이슈 개선 항목 명시, api-server news 도메인 추가 |
| v1.6 | 2026-03-16 | Week 2 완료 반영 — 5개 브랜치 구현 완료 (PR #4~#8) |
| v1.7 | 2026-03-17 | Week 3 완료 반영 — 5개 브랜치 구현 완료 (PR #15~#19), CI 버그 수정 포함 |
| v1.8 | 2026-03-20 | Week 3 후속 작업 반영 — Velog #4 추가, API 연결 버그 수정, Week 4 세분화 |
| v1.9 | 2026-03-20 | Week 4 배포 준비 완료 반영 — Dockerfile, Supabase SSL, n8n 워크플로우, Vercel 설정, 모니터링 체크리스트, Velog #6 초안 |

---

## 1. 프로젝트 개요

- **이름**: 금융 뉴스 스크랩 및 투자 리서치 자동화 봇
- **목적**: 개인용 금융 뉴스 큐레이션 및 아카이빙 자동화 도구
- **대상 사용자**: 개인 (1인 사용, 인증 불필요)
- **알림 채널**: 카카오톡 개인 메시지

---

## 2. 문제 정의

### As-Is (현재 상태)
- 카카오톡, 뉴스 앱, 증권사 앱을 오가며 관심 종목 뉴스를 수동으로 탐색
- 읽은 뉴스의 히스토리를 관리할 수 없음 (다음 날 검색 불가)
- 종목별 뉴스 흐름 파악이 어려움

### To-Be (목표 상태)
- 매일 아침 07:30 이전 카카오톡으로 관심 종목 뉴스 자동 수신
- 흥미로운 뉴스 URL을 붙여넣으면 AI가 자동으로 분류·요약하여 아카이브에 저장
- 웹 대시보드에서 날짜/종목/카테고리별로 뉴스 이력 검색 가능

---

## 3. 목표 및 성공 지표 (KPI)

| 지표 | 목표 | 측정 방법 |
|------|------|---------|
| 자동 발송 성공률 | 평일 07:30 이전 수신 95% | notification_log 집계 |
| 중복 저장 방지 | 동일 URL 중복 0건 | Redis URL 해시 검증 |
| 수동 등록 처리 속도 | URL 입력 후 3초 이내 분류 완료 | ai-service 응답 시간 |
| 아카이브 누적 | 1개월 내 100건 이상 | news_article 카운트 |

---

## 4. 사용자 스토리

- **US-1**: 평일 아침에 카카오톡으로 관심 종목의 최신 뉴스 요약을 받는다.
- **US-2**: 웹에서 뉴스 URL을 붙여넣으면 3초 안에 종목 분류·요약 결과를 볼 수 있다.
- **US-3**: 대시보드에서 날짜, 종목, 카테고리 필터로 과거 뉴스를 검색할 수 있다.
- **US-4**: 관심 종목을 추가/제거하면 다음 날부터 해당 종목 뉴스가 자동 반영된다.

---

## 5. 기능 요구사항 (MoSCoW)

### Must Have (MVP)
| ID | 기능 | 담당 서비스 |
|----|------|------------|
| M1 | 관심 종목 CRUD (ticker, 종목명, 섹터) | api-server |
| M2 | n8n 스케줄러 → Perplexity 자동 수집 → DB 저장 | n8n + ai-service |
| M3 | 수동 URL 등록 → Claude 분류/요약 (3초 이내) | ai-service |
| M4 | 카카오톡 개인 메시지 발송 | ai-service |
| M5 | Redis 중복 방지 (자동 24h TTL, 수동 7d TTL) | ai-service |
| M6 | 웹 대시보드: 뉴스 카드 목록 + 종목 관리 | frontend |

### Should Have
| ID | 기능 |
|----|------|
| S1 | 뉴스 카테고리 자동 분류 (실적, 규제, M&A, 인사 등) |
| S2 | 감성 분석 태깅 (POSITIVE / NEUTRAL / NEGATIVE) |

### Could Have
| ID | 기능 |
|----|------|
| C1 | 뉴스 빈도 통계 차트 (종목별 월별) |
| C2 | 북마크 기능 |

### Won't Have (이번 레벨 제외)
| 기능 | 제외 이유 |
|------|----------|
| 멀티유저 / 인증 | 개인 도구 |
| 주가 차트 연동 | 범위 초과 |
| 모바일 앱 | 웹으로 충분 |
| FastAPI 데이터 분석 | Level 2 이후 구현 |

---

## 6. 시스템 아키텍처

```
[Next.js FE (Vercel)]
        ↓ REST API
[Spring Boot api-server (Railway)]  ←→  [Supabase PostgreSQL + Redis (Railway)]
        ↓ HTTP (내부)                          ↕
[Node.js ai-service (Railway)]       [n8n Cloud (Scheduler)]
        ↓ External API
[Perplexity API]  [Claude API]  [카카오톡 REST API]
```

**서비스 역할 요약:**
- **api-server**: 핵심 CRUD (종목, 뉴스 아카이브, 발송 이력)
- **ai-service**: AI 오케스트레이터 (외부 API 연동, 메시지 발송)
- **n8n**: 매일 07:00 KST 자동 수집 스케줄러
- **Supabase**: PostgreSQL 15 호스팅 (무료 500MB, Studio 내장, MCP 공식 지원)

---

## 7. 기술 스택 선택 이유

| 결정 | 이유 |
|------|------|
| Perplexity API | 실시간 웹 검색 내장 → 최신 뉴스 + 출처 URL 자동 제공 |
| Claude API (분류/요약) | 한국어 금융 텍스트 이해, 종목 매핑, 구조화된 JSON 응답 |
| Node.js ai-service | AI SDK 연동이 간결, Promise 기반 비동기 처리 용이 |
| Spring Boot api-server | JPA 기반 CRUD, 타입 안전성, 금융공기업 취업 포트폴리오 목적 |
| FastAPI (data-service) | Level 2 데이터 분석 확장 대비 구조 준비 (pandas, ML) |
| n8n | 스케줄러 시각화, 코드 없이 파이프라인 유지보수 가능 |
| Redis | TTL 기반 중복 방지, 빠른 캐시 조회 |
| **Supabase (PostgreSQL)** | MySQL 대비: JSONB(키워드 GIN 인덱스), TIMESTAMPTZ(KST 처리), 공식 MCP 서버 지원, 무료 500MB, Studio 내장 대시보드 |

---

## 8. 수동 뉴스 등록 플로우

```
사용자: URL 입력
    ↓
ai-service: axios + cheerio로 페이지 크롤링
    ↓
Claude API:
  - 어떤 종목 관련인지 매핑 (stock 목록 제공)
  - 카테고리 분류 (실적/규제/M&A/인사/기타)
  - 3-5줄 한국어 요약
  - 감성 분석 (POSITIVE/NEUTRAL/NEGATIVE)
    ↓
Spring Boot api-server: news_article + news_summary 저장
    ↓
Redis: news:manual:{urlHash} 키 등록 (TTL 7일)
    ↓
응답 반환 (3초 이내 목표)
```

---

## 9. 카카오톡 메시지 포맷

```
📰 [2026-03-15] 오늘의 금융 뉴스

📊 삼성전자 (005930)
  HBM3E 양산 본격화로 2분기 실적 개선 기대.
  출처: https://news.example.com/article/123
─────────────────
📊 SK하이닉스 (000660)
  AI 서버 수요 증가로 D램 가격 상승 전망.
  출처: https://news.example.com/article/456
─────────────────
자동 5건 | 수동 2건
🌐 https://finance-news-bot.vercel.app
```

---

## 10. MVP 개발 계획 (4주)

### Week 1: BE 기초 ✅ 완료
- [x] 모노레포 구조 세팅 (api-server, ai-service, frontend, data-service)
- [x] Docker Compose (PostgreSQL + Redis) — 로컬 개발용 (프로덕션은 Supabase)
- [x] Spring Boot api-server: stock CRUD API (Supabase PostgreSQL 연결)
- [x] Flyway 마이그레이션 초기 스키마 (PostgreSQL 문법)
- [x] GitHub Actions CI 설정
- [x] Next.js 15 프론트엔드 기본 세팅
- [x] README.md 작성 및 GitHub 저장소 push
- [x] GitHub frontend 서브모듈 문제 수정 (160000 → 일반 폴더)

### Week 2: AI 파이프라인 ✅ 완료
- [x] parseJson 유틸 (마크다운 코드블록 제거 + 객체/배열 파싱 우선순위 자동 결정)
- [x] AppError 공통 에러 클래스 + Redis 싱글톤 + 컨트롤러 레이어 분리 (PR #4)
- [x] Perplexity API 연동 — 파싱 개선, 재시도 로직, 유효성 검증, 단위 테스트 8개 (PR #5)
- [x] Claude 분류 API — 파싱 개선, sentiment/category 유효값 검증, 단위 테스트 11개 (PR #6)
- [x] Redis 중복 방지 (dedup.service) — 자동 24h/수동 7d TTL, fallback, 단위 테스트 10개 (PR #7)
- [x] api-server news CRUD (NewsArticle+NewsSummary) + n8n 워크플로우 JSON (PR #8)

### Week 3: 알림 & 프론트엔드 ✅ 완료
- [x] 카카오톡 REST API 수정 (memo API URL 버그 수정 + 테스트 13개) (PR #15)
- [x] api-server News CRUD (NewsArticle + NewsSummary + 내부 인증) (PR #16)
- [x] Next.js 15 기반 설정 (shadcn/ui 스타일, Zustand, TanStack Query, 타입 정의) (PR #17)
- [x] 뉴스 대시보드 (카드 목록, 필터, 스켈레톤, 상세 페이지) (PR #18)
- [x] 종목 관리 페이지 + 수동 URL 등록 UI (3초 이내 결과 표시) (PR #19)
- [x] Velog #4 CI/CD 파이프라인 삽질기 작성 + 시리즈 링크 정비 (PR #21)
- [x] API 연결 버그 수정 (CORS, Flyway 버전, PostgreSQL null 타입 오류) (PR #22)

### Week 4: 배포 & 검증 ✅ 코드/설정 준비 완료 (클라우드 배포는 별도 진행)

> **참고**: 아래 항목 중 ✅는 코드/설정 파일 준비 완료, ⏳는 실제 클라우드 계정에서 직접 진행 필요

**브랜치: `feature/week4-railway-deploy`** (PR #24 ✅ 머지)
- [x] api-server Dockerfile 작성 (multi-stage build, JDK21 → JRE21-alpine, non-root)
- [x] ai-service Dockerfile 작성 (node:20-alpine, non-root)
- [x] `.dockerignore` 각 서비스 생성
- [x] `docs/deploy/railway-guide.md` 환경변수 목록 + 배포 단계 가이드
- [x] 로컬 Docker 빌드 성공 확인 (`docker build` exit code 0)
- ⏳ Railway 프로젝트 생성 + api-server / ai-service 실제 배포

**브랜치: `feature/week4-supabase-prod`** (PR #25 ✅ 머지)
- [x] `application-prod.yml` SSL(`sslmode=require`) + HikariCP 안정성 옵션 추가
- [x] `docs/deploy/supabase-guide.md` 설정 가이드 (프로젝트 생성 ~ Flyway 확인)
- ⏳ Supabase 프로젝트 생성 + Railway 환경변수 등록
- ⏳ 프로덕션 Flyway 마이그레이션 자동 실행 확인

**브랜치: `feature/week4-vercel-deploy`** (PR #26 ✅ 머지)
- [x] `next.config.ts`: `output: 'standalone'` + 보안 헤더 추가
- [x] `frontend/Dockerfile` 생성 (Railway 대안 배포용)
- [x] `docs/deploy/vercel-guide.md` 배포 가이드 (Root Directory, 환경변수, CORS 업데이트)
- [x] `npm run build` 성공 확인 (standalone 빌드 포함)
- ⏳ Vercel 프로젝트 생성 + 환경변수(Railway URL) 설정

**브랜치: `feature/week4-n8n-cloud`** (PR #27 ✅ 머지)
- [x] `infra/n8n/workflows/daily-news-collection.json` 워크플로우 JSON 생성
  (스케줄 22:00 UTC → 배치 수집 → 뉴스 조회 → 포맷팅 → 카카오 발송)
- [x] `docs/deploy/n8n-cloud-guide.md` 설정 가이드 (Credentials, 카카오 토큰 발급, 갱신 전략)
- ⏳ n8n Cloud 임포트 + Credentials 설정 + 실제 카카오톡 수신 확인

**브랜치: `docs/week4-monitoring`** (PR #28 ✅ 머지)
- [x] `docs/monitoring/kpi-checklist.md`: KPI 지표 + DB 집계 SQL + 1주일 체크리스트
- [x] `docs/velog/06-week4-deploy.md`: Velog #6 초안 (배포기)
- ⏳ 실제 배포 후 Day 1~7 체크리스트 완료
- ⏳ Velog #6 게시 후 URL 업데이트

---

## 11. 데이터 모델 개요

자세한 내용은 `.claude/db.md` 참조

```
stock ←── news_summary ──→ news_article
              ↓
       notification_log
```

---

## 12. 제외 기능 및 이유 (MVP 범위 조정)

| 기능 | 제외 이유 | 향후 계획 |
|------|----------|---------|
| 카테고리/감성 분류 | 데이터 누적 후 정확도 검증 필요 | Level 1 Should Have |
| FastAPI 분석 기능 | Level 1은 Spring Boot + Node.js 중심 | Level 2 |
| 인증/로그인 | 개인 도구 | 불필요 |
| 주가 데이터 연동 | 별도 API 비용 및 복잡도 증가 | Level 3+ |
