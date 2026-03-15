package com.financebot.apiserver.domain.stock.entity;

import com.financebot.apiserver.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 관심 종목 엔티티
 * 소프트 삭제 방식 (is_active = false)
 */
@Entity
@Table(name = "stock")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Stock extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 20)
  private String ticker;           // 종목코드 (예: 005930)

  @Column(nullable = false, length = 100)
  private String name;             // 종목명 (예: 삼성전자)

  @Column(length = 50)
  private String sector;           // 섹터 (예: 반도체)

  @Column(length = 20)
  private String exchange;         // 거래소 (KOSPI / KOSDAQ / NASDAQ)

  @Column(nullable = false)
  private boolean isActive = true; // 소프트 삭제 플래그

  @Builder
  public Stock(String ticker, String name, String sector, String exchange) {
    this.ticker = ticker;
    this.name = name;
    this.sector = sector;
    this.exchange = exchange;
    this.isActive = true;
  }

  // 종목 정보 수정
  public void update(String name, String sector, String exchange) {
    if (name != null && !name.isBlank()) this.name = name;
    if (sector != null) this.sector = sector;
    if (exchange != null) this.exchange = exchange;
  }

  // 소프트 삭제 (DELETE 쿼리 대신 is_active = false)
  public void deactivate() {
    this.isActive = false;
  }

  // 재활성화
  public void activate() {
    this.isActive = true;
  }
}
