package com.financebot.apiserver.domain.news.dto;

import com.financebot.apiserver.domain.news.entity.NewsArticle;
import com.financebot.apiserver.domain.news.entity.NewsSummary;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 뉴스 목록/단건 조회 응답 DTO
 * NewsArticle + NewsSummary를 합쳐서 반환
 */
public record NewsResponse(
    Long id,
    String title,
    String url,
    String sourceType,
    OffsetDateTime publishedAt,
    OffsetDateTime createdAt,
    // 분석 결과 (요약 정보)
    Long stockId,
    String stockName,
    String stockTicker,
    String summary,
    String category,
    String sentiment,
    List<String> keywords
) {
  /**
   * NewsArticle + NewsSummary → NewsResponse 변환
   * summary가 null인 경우(요약 없는 경우)도 처리
   */
  public static NewsResponse from(NewsArticle article, NewsSummary summary) {
    Long stockId = null;
    String stockName = null;
    String stockTicker = null;
    String summaryText = null;
    String category = null;
    String sentiment = null;
    List<String> keywords = List.of();

    if (summary != null) {
      summaryText = summary.getSummary();
      category = summary.getCategory();
      sentiment = summary.getSentiment() != null ? summary.getSentiment().name() : null;
      keywords = summary.getKeywords() != null ? summary.getKeywords() : List.of();

      if (summary.getStock() != null) {
        stockId = summary.getStock().getId();
        stockName = summary.getStock().getName();
        stockTicker = summary.getStock().getTicker();
      }
    }

    return new NewsResponse(
        article.getId(),
        article.getTitle(),
        article.getUrl(),
        article.getSourceType().name(),
        article.getPublishedAt(),
        article.getCreatedAt(),
        stockId,
        stockName,
        stockTicker,
        summaryText,
        category,
        sentiment,
        keywords
    );
  }
}
