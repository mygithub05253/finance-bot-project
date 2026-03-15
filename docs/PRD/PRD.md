# PRD - 금융 뉴스 스크랩 및 투자 리서치 자동화 봇

---

## 메타 정보
| 항목 | 내용 |
|------|------|
| **버전** | v1.2 |
| **작성일** | 2026-03-15 |
| **상태** | 확정 |
| **작성자** | 개인 프로젝트 |

### 변경 이력
| 버전 | 날짜 | 내용 |
|------|------|------|
| v1.0 | 2026-03-15 | 초안 작성 |
| v1.1 | 2026-03-15 | MySQL → Supabase(PostgreSQL)로 전환. MCP 전략 업데이트 |
| v1.2 | 2026-03-15 | MVP 개발 계획 Supabase 반영, Week 4 배포 대상 수정 |

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

### Week 1: BE 기초
- [ ] 모노레포 구조 세팅 (api-server, ai-service, frontend, data-service)
- [ ] Docker Compose (PostgreSQL + Redis) — 로컬 개발용 (프로덕션은 Supabase)
- [ ] Spring Boot api-server: stock CRUD API (Supabase PostgreSQL 연결)
- [ ] Flyway 마이그레이션 초기 스키마 (PostgreSQL 문법)
- [ ] GitHub Actions CI 설정

### Week 2: AI 파이프라인
- [ ] Node.js ai-service 세팅 (Express + 서비스 구조)
- [ ] Perplexity API 연동 (perplexity.service.js)
- [ ] n8n 워크플로우 구성 (스케줄 → 수집 → 저장)
- [ ] Claude 수동 등록 분류 API (claude.service.js)
- [ ] Redis 중복 방지 구현

### Week 3: 알림 & 프론트엔드
- [ ] 카카오톡 REST API 연동 (kakao.service.js)
- [ ] 카카오톡 메시지 포맷 구현
- [ ] Next.js 대시보드 (뉴스 카드 목록)
- [ ] 종목 관리 페이지
- [ ] 수동 URL 등록 UI

### Week 4: 배포 & 검증
- [ ] Railway 배포 (api-server + ai-service + Redis)
- [ ] Supabase 프로덕션 DB 연결 (Railway 환경변수 등록)
- [ ] Vercel 프론트엔드 배포
- [ ] n8n Cloud 워크플로우 임포트 및 실 운영
- [ ] 1주일 모니터링 (KPI 지표 확인)
- [ ] Velog 포스팅 #3 (배포 완성 편) 작성

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
