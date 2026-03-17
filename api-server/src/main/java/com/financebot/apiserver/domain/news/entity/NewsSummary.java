package com.financebot.apiserver.domain.news.entity;

import com.financebot.apiserver.common.entity.BaseEntity;
import com.financebot.apiserver.domain.stock.entity.Stock;
import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;

import java.util.List;

/**
 * AI 분석 결과 엔티티
 * - Claude Haiku가 분류한 카테고리, 감성, 키워드, 요약 저장
 * - keywords: JSONB 타입 (GIN 인덱스 활용)
 */
@Entity
@Table(name = "news_summary")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NewsSummary extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "article_id", nullable = false)
  private NewsArticle article;            // 원문 뉴스 참조

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "stock_id")
  private Stock stock;                    // 관련 종목 (null 가능)

  @Column(nullable = false, columnDefinition = "TEXT")
  private String summary;                 // AI 요약 (3~5문장)

  @Column(length = 50)
  private String category;               // 분류: 실적|규제|M&A|인사|기타

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private Sentiment sentiment;           // 감성: POSITIVE|NEUTRAL|NEGATIVE

  /**
   * keywords: JSONB 컬럼 — 키워드 문자열 배열
   * hypersistence-utils JsonType으로 직렬화/역직렬화
   * DDL은 Flyway V1에서 관리 (GIN 인덱스 포함)
   */
  @Type(JsonType.class)
  @Column(columnDefinition = "jsonb")
  private List<String> keywords;

  @Builder
  public NewsSummary(NewsArticle article, Stock stock, String summary,
      String category, Sentiment sentiment, List<String> keywords) {
    this.article = article;
    this.stock = stock;
    this.summary = summary;
    this.category = category;
    this.sentiment = sentiment;
    this.keywords = keywords;
  }

  /**
   * 뉴스 감성 분석 열거형
   */
  public enum Sentiment {
    POSITIVE, NEUTRAL, NEGATIVE
  }
}
