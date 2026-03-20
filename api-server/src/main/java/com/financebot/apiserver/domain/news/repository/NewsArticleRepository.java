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
  /**
   * 뉴스 목록 조회 (Native SQL — PostgreSQL null 파라미터 타입 추론 문제 우회)
   * `:stockId IS NULL` 패턴은 PostgreSQL JDBC에서 타입 불명 오류를 유발하므로
   * CAST(:param AS type) IS NULL 방식으로 명시적 타입 지정
   */
  @Query(
      value = """
          SELECT na.* FROM news_article na
          LEFT JOIN news_summary ns ON ns.article_id = na.id
          WHERE (CAST(:stockId AS BIGINT) IS NULL OR ns.stock_id = :stockId)
            AND (CAST(:category AS TEXT) IS NULL OR ns.category = :category)
            AND (CAST(:fromDate AS TIMESTAMPTZ) IS NULL OR na.created_at >= :fromDate)
          ORDER BY na.created_at DESC
          """,
      countQuery = """
          SELECT COUNT(na.id) FROM news_article na
          LEFT JOIN news_summary ns ON ns.article_id = na.id
          WHERE (CAST(:stockId AS BIGINT) IS NULL OR ns.stock_id = :stockId)
            AND (CAST(:category AS TEXT) IS NULL OR ns.category = :category)
            AND (CAST(:fromDate AS TIMESTAMPTZ) IS NULL OR na.created_at >= :fromDate)
          """,
      nativeQuery = true
  )
  Page<NewsArticle> findAllWithFilter(
      @Param("stockId") Long stockId,
      @Param("category") String category,
      @Param("fromDate") OffsetDateTime fromDate,
      Pageable pageable
  );
}
