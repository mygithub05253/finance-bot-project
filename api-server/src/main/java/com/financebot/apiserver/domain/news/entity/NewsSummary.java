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
 * AI 분석 결과 엔티티 (news_summary 테이블)
 * news_article에 대한 Claude 분류/요약/감성 분석 결과 저장.
 * keywords는 JSONB 타입으로 키워드 배열 저장.
 */
@Entity
@Table(name = "news_summary")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NewsSummary extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "article_id", nullable = false)
  private NewsArticle article;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "stock_id")
  private Stock stock;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String summary;

  @Column(length = 50)
  private String category;

  @Column(nullable = false, length = 10)
  @Enumerated(EnumType.STRING)
  private Sentiment sentiment;

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
}
