package com.financebot.apiserver.domain.news.entity;

/**
 * AI 감성 분석 결과
 * DB CHECK 제약: sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE')
 */
public enum Sentiment {
  POSITIVE,
  NEUTRAL,
  NEGATIVE
}
