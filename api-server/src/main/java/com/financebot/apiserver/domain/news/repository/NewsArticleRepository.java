package com.financebot.apiserver.domain.news.repository;

import com.financebot.apiserver.domain.news.entity.NewsArticle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;

public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {

  /**
   * URL 중복 확인
   */
  boolean existsByUrl(String url);

  /**
   * 뉴스 목록 조회 (페이지네이션 + 필터)
   * - stockId: 특정 종목 뉴스만 필터 (null이면 전체)
   * - category: 카테고리 필터 (null이면 전체)
   * - fromDate: 특정 날짜 이후 뉴스만 필터 (null이면 전체)
   */
  @Query("""
      SELECT a FROM NewsArticle a
      LEFT JOIN NewsSummary s ON s.article = a
      WHERE (:stockId IS NULL OR s.stock.id = :stockId)
        AND (:category IS NULL OR s.category = :category)
        AND (:fromDate IS NULL OR a.createdAt >= :fromDate)
      ORDER BY a.createdAt DESC
      """)
  Page<NewsArticle> findAllWithFilter(
      @Param("stockId") Long stockId,
      @Param("category") String category,
      @Param("fromDate") OffsetDateTime fromDate,
      Pageable pageable
  );
}
