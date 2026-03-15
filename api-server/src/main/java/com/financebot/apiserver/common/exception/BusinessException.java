package com.financebot.apiserver.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 비즈니스 로직 예외 기반 클래스
 */
@Getter
public class BusinessException extends RuntimeException {

  private final HttpStatus status;

  public BusinessException(String message, HttpStatus status) {
    super(message);
    this.status = status;
  }

  // 404 Not Found 편의 생성자
  public static BusinessException notFound(String message) {
    return new BusinessException(message, HttpStatus.NOT_FOUND);
  }

  // 400 Bad Request 편의 생성자
  public static BusinessException badRequest(String message) {
    return new BusinessException(message, HttpStatus.BAD_REQUEST);
  }

  // 409 Conflict 편의 생성자
  public static BusinessException conflict(String message) {
    return new BusinessException(message, HttpStatus.CONFLICT);
  }
}
