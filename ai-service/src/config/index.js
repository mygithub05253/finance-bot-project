require('dotenv').config();

/**
 * 환경변수 중앙 관리
 * 필수 값 누락 시 서버 시작 시점에 오류 발생
 */
const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),

  // API 키 (운영 환경에서만 필수)
  perplexityApiKey: process.env.PERPLEXITY_API_KEY || '',
  claudeApiKey: process.env.CLAUDE_API_KEY || '',
  kakaoRestApiKey: process.env.KAKAO_REST_API_KEY || '',
  // 카카오 액세스 토큰 (Railway 환경변수에 저장, 만료 시 갱신 후 재배포)
  kakaoAccessToken: process.env.KAKAO_ACCESS_TOKEN || '',

  // 서비스 간 통신 보안
  internalApiSecret: process.env.INTERNAL_API_SECRET || '',
  apiServerUrl: process.env.API_SERVER_URL || 'http://localhost:8080',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
};

// 운영 환경에서는 필수 키 검증
if (config.nodeEnv === 'production') {
  const required = ['perplexityApiKey', 'claudeApiKey', 'kakaoRestApiKey', 'kakaoAccessToken', 'internalApiSecret'];
  for (const key of required) {
    if (!config[key]) {
      throw new Error(`필수 환경변수 누락: ${key}`);
    }
  }
}

module.exports = config;
