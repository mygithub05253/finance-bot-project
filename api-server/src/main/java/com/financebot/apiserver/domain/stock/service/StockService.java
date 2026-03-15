package com.financebot.apiserver.domain.stock.service;

import com.financebot.apiserver.common.exception.BusinessException;
import com.financebot.apiserver.domain.stock.dto.StockCreateRequest;
import com.financebot.apiserver.domain.stock.dto.StockResponse;
import com.financebot.apiserver.domain.stock.dto.StockUpdateRequest;
import com.financebot.apiserver.domain.stock.entity.Stock;
import com.financebot.apiserver.domain.stock.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockService {

  private final StockRepository stockRepository;

  /**
   * 활성 관심 종목 전체 조회
   */
  @Transactional(readOnly = true)
  public List<StockResponse> getActiveStocks() {
    return stockRepository.findAllByIsActiveTrue()
        .stream()
        .map(StockResponse::from)
        .toList();
  }

  /**
   * 관심 종목 단건 조회
   */
  @Transactional(readOnly = true)
  public StockResponse getStock(Long id) {
    Stock stock = findActiveStockById(id);
    return StockResponse.from(stock);
  }

  /**
   * 관심 종목 등록
   * 동일 ticker가 이미 존재하면 409 Conflict 반환
   */
  @Transactional
  public StockResponse createStock(StockCreateRequest request) {
    // ticker 중복 확인
    if (stockRepository.existsByTicker(request.ticker())) {
      throw BusinessException.conflict(
          String.format("이미 등록된 종목코드입니다: %s", request.ticker()));
    }

    Stock stock = Stock.builder()
        .ticker(request.ticker())
        .name(request.name())
        .sector(request.sector())
        .exchange(request.exchange())
        .build();

    Stock saved = stockRepository.save(stock);
    log.info("관심 종목 등록: {} ({})", saved.getName(), saved.getTicker());
    return StockResponse.from(saved);
  }

  /**
   * 관심 종목 수정
   */
  @Transactional
  public StockResponse updateStock(Long id, StockUpdateRequest request) {
    Stock stock = findActiveStockById(id);
    stock.update(request.name(), request.sector(), request.exchange());
    return StockResponse.from(stock);
  }

  /**
   * 관심 종목 비활성화 (소프트 삭제)
   */
  @Transactional
  public void deactivateStock(Long id) {
    Stock stock = findActiveStockById(id);
    stock.deactivate();
    log.info("관심 종목 비활성화: {} ({})", stock.getName(), stock.getTicker());
  }

  // 활성 종목 조회 헬퍼 (없으면 404)
  private Stock findActiveStockById(Long id) {
    return stockRepository.findById(id)
        .filter(Stock::isActive)
        .orElseThrow(() -> BusinessException.notFound(
            String.format("종목을 찾을 수 없습니다. id: %d", id)));
  }
}
