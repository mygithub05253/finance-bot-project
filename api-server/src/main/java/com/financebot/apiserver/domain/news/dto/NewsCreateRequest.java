package com.financebot.apiserver.domain.news.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * 뉴스 등록 요청 DTO
 * ai-service가 호출 (POST /api/v1/news, X-Internal-Secret 헤더 필요)
 * 뉴스 원문(article)과 AI 분석 결과(summary)를 한 번에 저장
 */
public record NewsCreateRequest(
    @Valid @NotNull ArticleData article,
    @Valid @NotNull SummaryData summary
) {

  /**
   * 뉴스 원문 데이터
   */
  public record ArticleData(
      @NotBlank @Size(max = 500) String title,
      @NotBlank @Size(max = 2000) String url,
      String contentSnippet,
      @NotBlank @Pattern(regexp = "AUTO|MANUAL") String sourceType,
      OffsetDateTime publishedAt
  ) {}

  /**
   * AI 분석 결과 데이터
   */
  public record SummaryData(
      Long stockId,                       // null 가능 (종목 미매핑)
      @NotBlank String summary,
      String category,
      @NotBlank @Pattern(regexp = "POSITIVE|NEUTRAL|NEGATIVE") String sentiment,
      List<String> keywords
  ) {}
}
