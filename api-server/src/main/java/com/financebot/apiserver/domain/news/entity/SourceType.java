package com.financebot.apiserver.domain.news.entity;

/**
 * 뉴스 수집 방식
 * - AUTO: n8n 스케줄러가 Perplexity를 통해 자동 수집
 * - MANUAL: 사용자가 URL을 직접 입력하여 수동 등록
 */
public enum SourceType {
  AUTO,
  MANUAL
}
