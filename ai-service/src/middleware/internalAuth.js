const config = require('../config');

/**
 * 서비스 간 통신 인증 미들웨어
 * X-Internal-Secret 헤더로 n8n 및 내부 서비스 요청 검증
 */
function internalAuth(req, res, next) {
  // 개발 환경에서는 secret 미설정 시 통과
  if (config.nodeEnv === 'development' && !config.internalApiSecret) {
    return next();
  }

  const secret = req.headers['x-internal-secret'];
  if (!secret || secret !== config.internalApiSecret) {
    return res.status(403).json({
      success: false,
      message: '인증되지 않은 내부 요청입니다.',
    });
  }
  next();
}

module.exports = internalAuth;
