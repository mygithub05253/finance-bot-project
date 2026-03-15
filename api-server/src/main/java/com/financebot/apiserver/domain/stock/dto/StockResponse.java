package com.financebot.apiserver.domain.stock.dto;

import com.financebot.apiserver.domain.stock.entity.Stock;

import java.time.OffsetDateTime;

/**
 * 관심 종목 응답 DTO
 */
public record StockResponse(
    Long id,
    String ticker,
    String name,
    String sector,
    String exchange,
    boolean isActive,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {
  // Entity → DTO 변환 팩토리 메서드
  public static StockResponse from(Stock stock) {
    return new StockResponse(
        stock.getId(),
        stock.getTicker(),
        stock.getName(),
        stock.getSector(),
        stock.getExchange(),
        stock.isActive(),
        stock.getCreatedAt(),
        stock.getUpdatedAt()
    );
  }
}
