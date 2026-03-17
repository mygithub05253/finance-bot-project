package com.financebot.apiserver.domain.news.repository;

import com.financebot.apiserver.domain.news.entity.NewsArticle;
import com.financebot.apiserver.domain.news.entity.NewsSummary;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NewsSummaryRepository extends JpaRepository<NewsSummary, Long> {

  /**
   * 특정 뉴스 원문에 대한 AI 분석 결과 조회
   */
  Optional<NewsSummary> findByArticle(NewsArticle article);
}
