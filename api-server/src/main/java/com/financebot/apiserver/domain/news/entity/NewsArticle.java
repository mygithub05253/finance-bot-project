package com.financebot.apiserver.domain.news.entity;

import com.financebot.apiserver.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * 뉴스 원문 엔티티
 * - AUTO: Perplexity 자동 수집
 * - MANUAL: 사용자 URL 직접 입력
 */
@Entity
@Table(name = "news_article")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NewsArticle extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 500)
  private String title;                   // 뉴스 제목

  @Column(nullable = false, length = 2000)
  private String url;                     // 원문 URL (유니크)

  @Column(columnDefinition = "TEXT")
  private String contentSnippet;          // 본문 일부 스니펫

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 10)
  private SourceType sourceType;          // AUTO | MANUAL

  @Column
  private OffsetDateTime publishedAt;     // 기사 게재 시각

  @Builder
  public NewsArticle(String title, String url, String contentSnippet,
      SourceType sourceType, OffsetDateTime publishedAt) {
    this.title = title;
    this.url = url;
    this.contentSnippet = contentSnippet;
    this.sourceType = sourceType;
    this.publishedAt = publishedAt;
  }

  /**
   * 뉴스 수집 유형 열거형
   */
  public enum SourceType {
    AUTO, MANUAL
  }
}
