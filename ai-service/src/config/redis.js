const Redis = require('ioredis');
const config = require('./index');

/**
 * Redis 클라이언트 팩토리
 * 매 요청마다 생성 후 quit()으로 해제 (서버리스 환경 대응)
 */
function createClient() {
  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    lazyConnect: true,
    connectTimeout: 5000,
  });
}

module.exports = { createClient };
