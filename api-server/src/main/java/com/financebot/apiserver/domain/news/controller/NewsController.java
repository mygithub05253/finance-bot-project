package com.financebot.apiserver.domain.news.controller;

import com.financebot.apiserver.common.exception.BusinessException;
import com.financebot.apiserver.common.response.ApiResponse;
import com.financebot.apiserver.domain.news.dto.NewsCreateRequest;
import com.financebot.apiserver.domain.news.dto.NewsResponse;
import com.financebot.apiserver.domain.news.service.NewsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;

/**
 * 뉴스 CRUD API
 * - POST /api/v1/news : ai-service 내부 호출 (X-Internal-Secret 헤더 필수)
 * - GET  /api/v1/news : 뉴스 목록 조회 (프론트엔드 호출)
 * - GET  /api/v1/news/{id} : 뉴스 단건 조회 (프론트엔드 호출)
 */
@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class NewsController {

  private final NewsService newsService;

  @Value("${internal.secret}")
  private String internalSecret;

  /**
   * 뉴스 등록 (ai-service 전용 내부 API)
   * POST /api/v1/news
   * 헤더: X-Internal-Secret 필수
   */
  @PostMapping
  public ResponseEntity<ApiResponse<NewsResponse>> createNews(
      @RequestHeader(value = "X-Internal-Secret", required = false) String secret,
      @Valid @RequestBody NewsCreateRequest request) {

    // 내부 서비스 인증 검증
    if (!internalSecret.equals(secret)) {
      throw BusinessException.badRequest("유효하지 않은 내부 인증 헤더입니다.");
    }

    NewsResponse response = newsService.createNews(request);
    return ResponseEntity
        .status(HttpStatus.CREATED)
        .body(ApiResponse.success("뉴스가 저장되었습니다.", response));
  }

  /**
   * 뉴스 목록 조회 (페이지네이션 + 필터)
   * GET /api/v1/news?stockId=1&category=실적&fromDate=2026-03-01T00:00:00Z&page=0&size=20
   */
  @GetMapping
  public ResponseEntity<ApiResponse<Page<NewsResponse>>> getNewsList(
      @RequestParam(required = false) Long stockId,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime fromDate,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {

    Pageable pageable = PageRequest.of(page, size);
    Page<NewsResponse> result = newsService.getNewsList(stockId, category, fromDate, pageable);
    return ResponseEntity.ok(ApiResponse.success(result));
  }

  /**
   * 뉴스 단건 조회
   * GET /api/v1/news/{id}
   */
  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<NewsResponse>> getNews(@PathVariable Long id) {
    return ResponseEntity.ok(ApiResponse.success(newsService.getNews(id)));
  }
}
