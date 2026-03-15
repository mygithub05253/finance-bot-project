package com.financebot.apiserver.domain.stock.repository;

import com.financebot.apiserver.domain.stock.entity.Stock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StockRepository extends JpaRepository<Stock, Long> {

  // 활성 종목 전체 조회 (소프트 삭제된 것 제외)
  List<Stock> findAllByIsActiveTrue();

  // ticker로 활성 종목 조회
  Optional<Stock> findByTickerAndIsActiveTrue(String ticker);

  // ticker 중복 확인 (활성/비활성 모두)
  boolean existsByTicker(String ticker);
}
