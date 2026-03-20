# [금융 뉴스 큐레이터 #1] 개인 투자 뉴스 자동화 설계 - Spring Boot + Node.js + n8n

> **시리즈:** [금융 뉴스 큐레이터] n8n + AI로 나만의 투자 뉴스 아카이브 만들기
> **태그:** `#SpringBoot` `#Nodejs` `#n8n` `#금융자동화` `#사이드프로젝트` `#Supabase`

---

## 들어가며

주식 투자를 하다 보면 아침마다 관심 종목의 뉴스를 확인하는 게 일과가 됩니다. 카카오톡 오픈채팅, 네이버 뉴스, 증권사 앱을 오가며 수동으로 찾다 보면 시간이 너무 많이 걸립니다. 게다가 그렇게 읽은 뉴스들은 다음 날이면 어디 갔는지 찾을 수도 없고, 종목별로 뉴스 흐름을 추적하는 건 거의 불가능했습니다.

그래서 만들기로 했습니다. **매일 아침 AI가 자동으로 관심 종목 뉴스를 수집하고 카카오톡으로 보내주는 봇**을.

이 포스팅에서는 이 프로젝트의 전체 아키텍처와 기술 스택 선택 이유를 설명합니다.

---

## 문제 정의 (As-Is → To-Be)

### As-Is (지금의 고통)
- 여러 앱을 오가며 관심 종목 뉴스를 **수동으로** 탐색
- 읽은 뉴스의 **히스토리 관리가 불가능** (다음 날 다시 찾으면 없음)
- 종목별 뉴스 흐름 파악이 어려움

### To-Be (만들고 싶은 것)
- 매일 **07:30 이전 카카오톡으로 관심 종목 뉴스 요약 자동 수신**
- 흥미로운 뉴스 URL을 붙여넣으면 **AI가 3초 안에 분류·요약 후 아카이브 저장**
- 웹 대시보드에서 **날짜/종목/카테고리별 뉴스 이력 검색**

---

## 전체 아키텍처

```
[Next.js FE (Vercel)]
        ↓ REST API
[Spring Boot api-server]  ←→  [Supabase PostgreSQL + Redis]
        ↓ HTTP (내부 인증)             ↕
[Node.js ai-service]         [n8n Cloud (07:00 KST 스케줄러)]
        ↓ External API
[Perplexity API]  [Claude API]  [카카오톡 REST API]
```

### 서비스 역할 분리

| 서비스 | 역할 |
|--------|------|
| **api-server** (Spring Boot) | 핵심 CRUD - 종목, 뉴스 아카이브, 발송 이력 |
| **ai-service** (Node.js) | AI 오케스트레이터 - Perplexity 수집, Claude 분류, 카카오톡 발송 |
| **n8n Cloud** | 매일 07:00 KST 자동 스케줄러 |
| **Supabase** | PostgreSQL 15 호스팅 |

---

## 기술 스택 선택 이유

### Spring Boot를 api-server로 선택한 이유

금융공기업 취업 포트폴리오 목적도 있지만, 무엇보다 **JPA 기반 CRUD의 안정성**과 **타입 안전성**이 핵심이었습니다. 뉴스 아카이브는 수개월에 걸쳐 데이터가 누적되는 서비스라 데이터 정합성이 중요합니다.

```java
// Stock 엔티티 예시 - 소프트 삭제 패턴
@Entity
public class Stock extends BaseEntity {
  @Column(nullable = false, unique = true)
  private String ticker;   // 005930

  @Column(nullable = false)
  private boolean isActive = true;  // 삭제 대신 비활성화

  public void deactivate() {
    this.isActive = false;  // DELETE 쿼리 대신 flag 변경
  }
}
```

### Node.js를 ai-service로 선택한 이유

AI SDK 연동이 간결하고, 여러 외부 API를 동시에 호출하는 **비동기 처리**에 Node.js가 적합합니다. Perplexity → Claude → 카카오톡 순서로 체이닝하는 파이프라인 구현이 `async/await`로 매우 깔끔합니다.

### Perplexity API를 자동 수집에 선택한 이유

일반 뉴스 크롤링과 달리 Perplexity는 **실시간 웹 검색 + 출처 URL이 자동 제공**됩니다. "삼성전자 오늘 뉴스 3건"을 요청하면 검색, 요약, URL까지 한 번에 받을 수 있어 구현이 단순해집니다.

### Supabase를 선택한 이유 (MySQL 대신)

처음에는 MySQL로 설계했다가 Supabase로 전환했습니다. 이유는 세 가지입니다:

1. **JSONB**: 키워드 배열을 `keywords JSONB` 컬럼으로 저장하고 GIN 인덱스로 빠른 검색
2. **TIMESTAMPTZ**: KST 시간대 처리가 명시적으로 가능
3. **공식 MCP 서버 지원**: Claude Code에서 DB 스키마를 직접 조작 가능 (개발 생산성)

---

## 데이터 모델 (ERD)

```
stock (관심 종목)
  id, ticker, name, sector, exchange, is_active
  └──< news_summary (AI 분석 결과)
         id, article_id, stock_id, summary, category, sentiment, keywords(JSONB)
         └──> news_article (뉴스 원문)
                id, title, url, content_snippet, source_type(AUTO/MANUAL), published_at

notification_log (발송 이력)
  id, status(SUCCESS/FAIL), message_preview, error_message, sent_at
```

### Flyway 마이그레이션으로 스키마 관리

JPA `ddl-auto: create`를 사용하면 프로덕션에서 데이터가 날아갈 위험이 있습니다. Flyway로 버전 관리된 SQL을 통해 안전하게 스키마를 관리합니다.

```sql
-- V1__init_schema.sql (핵심 부분)
CREATE TABLE stock (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticker    VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  -- ...TIMESTAMPTZ 타입으로 시간대 정보 보존
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- JSONB GIN 인덱스: 키워드 포함 검색 가속
CREATE INDEX idx_news_summary_keywords
  ON news_summary USING GIN (keywords);
```

---

## 수동 URL 등록 플로우 (3초 이내 목표)

```
사용자: URL 입력
    ↓
ai-service: axios + cheerio로 페이지 크롤링
    ↓
Claude Haiku API:  ← 속도 우선으로 Haiku 선택
  - 종목 매핑 (stock 목록 제공)
  - 카테고리 분류
  - 3-5줄 한국어 요약
  - 감성 분석 (POSITIVE/NEUTRAL/NEGATIVE)
    ↓
Spring Boot api-server: news_article + news_summary 저장
    ↓
Redis: news:manual:{urlHash} (TTL 7일) ← 중복 방지
    ↓
응답 반환 (3초 이내 목표)
```

Claude 모델로 **Haiku를 선택**한 이유는 속도입니다. Sonnet보다 응답 속도가 3-4배 빠르고 뉴스 분류/요약 정도의 작업에는 충분한 성능을 보여줍니다.

---

## 프로젝트 구조

```
finance-bot-project/
├── api-server/          # Spring Boot 3.x (Java 17)
│   └── src/main/java/com/financebot/apiserver/
│       ├── domain/stock/    # 관심 종목 CRUD
│       ├── domain/news/     # 뉴스 아카이브
│       └── common/          # 공통 예외처리, 응답 포맷
├── ai-service/          # Node.js Express
│   └── src/
│       ├── services/    # claude, perplexity, kakao
│       └── routes/      # news, notify
├── frontend/            # Next.js 15 (App Router)
└── infra/
    └── docker-compose.yml  # 로컬: PostgreSQL + Redis
```

---

## GitHub Actions CI 설정

PR 생성 시 자동으로 세 서비스의 빌드/테스트를 병렬 실행합니다.

```yaml
# .github/workflows/ci.yml (핵심 부분)
jobs:
  api-server:
    steps:
      - uses: actions/setup-java@v4
        with: { java-version: '17' }
      - run: ./gradlew build --no-daemon

  ai-service:
    steps:
      - run: npm ci && npm test

  frontend:
    steps:
      - run: npm ci && npm run build
```

---

## 마치며

이번 포스팅에서는 프로젝트의 전체적인 설계를 다뤘습니다. 핵심 결정 사항들을 요약하면:

- **Spring Boot** - 안정적인 CRUD, 포트폴리오 목적
- **Node.js ai-service** - 비동기 AI 파이프라인
- **Supabase** - JSONB + TIMESTAMPTZ + MCP 지원
- **Flyway** - 안전한 스키마 버전 관리
- **Claude Haiku** - 3초 이내 분류/요약 속도 우선

다음 포스팅에서는 **Spring Boot api-server** 구현 — 종목 CRUD, Flyway 마이그레이션, PostgreSQL 연결을 다루겠습니다.

**GitHub 저장소:** https://github.com/mygithub05253/finance-bot-project

---

*다음 편 예고: [#2] Spring Boot api-server CRUD — 종목 관리 API + Flyway 마이그레이션*
