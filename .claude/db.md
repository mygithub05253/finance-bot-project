# DB 컨벤션

## 데이터베이스 정보
- **DBMS**: PostgreSQL 15 (Supabase)
- **스키마**: `public`
- **문자셋**: UTF-8 기본 (한국어/이모지 지원)
- **Spring Boot JDBC**: `jdbc:postgresql://db.{project-ref}.supabase.co:5432/postgres`
- **Hibernate Dialect**: 자동 감지 (Spring Boot 3.x + `spring.jpa.database-platform` 불필요)

---

## 주요 엔티티

### stock (관심 종목)
```sql
id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
ticker      VARCHAR(20) NOT NULL UNIQUE    -- 예: 005930
name        VARCHAR(100) NOT NULL          -- 예: 삼성전자
sector      VARCHAR(50)                    -- 예: 반도체
exchange    VARCHAR(20)                    -- KOSPI / KOSDAQ / NASDAQ
is_active   BOOLEAN NOT NULL DEFAULT TRUE  -- 소프트 삭제
created_at  TIMESTAMPTZ NOT NULL
updated_at  TIMESTAMPTZ NOT NULL
```

### news_article (뉴스 원문)
```sql
id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
title            VARCHAR(500) NOT NULL
url              VARCHAR(2000) NOT NULL UNIQUE
content_snippet  TEXT                        -- 본문 일부 (크롤링)
source_type      VARCHAR(10) NOT NULL        -- CHECK: 'AUTO' | 'MANUAL'
published_at     TIMESTAMPTZ
created_at       TIMESTAMPTZ NOT NULL
updated_at       TIMESTAMPTZ NOT NULL
```

### news_summary (AI 분석 결과)
```sql
id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
article_id  BIGINT NOT NULL REFERENCES news_article(id)
stock_id    BIGINT REFERENCES stock(id)     -- NULL 허용 (종목 미매핑 뉴스)
summary     TEXT NOT NULL                   -- Claude 요약 (3-5줄)
category    VARCHAR(50)                     -- 실적/규제/M&A/기타
sentiment   VARCHAR(10) NOT NULL            -- CHECK: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
keywords    JSONB                           -- ["HBM", "반도체", "실적"]
created_at  TIMESTAMPTZ NOT NULL
updated_at  TIMESTAMPTZ NOT NULL
```

### notification_log (발송 이력)
```sql
id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY
status           VARCHAR(10) NOT NULL       -- CHECK: 'SUCCESS' | 'FAIL'
message_preview  VARCHAR(500)              -- 발송 메시지 앞 500자
error_message    TEXT                      -- 실패 시 오류 메시지
sent_at          TIMESTAMPTZ NOT NULL
created_at       TIMESTAMPTZ NOT NULL
```

---

## JPA 규칙

**BaseEntity 상속 (created_at, updated_at 자동 관리):**
```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {
  @CreatedDate
  private LocalDateTime createdAt;

  @LastModifiedDate
  private LocalDateTime updatedAt;
}
```

**Spring Boot application.yml (Supabase 연결):**
```yaml
spring:
  datasource:
    url: jdbc:postgresql://db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres
    username: postgres
    password: ${SUPABASE_DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate   # Flyway가 스키마 관리, JPA는 검증만
    properties:
      hibernate:
        default_schema: public
```

**ENUM 매핑 (PostgreSQL CHECK 제약 활용):**
```java
// @Enumerated(EnumType.STRING) 으로 VARCHAR 컬럼에 문자열 저장
@Enumerated(EnumType.STRING)
@Column(nullable = false, length = 10)
private SourceType sourceType;
```

**JSONB 컬럼 (keywords):**
```java
// hibernate-types 라이브러리 활용
@Type(JsonBinaryType.class)
@Column(columnDefinition = "jsonb")
private List<String> keywords;
```

- **즉시로딩(EAGER) 금지**: 모든 연관관계는 `fetch = FetchType.LAZY`
- **소프트 삭제**: `is_active = false` 처리 (DELETE 쿼리 금지)

---

## 인덱스 전략

```sql
-- 유니크 인덱스
CREATE UNIQUE INDEX uk_stock_ticker ON stock (ticker);
CREATE UNIQUE INDEX uk_news_url ON news_article (url);

-- 복합 인덱스 (자주 사용하는 조회 패턴)
CREATE INDEX idx_news_summary_stock_created
  ON news_summary (stock_id, created_at DESC);

CREATE INDEX idx_notification_log_sent_at
  ON notification_log (sent_at DESC);

-- JSONB GIN 인덱스 (키워드 포함 검색 가속)
CREATE INDEX idx_news_summary_keywords
  ON news_summary USING GIN (keywords);
```

---

## Redis 캐시 키 규칙

| 키 패턴 | TTL | 용도 |
|---------|-----|------|
| `news:auto:{stockId}:{YYYY-MM-DD}` | 24시간 | 자동 수집 중복 방지 |
| `news:manual:{urlHash}` | 7일 | 동일 URL 중복 등록 방지 |

**urlHash**: URL을 SHA-256 해시한 16진수 앞 16자리

---

## 마이그레이션 규칙
- 도구: Flyway
- 파일 위치: `api-server/src/main/resources/db/migration/`
- 파일명: `V{버전}__{설명}.sql` (예: `V1__init_schema.sql`)
- SQL 방언: PostgreSQL 문법 사용 (`GENERATED ALWAYS AS IDENTITY`, `TIMESTAMPTZ`, `JSONB`)
- 배포 환경에서는 자동 실행 (`spring.flyway.enabled=true`)
