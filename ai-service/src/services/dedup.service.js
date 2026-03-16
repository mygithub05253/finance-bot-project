const crypto = require('crypto');
const redisConfig = require('../config/redis');

/**
 * 뉴스 중복 방지 서비스 (Redis TTL 기반)
 *
 * - 자동 수집 (AUTO): TTL 24시간 → 매일 동일 뉴스를 다시 수집해도 중복 저장 방지
 * - 수동 등록 (MANUAL): TTL 7일 → 같은 URL을 일주일 내 재등록 방지
 *
 * Redis 연결 실패 시 fallback: isDuplicate → false 반환 (중복 허용)
 * → Redis 장애가 ai-service 전체를 멈추지 않도록 설계
 */

const TTL_AUTO_SECONDS = 24 * 60 * 60;    // 24시간
const TTL_MANUAL_SECONDS = 7 * 24 * 60 * 60; // 7일

const REDIS_KEY_PREFIX = 'news:dedup:';

/**
 * URL을 SHA-256 해시로 변환 (Redis 키 길이 제한 및 특수문자 회피)
 * @param {string} url
 * @returns {string} 16진수 해시 문자열
 */
function hashUrl(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

/**
 * Redis 키 생성
 * @param {string} url
 * @param {'auto'|'manual'} type
 * @returns {string} e.g. "news:dedup:auto:abc123..."
 */
function buildKey(url, type) {
  return `${REDIS_KEY_PREFIX}${type}:${hashUrl(url)}`;
}

/**
 * TTL 결정
 * @param {'auto'|'manual'} type
 * @returns {number} 초 단위 TTL
 */
function getTtl(type) {
  return type === 'manual' ? TTL_MANUAL_SECONDS : TTL_AUTO_SECONDS;
}

/**
 * 해당 URL이 이미 처리된 중복인지 확인
 * Redis 비가용 시 false 반환 (중복 허용 — 안전한 방향)
 *
 * @param {string} url - 뉴스 URL
 * @param {'auto'|'manual'} type - 수집 유형
 * @returns {Promise<boolean>} true이면 중복
 */
async function isDuplicate(url, type) {
  if (!redisConfig.isAvailable()) {
    console.warn('[Dedup] Redis 비가용 — 중복 검사 건너뜀 (중복 허용)');
    return false;
  }

  try {
    const key = buildKey(url, type);
    const value = await redisConfig.getClient().get(key);
    return value !== null;
  } catch (err) {
    console.warn(`[Dedup] Redis 조회 오류 — 중복 허용으로 처리: ${err.message}`);
    return false;
  }
}

/**
 * URL을 처리 완료로 표시 (Redis에 TTL과 함께 저장)
 * Redis 비가용 시 조용히 넘어감
 *
 * @param {string} url - 뉴스 URL
 * @param {'auto'|'manual'} type - 수집 유형
 * @returns {Promise<void>}
 */
async function markAsProcessed(url, type) {
  if (!redisConfig.isAvailable()) {
    return;
  }

  try {
    const key = buildKey(url, type);
    const ttl = getTtl(type);
    await redisConfig.getClient().setex(key, ttl, '1');
  } catch (err) {
    console.warn(`[Dedup] Redis 저장 오류 — 중복 키 미등록: ${err.message}`);
  }
}

module.exports = { isDuplicate, markAsProcessed };
