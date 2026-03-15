package com.financebot.apiserver.domain.stock.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 관심 종목 수정 요청 DTO
 * 부분 업데이트 허용 (null이면 기존 값 유지)
 */
public record StockUpdateRequest(

    @Size(max = 100, message = "종목명은 100자 이하여야 합니다.")
    String name,

    @Size(max = 50, message = "섹터는 50자 이하여야 합니다.")
    String sector,

    @Pattern(regexp = "^(KOSPI|KOSDAQ|NASDAQ|NYSE)?$", message = "거래소는 KOSPI, KOSDAQ, NASDAQ, NYSE 중 하나여야 합니다.")
    String exchange
) {}
