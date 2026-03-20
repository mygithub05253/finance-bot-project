const Redis = require('ioredis');
const config = require('./index');

/**
 * Redis 싱글톤 클라이언트
 * 앱 시작 시 1회 연결. 연결 실패 시 경고만 출력하고 null로 관리 (서비스는 계속 실행).
 * Redis 없이도 ai-service가 동작해야 함 (중복 방지 fallback: 중복 허용).
 */
let redisClient = null;
let isConnected = false;

function getClient() {
  if (!redisClient) {
    // Railway는 REDIS_URL(redis://...) 형식, 로컬은 host/port 방식
    const baseOptions = {
      lazyConnect: true,
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('[Redis] 재연결 시도 한도 초과. Redis 없이 동작합니다.');
          return null;
        }
        return Math.min(times * 500, 2000);
      },
    };

    redisClient = process.env.REDIS_URL
      ? new Redis(process.env.REDIS_URL, baseOptions)
      : new Redis({ host: config.redis.host, port: config.redis.port, ...baseOptions });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log('[Redis] 연결 성공');
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      console.warn(`[Redis] 연결 오류 (서비스는 계속 실행): ${err.message}`);
    });

    redisClient.on('close', () => {
      isConnected = false;
    });
  }

  return redisClient;
}

/**
 * Redis 연결 여부 확인
 * @returns {boolean}
 */
function isAvailable() {
  return isConnected && redisClient !== null;
}

/**
 * 앱 시작 시 Redis 연결 초기화
 * 연결 실패 시 예외 없이 경고만 출력
 */
async function connect() {
  const client = getClient();
  try {
    await client.connect();
  } catch (err) {
    console.warn(`[Redis] 초기 연결 실패 (Redis 없이 동작합니다): ${err.message}`);
  }
}

/**
 * 앱 종료 시 Redis 연결 해제
 */
async function disconnect() {
  if (redisClient) {
    await redisClient.quit().catch(() => {});
    redisClient = null;
    isConnected = false;
  }
}

module.exports = { getClient, isAvailable, connect, disconnect };
