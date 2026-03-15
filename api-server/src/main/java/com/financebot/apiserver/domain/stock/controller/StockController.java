package com.financebot.apiserver.domain.stock.controller;

import com.financebot.apiserver.common.response.ApiResponse;
import com.financebot.apiserver.domain.stock.dto.StockCreateRequest;
import com.financebot.apiserver.domain.stock.dto.StockResponse;
import com.financebot.apiserver.domain.stock.dto.StockUpdateRequest;
import com.financebot.apiserver.domain.stock.service.StockService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관심 종목 CRUD API
 * 개인용 도구 (인증 불필요)
 */
@RestController
@RequestMapping("/api/v1/stocks")
@RequiredArgsConstructor
public class StockController {

  private final StockService stockService;

  /**
   * 활성 종목 목록 조회
   * GET /api/v1/stocks
   */
  @GetMapping
  public ResponseEntity<ApiResponse<List<StockResponse>>> getStocks() {
    return ResponseEntity.ok(ApiResponse.success(stockService.getActiveStocks()));
  }

  /**
   * 종목 단건 조회
   * GET /api/v1/stocks/{id}
   */
  @GetMapping("/{id}")
  public ResponseEntity<ApiResponse<StockResponse>> getStock(@PathVariable Long id) {
    return ResponseEntity.ok(ApiResponse.success(stockService.getStock(id)));
  }

  /**
   * 종목 등록
   * POST /api/v1/stocks
   */
  @PostMapping
  public ResponseEntity<ApiResponse<StockResponse>> createStock(
      @Valid @RequestBody StockCreateRequest request) {
    StockResponse response = stockService.createStock(request);
    return ResponseEntity
        .status(HttpStatus.CREATED)
        .body(ApiResponse.success("종목이 등록되었습니다.", response));
  }

  /**
   * 종목 수정
   * PUT /api/v1/stocks/{id}
   */
  @PutMapping("/{id}")
  public ResponseEntity<ApiResponse<StockResponse>> updateStock(
      @PathVariable Long id,
      @Valid @RequestBody StockUpdateRequest request) {
    return ResponseEntity.ok(ApiResponse.success("종목이 수정되었습니다.", stockService.updateStock(id, request)));
  }

  /**
   * 종목 비활성화 (소프트 삭제)
   * DELETE /api/v1/stocks/{id}
   */
  @DeleteMapping("/{id}")
  public ResponseEntity<ApiResponse<Void>> deactivateStock(@PathVariable Long id) {
    stockService.deactivateStock(id);
    return ResponseEntity.ok(ApiResponse.success("종목이 비활성화되었습니다.", null));
  }
}
