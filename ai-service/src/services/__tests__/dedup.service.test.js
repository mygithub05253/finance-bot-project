/**
 * dedup.service.test.js
 *
 * redis 모킹 전략:
 * - '../config/redis' 모듈 전체를 jest.mock으로 교체
 * - isAvailable, getClient().get(), getClient().setex() 제어
 */

const mockGet = jest.fn();
const mockSetex = jest.fn();

jest.mock('../../config/redis', () => ({
  isAvailable: jest.fn(),
  getClient: jest.fn(() => ({
    get: mockGet,
    setex: mockSetex,
  })),
}));

const redisConfig = require('../../config/redis');
const { isDuplicate, markAsProcessed } = require('../dedup.service');

describe('dedup.service - isDuplicate', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSetex.mockReset();
    redisConfig.isAvailable.mockReset();
  });

  test('Redis 가용 + 키 없음 → false (중복 아님)', async () => {
    redisConfig.isAvailable.mockReturnValue(true);
    mockGet.mockResolvedValueOnce(null);

    const result = await isDuplicate('https://example.com/news/1', 'auto');

    expect(result).toBe(false);
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  test('Redis 가용 + 키 존재 → true (중복)', async () => {
    redisConfig.isAvailable.mockReturnValue(true);
    mockGet.mockResolvedValueOnce('1');

    const result = await isDuplicate('https://example.com/news/1', 'auto');

    expect(result).toBe(true);
  });

  test('Redis 비가용 → false (중복 허용 fallback)', async () => {
    redisConfig.isAvailable.mockReturnValue(false);

    const result = await isDuplicate('https://example.com/news/1', 'auto');

    expect(result).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  test('Redis GET 오류 → false (중복 허용 fallback)', async () => {
    redisConfig.isAvailable.mockReturnValue(true);
    mockGet.mockRejectedValueOnce(new Error('ECONNRESET'));

    const result = await isDuplicate('https://example.com/news/1', 'auto');

    expect(result).toBe(false);
  });

  test('동일 URL + 동일 type → 동일 키 생성 (일관성)', async () => {
    redisConfig.isAvailable.mockReturnValue(true);
    mockGet.mockResolvedValue(null);

    await isDuplicate('https://same.com/article', 'auto');
    await isDuplicate('https://same.com/article', 'auto');

    const [firstCall, secondCall] = mockGet.mock.calls;
    expect(firstCall[0]).toBe(secondCall[0]);
  });

  test('동일 URL + type 다름 → 다른 키 생성', async () => {
    redisConfig.isAvailable.mockReturnValue(true);
    mockGet.mockResolvedValue(null);

    await isDuplicate('https://same.com/article', 'auto');
    await isDuplicate('https://same.com/article', 'manual');

    const [autoCall, manualCall] = mockGet.mock.calls;
    expect(autoCall[0]).not.toBe(manualCall[0]);
    expect(autoCall[0]).toContain(':auto:');
    expect(manualCall[0]).toContain(':manual:');
  });
});

describe('dedup.service - markAsProcessed', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSetex.mockReset();
    redisConfig.isAvailable.mockReset();
  });

  test('Redis 가용 + auto → TTL 86400초(24h)로 setex 호출', async () => {
    redisConfig.isAvailable.mockReturnValue(true);
    mockSetex.mockResolvedValueOnce('OK');

    await markAsProcessed('https://example.com/news/auto', 'auto');

    expect(mockSetex).toHaveBeenCalledTimes(1);
    const [key, ttl, value] = mockSetex.mock.calls[0];
    expect(key).toContain(':auto:');
    expect(ttl).toBe(86400);  // 24 * 60 * 60
    expect(value).toBe('1');
  });

  test('Redis 가용 + manual → TTL 604800초(7d)로 setex 호출', async () => {
    redisConfig.isAvailable.mockReturnValue(true);
    mockSetex.mockResolvedValueOnce('OK');

    await markAsProcessed('https://example.com/news/manual', 'manual');

    const [, ttl] = mockSetex.mock.calls[0];
    expect(ttl).toBe(604800);  // 7 * 24 * 60 * 60
  });

  test('Redis 비가용 → setex 호출 없이 정상 종료', async () => {
    redisConfig.isAvailable.mockReturnValue(false);

    await expect(markAsProcessed('https://example.com/news/1', 'auto')).resolves.toBeUndefined();
    expect(mockSetex).not.toHaveBeenCalled();
  });

  test('Redis SETEX 오류 → 예외 없이 정상 종료 (경고 로그만)', async () => {
    redisConfig.isAvailable.mockReturnValue(true);
    mockSetex.mockRejectedValueOnce(new Error('ECONNRESET'));

    await expect(markAsProcessed('https://example.com/news/1', 'auto')).resolves.toBeUndefined();
  });
});
