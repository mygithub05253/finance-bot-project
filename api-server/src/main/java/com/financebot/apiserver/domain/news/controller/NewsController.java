package com.financebot.apiserver.domain.news.controller;

import com.financebot.apiserver.common.response.ApiResponse;
import com.financebot.apiserver.domain.news.dto.NewsCreateRequest;
import com.financebot.apiserver.domain.news.dto.NewsResponse;
import com.financebot.apiserver.domain.news.service.NewsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 뉴스 API 컨트롤러
 *
 * POST /api/v1/news          — ai-service가 수집/분류 결과 저장 요청
 * GET  /api/v1/news          — 프론트엔드 뉴스 목록 조회 (필터: stockId, category, date)
 * GET  /api/v1/news/{id}     — 단건 조회
 */
@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class NewsController {

  private final NewsService newsService;

  /**
   * 뉴스 저장 (ai-service 호출)
   * URL 중복 시 409 Conflict
   */
  @PostMapping
  public ResponseEntity<ApiResponse<NewsResponse>> createNews(
      @Valid @RequestBody NewsCreateRequest request) {
    NewsResponse response = newsService.createNews(request);
    return ResponseEntity
        .status(HttpStatus.CREATED)
        .body(ApiResponse.success("뉴스가 저장되었습니다.", response));
  }

  /**
   * 뉴스 목록 조회
   * @param stockId  종목 ID 필터 (선택)
   * @param category 카테고리 필터 (선택, 예: "실적", "규제")
   * @param date     날짜 필터 (선택, yyyy-MM-dd)
   */
  @GetMapping
  public ResponseEntity<ApiResponse<List<NewsResponse>>> getNewsList(
      @RequestParam(required = false) Long stockId,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
    List<NewsResponse> newsList = newsService.getNewsList(stockId, category, date);
    return ResponseEntity.ok(ApiResponse.success(newsList));
  }

  /**
   * 뉴스 단건 조회
   */
  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<NewsResponse>> getNews(@PathVariable Long id) {
    return ResponseEntity.ok(ApiResponse.success(newsService.getNews(id)));
  }
}
