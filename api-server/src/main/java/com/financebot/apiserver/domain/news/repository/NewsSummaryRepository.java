package com.financebot.apiserver.domain.news.repository;

import com.financebot.apiserver.domain.news.entity.NewsSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface NewsSummaryRepository extends JpaRepository<NewsSummary, Long> {

  Optional<NewsSummary> findByArticleId(Long articleId);

  /**
   * 필터 조건에 맞는 뉴스 요약 목록 조회 (최신순)
   * - stockId: 특정 종목 (null 이면 전체)
   * - category: 카테고리 (null 이면 전체)
   * - date: 생성 날짜 기준 (null 이면 전체)
   */
  @Query("""
      SELECT ns FROM NewsSummary ns
      JOIN FETCH ns.article a
      LEFT JOIN FETCH ns.stock s
      WHERE (:stockId IS NULL OR s.id = :stockId)
        AND (:category IS NULL OR ns.category = :category)
        AND (:date IS NULL OR CAST(a.createdAt AS date) = :date)
      ORDER BY a.createdAt DESC
      """)
  List<NewsSummary> findWithFilters(
      @Param("stockId") Long stockId,
      @Param("category") String category,
      @Param("date") LocalDate date
  );
}
