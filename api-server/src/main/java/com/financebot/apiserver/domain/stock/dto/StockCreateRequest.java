package com.financebot.apiserver.domain.stock.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 관심 종목 등록 요청 DTO
 */
public record StockCreateRequest(

    @NotBlank(message = "종목코드는 필수입니다.")
    @Size(max = 20, message = "종목코드는 20자 이하여야 합니다.")
    String ticker,

    @NotBlank(message = "종목명은 필수입니다.")
    @Size(max = 100, message = "종목명은 100자 이하여야 합니다.")
    String name,

    @Size(max = 50, message = "섹터는 50자 이하여야 합니다.")
    String sector,

    @Pattern(regexp = "^(KOSPI|KOSDAQ|NASDAQ|NYSE)?$", message = "거래소는 KOSPI, KOSDAQ, NASDAQ, NYSE 중 하나여야 합니다.")
    String exchange
) {}
