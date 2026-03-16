package com.financebot.apiserver.domain.news.entity;

import com.financebot.apiserver.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

/**
 * 뉴스 기사 엔티티 (news_article 테이블)
 * 수집된 뉴스 원문 정보를 저장. URL 중복 방지는 uk_news_url 인덱스로 처리.
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
  private String title;

  @Column(nullable = false, length = 2000, unique = true)
  private String url;

  @Column(columnDefinition = "TEXT")
  private String contentSnippet;

  @Column(nullable = false, length = 10)
  @Enumerated(EnumType.STRING)
  private SourceType sourceType;

  private OffsetDateTime publishedAt;

  @Builder
  public NewsArticle(String title, String url, String contentSnippet,
                     SourceType sourceType, OffsetDateTime publishedAt) {
    this.title = title;
    this.url = url;
    this.contentSnippet = contentSnippet;
    this.sourceType = sourceType;
    this.publishedAt = publishedAt;
  }
}
