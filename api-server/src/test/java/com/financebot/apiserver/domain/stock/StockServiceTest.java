package com.financebot.apiserver.domain.stock;

import com.financebot.apiserver.common.exception.BusinessException;
import com.financebot.apiserver.domain.stock.dto.StockCreateRequest;
import com.financebot.apiserver.domain.stock.dto.StockResponse;
import com.financebot.apiserver.domain.stock.dto.StockUpdateRequest;
import com.financebot.apiserver.domain.stock.entity.Stock;
import com.financebot.apiserver.domain.stock.repository.StockRepository;
import com.financebot.apiserver.domain.stock.service.StockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("StockService 단위 테스트")
class StockServiceTest {

  @InjectMocks
  private StockService stockService;

  @Mock
  private StockRepository stockRepository;

  private Stock sampleStock;

  @BeforeEach
  void setUp() {
    sampleStock = Stock.builder()
        .ticker("005930")
        .name("삼성전자")
        .sector("반도체")
        .exchange("KOSPI")
        .build();
  }

  @Test
  @DisplayName("활성 종목 전체 조회 - 성공")
  void getActiveStocks_success() {
    // given
    given(stockRepository.findAllByIsActiveTrue()).willReturn(List.of(sampleStock));

    // when
    List<StockResponse> result = stockService.getActiveStocks();

    // then
    assertThat(result).hasSize(1);
    assertThat(result.get(0).ticker()).isEqualTo("005930");
    assertThat(result.get(0).name()).isEqualTo("삼성전자");
  }

  @Test
  @DisplayName("종목 등록 - 성공")
  void createStock_success() {
    // given
    StockCreateRequest request = new StockCreateRequest("000660", "SK하이닉스", "반도체", "KOSPI");
    given(stockRepository.existsByTicker("000660")).willReturn(false);
    given(stockRepository.save(any(Stock.class))).willReturn(
        Stock.builder().ticker("000660").name("SK하이닉스").sector("반도체").exchange("KOSPI").build()
    );

    // when
    StockResponse result = stockService.createStock(request);

    // then
    assertThat(result.ticker()).isEqualTo("000660");
    assertThat(result.name()).isEqualTo("SK하이닉스");
  }

  @Test
  @DisplayName("종목 등록 - 중복 ticker 시 409 반환")
  void createStock_duplicateTicker_throwsConflict() {
    // given
    StockCreateRequest request = new StockCreateRequest("005930", "삼성전자", "반도체", "KOSPI");
    given(stockRepository.existsByTicker("005930")).willReturn(true);

    // when & then
    assertThatThrownBy(() -> stockService.createStock(request))
        .isInstanceOf(BusinessException.class)
        .satisfies(e -> assertThat(((BusinessException) e).getStatus())
            .isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  @DisplayName("종목 비활성화 - 존재하지 않는 ID 시 404 반환")
  void deactivateStock_notFound_throwsNotFound() {
    // given
    given(stockRepository.findById(999L)).willReturn(Optional.empty());

    // when & then
    assertThatThrownBy(() -> stockService.deactivateStock(999L))
        .isInstanceOf(BusinessException.class)
        .satisfies(e -> assertThat(((BusinessException) e).getStatus())
            .isEqualTo(HttpStatus.NOT_FOUND));
  }
}
