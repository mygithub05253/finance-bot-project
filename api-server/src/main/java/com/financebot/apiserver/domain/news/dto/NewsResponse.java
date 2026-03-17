package com.financebot.apiserver.domain.news.dto;

import com.financebot.apiserver.domain.news.entity.NewsArticle;
import com.financebot.apiserver.domain.news.entity.NewsSummary;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 뉴스 응답 DTO
 * article + summary 정보를 하나의 평탄화된 객체로 반환
 */
public record NewsResponse(
    // 뉴스 원문
    Long id,
    String title,
    String url,
    String contentSnippet,
    String sourceType,
    OffsetDateTime publishedAt,

    // AI 분석 결과
    Long summaryId,
    Long stockId,
    String stockName,
    String stockTicker,
    String summary,
    String category,
    String sentiment,
    List<String> keywords,

    OffsetDateTime createdAt
) {

  /**
   * NewsArticle + NewsSummary → 응답 DTO 변환
   * summary가 없을 경우 summary 관련 필드는 null 반환
   */
  public static NewsResponse from(NewsArticle article, NewsSummary newsSummary) {
    if (newsSummary != null) {
      return new NewsResponse(
          article.getId(),
          article.getTitle(),
          article.getUrl(),
          article.getContentSnippet(),
          article.getSourceType().name(),
          article.getPublishedAt(),
          newsSummary.getId(),
          newsSummary.getStock() != null ? newsSummary.getStock().getId() : null,
          newsSummary.getStock() != null ? newsSummary.getStock().getName() : null,
          newsSummary.getStock() != null ? newsSummary.getStock().getTicker() : null,
          newsSummary.getSummary(),
          newsSummary.getCategory(),
          newsSummary.getSentiment().name(),
          newsSummary.getKeywords(),
          article.getCreatedAt()
      );
    }

    // summary 없는 경우 (등록 직후 비동기 처리 전 등)
    return new NewsResponse(
        article.getId(),
        article.getTitle(),
        article.getUrl(),
        article.getContentSnippet(),
        article.getSourceType().name(),
        article.getPublishedAt(),
        null, null, null, null, null, null, null, null,
        article.getCreatedAt()
    );
  }
}
