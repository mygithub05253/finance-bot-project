-- =======================================================
-- V1: 초기 스키마 생성 (PostgreSQL 15 문법)
-- =======================================================

-- -------------------------------------------------------
-- stock: 관심 종목 테이블
-- -------------------------------------------------------
CREATE TABLE stock (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticker      VARCHAR(20)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  sector      VARCHAR(50),
  exchange    VARCHAR(20)  CHECK (exchange IN ('KOSPI', 'KOSDAQ', 'NASDAQ', 'NYSE')),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 유니크 인덱스: ticker 중복 방지
CREATE UNIQUE INDEX uk_stock_ticker ON stock (ticker);

-- -------------------------------------------------------
-- news_article: 뉴스 원문 테이블
-- -------------------------------------------------------
CREATE TABLE news_article (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title            VARCHAR(500)  NOT NULL,
  url              VARCHAR(2000) NOT NULL,
  content_snippet  TEXT,
  source_type      VARCHAR(10)   NOT NULL CHECK (source_type IN ('AUTO', 'MANUAL')),
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 유니크 인덱스: URL 중복 방지
CREATE UNIQUE INDEX uk_news_url ON news_article (url);

-- -------------------------------------------------------
-- news_summary: AI 분석 결과 테이블
-- -------------------------------------------------------
CREATE TABLE news_summary (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  article_id  BIGINT      NOT NULL REFERENCES news_article(id),
  stock_id    BIGINT      REFERENCES stock(id),
  summary     TEXT        NOT NULL,
  category    VARCHAR(50),
  sentiment   VARCHAR(10) NOT NULL CHECK (sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
  keywords    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 복합 인덱스: 종목별 최신순 조회 최적화
CREATE INDEX idx_news_summary_stock_created
  ON news_summary (stock_id, created_at DESC);

-- JSONB GIN 인덱스: 키워드 포함 검색 가속
CREATE INDEX idx_news_summary_keywords
  ON news_summary USING GIN (keywords);

-- -------------------------------------------------------
-- notification_log: 카카오톡 발송 이력 테이블
-- -------------------------------------------------------
CREATE TABLE notification_log (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  status           VARCHAR(10) NOT NULL CHECK (status IN ('SUCCESS', 'FAIL')),
  message_preview  VARCHAR(500),
  error_message    TEXT,
  sent_at          TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 발송 이력 최신순 조회 인덱스
CREATE INDEX idx_notification_log_sent_at
  ON notification_log (sent_at DESC);

-- -------------------------------------------------------
-- 초기 데이터: 샘플 관심 종목
-- -------------------------------------------------------
INSERT INTO stock (ticker, name, sector, exchange) VALUES
  ('005930', '삼성전자', '반도체', 'KOSPI'),
  ('000660', 'SK하이닉스', '반도체', 'KOSPI'),
  ('035720', '카카오', '인터넷', 'KOSPI'),
  ('NVDA',   'NVIDIA', '반도체', 'NASDAQ'),
  ('AAPL',   'Apple', 'IT', 'NASDAQ');
