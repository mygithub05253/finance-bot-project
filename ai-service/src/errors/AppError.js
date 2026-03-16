/**
 * 애플리케이션 공통 에러 클래스
 * Express 에러 핸들러에서 statusCode를 읽어 HTTP 응답 생성
 */
class AppError extends Error {
  /**
   * @param {string} message - 에러 메시지
   * @param {number} statusCode - HTTP 상태 코드
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    // Node.js 스택 트레이스 보정
    Error.captureStackTrace(this, this.constructor);
  }

  // 팩토리 메서드
  static badRequest(message) {
    return new AppError(message, 400);
  }

  static conflict(message) {
    return new AppError(message, 409);
  }

  static internal(message) {
    return new AppError(message, 500);
  }
}

module.exports = AppError;
