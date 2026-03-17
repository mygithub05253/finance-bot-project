package com.financebot.apiserver.domain.news.service;

import com.financebot.apiserver.common.exception.BusinessException;
import com.financebot.apiserver.domain.news.dto.NewsCreateRequest;
import com.financebot.apiserver.domain.news.dto.NewsResponse;
import com.financebot.apiserver.domain.news.entity.NewsArticle;
import com.financebot.apiserver.domain.news.entity.NewsSummary;
import com.financebot.apiserver.domain.news.repository.NewsArticleRepository;
import com.financebot.apiserver.domain.news.repository.NewsSummaryRepository;
import com.financebot.apiserver.domain.stock.entity.Stock;
import com.financebot.apiserver.domain.stock.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsService {

  private final NewsArticleRepository newsArticleRepository;
  private final NewsSummaryRepository newsSummaryRepository;
  private final StockRepository stockRepository;

  /**
   * 뉴스 원문 + AI 분석 결과 저장 (ai-service 호출)
   * - URL 중복 시 409 Conflict
   * - stockId가 있으면 Stock 엔티티 연결
   */
  @Transactional
  public NewsResponse createNews(NewsCreateRequest request) {
    // URL 중복 검사
    if (newsArticleRepository.existsByUrl(request.article().url())) {
      throw BusinessException.conflict(
          String.format("이미 등록된 뉴스 URL입니다: %s", request.article().url()));
    }

    // 뉴스 원문 저장
    NewsArticle article = NewsArticle.builder()
        .title(request.article().title())
        .url(request.article().url())
        .contentSnippet(request.article().contentSnippet())
        .sourceType(NewsArticle.SourceType.valueOf(request.article().sourceType()))
        .publishedAt(request.article().publishedAt())
        .build();
    newsArticleRepository.save(article);

    // 종목 연결 (stockId가 있을 경우)
    Stock stock = null;
    if (request.summary().stockId() != null) {
      stock = stockRepository.findById(request.summary().stockId())
          .filter(Stock::isActive)
          .orElse(null); // 종목 미매핑 시 null 허용 (뉴스는 저장됨)
    }

    // AI 분석 결과 저장
    NewsSummary summary = NewsSummary.builder()
        .article(article)
        .stock(stock)
        .summary(request.summary().summary())
        .category(request.summary().category())
        .sentiment(NewsSummary.Sentiment.valueOf(request.summary().sentiment()))
        .keywords(request.summary().keywords())
        .build();
    newsSummaryRepository.save(summary);

    log.info("뉴스 저장 완료: {} [{}] ({})",
        article.getTitle(), article.getSourceType(), article.getId());

    return NewsResponse.from(article, summary);
  }

  /**
   * 뉴스 목록 조회 (페이지네이션 + 필터)
   * @param stockId   종목 ID (null이면 전체)
   * @param category  카테고리 (null이면 전체)
   * @param fromDate  기준 날짜 이후 (null이면 전체)
   * @param pageable  페이지/정렬 설정
   */
  @Transactional(readOnly = true)
  public Page<NewsResponse> getNewsList(Long stockId, String category,
      OffsetDateTime fromDate, Pageable pageable) {
    return newsArticleRepository
        .findAllWithFilter(stockId, category, fromDate, pageable)
        .map(article -> {
          NewsSummary summary = newsSummaryRepository.findByArticle(article).orElse(null);
          return NewsResponse.from(article, summary);
        });
  }

  /**
   * 뉴스 단건 조회
   * @throws BusinessException 404 - 존재하지 않는 뉴스
   */
  @Transactional(readOnly = true)
  public NewsResponse getNews(Long id) {
    NewsArticle article = newsArticleRepository.findById(id)
        .orElseThrow(() -> BusinessException.notFound(
            String.format("뉴스를 찾을 수 없습니다. id: %d", id)));

    NewsSummary summary = newsSummaryRepository.findByArticle(article).orElse(null);
    return NewsResponse.from(article, summary);
  }
}
