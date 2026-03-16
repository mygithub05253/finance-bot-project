package com.financebot.apiserver.domain.news.service;

import com.financebot.apiserver.common.exception.BusinessException;
import com.financebot.apiserver.domain.news.dto.NewsCreateRequest;
import com.financebot.apiserver.domain.news.dto.NewsResponse;
import com.financebot.apiserver.domain.news.entity.NewsArticle;
import com.financebot.apiserver.domain.news.entity.NewsSummary;
import com.financebot.apiserver.domain.news.entity.Sentiment;
import com.financebot.apiserver.domain.news.entity.SourceType;
import com.financebot.apiserver.domain.news.repository.NewsArticleRepository;
import com.financebot.apiserver.domain.news.repository.NewsSummaryRepository;
import com.financebot.apiserver.domain.stock.entity.Stock;
import com.financebot.apiserver.domain.stock.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsService {

  private final NewsArticleRepository newsArticleRepository;
  private final NewsSummaryRepository newsSummaryRepository;
  private final StockRepository stockRepository;

  /**
   * 뉴스 저장 (article + summary 한 번에)
   * URL 중복 시 409 Conflict
   */
  @Transactional
  public NewsResponse createNews(NewsCreateRequest request) {
    // URL 중복 확인 (DB 레벨 방어)
    if (newsArticleRepository.existsByUrl(request.url())) {
      throw BusinessException.conflict(
          String.format("이미 등록된 URL입니다: %s", request.url()));
    }

    // NewsArticle 저장
    NewsArticle article = NewsArticle.builder()
        .title(request.title())
        .url(request.url())
        .contentSnippet(request.contentSnippet())
        .sourceType(SourceType.valueOf(request.sourceType()))
        .publishedAt(request.publishedAt())
        .build();

    newsArticleRepository.save(article);

    // 관련 종목 조회 (없으면 null)
    Stock stock = null;
    if (request.stockId() != null) {
      stock = stockRepository.findById(request.stockId()).orElse(null);
    }

    // Sentiment 변환 (null이나 빈 값이면 NEUTRAL)
    Sentiment sentiment = Sentiment.NEUTRAL;
    if (request.sentiment() != null && !request.sentiment().isBlank()) {
      try {
        sentiment = Sentiment.valueOf(request.sentiment());
      } catch (IllegalArgumentException e) {
        log.warn("유효하지 않은 sentiment 값: {} → NEUTRAL로 처리", request.sentiment());
      }
    }

    // NewsSummary 저장
    NewsSummary summary = NewsSummary.builder()
        .article(article)
        .stock(stock)
        .summary(request.summary())
        .category(request.category())
        .sentiment(sentiment)
        .keywords(request.keywords() != null ? request.keywords() : List.of())
        .build();

    newsSummaryRepository.save(summary);

    log.info("뉴스 저장 완료: [{}] {} ({})", request.sourceType(), article.getId(), request.title());
    return NewsResponse.from(article, summary);
  }

  /**
   * 뉴스 목록 조회 (필터: stockId, category, date)
   */
  @Transactional(readOnly = true)
  public List<NewsResponse> getNewsList(Long stockId, String category, LocalDate date) {
    return newsSummaryRepository.findWithFilters(stockId, category, date)
        .stream()
        .map(ns -> NewsResponse.from(ns.getArticle(), ns))
        .toList();
  }

  /**
   * 뉴스 단건 조회
   */
  @Transactional(readOnly = true)
  public NewsResponse getNews(Long id) {
    NewsArticle article = newsArticleRepository.findById(id)
        .orElseThrow(() -> BusinessException.notFound(
            String.format("뉴스를 찾을 수 없습니다. id: %d", id)));

    NewsSummary summary = newsSummaryRepository.findByArticleId(id).orElse(null);
    return NewsResponse.from(article, summary);
  }
}
