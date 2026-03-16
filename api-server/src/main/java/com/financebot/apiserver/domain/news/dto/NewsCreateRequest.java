package com.financebot.apiserver.domain.news.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * ai-service → api-server 뉴스 저장 요청 DTO
 * 자동 수집(AUTO) 및 수동 등록(MANUAL) 공통 사용
 */
public record NewsCreateRequest(

    @NotBlank(message = "제목은 필수입니다.")
    @Size(max = 500, message = "제목은 500자 이하여야 합니다.")
    String title,

    @NotBlank(message = "URL은 필수입니다.")
    @Size(max = 2000, message = "URL은 2000자 이하여야 합니다.")
    String url,

    String contentSnippet,

    @NotNull(message = "sourceType은 필수입니다.")
    @Pattern(regexp = "^(AUTO|MANUAL)$", message = "sourceType은 AUTO 또는 MANUAL이어야 합니다.")
    String sourceType,

    Long stockId,

    @NotBlank(message = "요약은 필수입니다.")
    String summary,

    String category,

    @Pattern(regexp = "^(POSITIVE|NEUTRAL|NEGATIVE)$", message = "sentiment는 POSITIVE, NEUTRAL, NEGATIVE 중 하나여야 합니다.")
    String sentiment,

    List<String> keywords,

    OffsetDateTime publishedAt
) {}
