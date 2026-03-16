/**
 * claude.service.test.js
 *
 * @anthropic-ai/sdk 모킹 전략:
 * - jest.mock 팩토리 내부에서 mockCreate를 생성하고 MockAnthropicClass에 노출
 * - 서비스 모듈이 로드될 때 생성되는 인스턴스와 동일한 mockCreate를 공유
 */
jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  const MockAnthropicClass = jest.fn(() => ({
    messages: { create: mockCreate },
  }));
  // 테스트에서 접근할 수 있도록 노출
  MockAnthropicClass._mockCreate = mockCreate;
  return MockAnthropicClass;
});

const Anthropic = require('@anthropic-ai/sdk');
const { analyzeNews } = require('../claude.service');

/** 테스트용 관심 종목 목록 */
const mockStockList = [
  { id: 1, ticker: '005930', name: '삼성전자' },
  { id: 2, ticker: '000660', name: 'SK하이닉스' },
];

/** Claude API 응답 텍스트를 messages.create 반환값으로 감싸는 헬퍼 */
function mockResponse(text) {
  return { content: [{ text }] };
}

describe('claude.service - analyzeNews', () => {
  const mockCreate = Anthropic._mockCreate;

  beforeEach(() => {
    mockCreate.mockReset();
  });

  test('정상 JSON 응답을 파싱하여 분석 결과 반환', async () => {
    mockCreate.mockResolvedValueOnce(mockResponse(JSON.stringify({
      stockId: 1,
      category: '실적',
      summary: '삼성전자 2분기 실적 발표 내용.',
      sentiment: 'POSITIVE',
      keywords: ['실적', 'HBM', '반도체'],
    })));

    const result = await analyzeNews('삼성전자 실적 뉴스 본문', mockStockList);

    expect(result.stockId).toBe(1);
    expect(result.category).toBe('실적');
    expect(result.sentiment).toBe('POSITIVE');
    expect(result.keywords).toEqual(['실적', 'HBM', '반도체']);
    expect(typeof result.summary).toBe('string');
  });

  test('마크다운 코드블록으로 감싼 JSON도 정상 파싱', async () => {
    const wrapped = `\`\`\`json
{
  "stockId": 2,
  "category": "시장전망",
  "summary": "SK하이닉스 D램 전망.",
  "sentiment": "NEUTRAL",
  "keywords": ["D램", "AI서버"]
}
\`\`\``;
    mockCreate.mockResolvedValueOnce(mockResponse(wrapped));

    const result = await analyzeNews('SK하이닉스 뉴스 본문', mockStockList);

    expect(result.stockId).toBe(2);
    expect(result.sentiment).toBe('NEUTRAL');
    expect(result.keywords).toContain('D램');
  });

  test('유효하지 않은 sentiment는 NEUTRAL로 fallback', async () => {
    mockCreate.mockResolvedValueOnce(mockResponse(JSON.stringify({
      stockId: 1,
      category: '규제',
      summary: '규제 관련 뉴스.',
      sentiment: 'VERY_POSITIVE',  // 유효하지 않은 값
      keywords: ['규제'],
    })));

    const result = await analyzeNews('규제 뉴스 본문', mockStockList);

    expect(result.sentiment).toBe('NEUTRAL');
  });

  test('유효하지 않은 category는 기타로 fallback', async () => {
    mockCreate.mockResolvedValueOnce(mockResponse(JSON.stringify({
      stockId: null,
      category: '알수없음',  // 유효하지 않은 값
      summary: '분류 불명 뉴스.',
      sentiment: 'NEUTRAL',
      keywords: [],
    })));

    const result = await analyzeNews('기타 뉴스 본문', mockStockList);

    expect(result.category).toBe('기타');
  });

  test('stockId가 null이면 null 반환', async () => {
    mockCreate.mockResolvedValueOnce(mockResponse(JSON.stringify({
      stockId: null,
      category: '기타',
      summary: '관련 종목 없는 뉴스.',
      sentiment: 'NEUTRAL',
      keywords: ['글로벌'],
    })));

    const result = await analyzeNews('일반 경제 뉴스', mockStockList);

    expect(result.stockId).toBeNull();
  });

  test('stockId가 문자열 "null"이면 null 반환', async () => {
    mockCreate.mockResolvedValueOnce(mockResponse(JSON.stringify({
      stockId: 'null',
      category: '기타',
      summary: '관련 종목 없음.',
      sentiment: 'NEGATIVE',
      keywords: [],
    })));

    const result = await analyzeNews('일반 뉴스', mockStockList);

    expect(result.stockId).toBeNull();
  });

  test('keywords가 없으면 빈 배열 반환', async () => {
    mockCreate.mockResolvedValueOnce(mockResponse(JSON.stringify({
      stockId: 1,
      category: '인사',
      summary: '임원 인사 발표.',
      sentiment: 'NEUTRAL',
      // keywords 필드 없음
    })));

    const result = await analyzeNews('인사 뉴스', mockStockList);

    expect(result.keywords).toEqual([]);
  });

  test('keywords 배열에 비문자열이 포함되면 필터링', async () => {
    mockCreate.mockResolvedValueOnce(mockResponse(JSON.stringify({
      stockId: 1,
      category: '실적',
      summary: '실적 뉴스.',
      sentiment: 'POSITIVE',
      keywords: ['반도체', 123, null, '실적'],  // 비문자열 포함
    })));

    const result = await analyzeNews('실적 뉴스', mockStockList);

    expect(result.keywords).toEqual(['반도체', '실적']);
  });

  test('관심 종목 목록이 비어있어도 정상 처리', async () => {
    mockCreate.mockResolvedValueOnce(mockResponse(JSON.stringify({
      stockId: null,
      category: '시장전망',
      summary: '글로벌 경제 전망.',
      sentiment: 'NEUTRAL',
      keywords: ['경제', '전망'],
    })));

    const result = await analyzeNews('글로벌 경제 뉴스', []);

    expect(result.stockId).toBeNull();
    expect(result.category).toBe('시장전망');
  });

  test('뉴스 본문이 빈 문자열이면 AppError 발생', async () => {
    await expect(analyzeNews('', mockStockList)).rejects.toThrow('뉴스 본문이 없거나 잘못된 형식입니다.');
  });

  test('뉴스 본문이 null이면 AppError 발생', async () => {
    await expect(analyzeNews(null, mockStockList)).rejects.toThrow('뉴스 본문이 없거나 잘못된 형식입니다.');
  });
});
