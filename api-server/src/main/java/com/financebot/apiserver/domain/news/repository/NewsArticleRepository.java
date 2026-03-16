package com.financebot.apiserver.domain.news.repository;

import com.financebot.apiserver.domain.news.entity.NewsArticle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {

  boolean existsByUrl(String url);

  Optional<NewsArticle> findByUrl(String url);
}
