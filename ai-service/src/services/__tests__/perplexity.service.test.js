const axios = require('axios');
const { fetchStockNews } = require('../perplexity.service');

// axios 전체 모킹
jest.mock('axios');

describe('perplexity.service - fetchStockNews', () => {
  const ticker = '005930';
  const stockName = '삼성전자';

  // 정상 응답 헬퍼
  const mockResponse = (content) => ({
    data: {
      choices: [{ message: { content } }],
    },
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('정상 JSON 배열 파싱', async () => {
    const newsArray = [
      { title: '삼성전자 뉴스1', url: 'https://example.com/1', summary: '요약1', publishedAt: '2026-03-16T00:00:00Z' },
      { title: '삼성전자 뉴스2', url: 'https://example.com/2', summary: '요약2', publishedAt: '2026-03-16T01:00:00Z' },
    ];
    axios.post.mockResolvedValueOnce(mockResponse(JSON.stringify(newsArray)));

    const result = await fetchStockNews(ticker, stockName);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('삼성전자 뉴스1');
    expect(result[0].publishedAt).toBe('2026-03-16T00:00:00Z');
  });

  test('마크다운 코드블록으로 감싸진 JSON 파싱', async () => {
    const newsArray = [
      { title: '뉴스1', url: 'https://example.com/1', summary: '요약', publishedAt: null },
    ];
    const wrappedContent = '```json\n' + JSON.stringify(newsArray) + '\n```';
    axios.post.mockResolvedValueOnce(mockResponse(wrappedContent));

    const result = await fetchStockNews(ticker, stockName);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('뉴스1');
  });

  test('빈 배열 응답 처리', async () => {
    axios.post.mockResolvedValueOnce(mockResponse('[]'));

    const result = await fetchStockNews(ticker, stockName);
    expect(result).toEqual([]);
  });

  test('content가 없으면 빈 배열 반환', async () => {
    axios.post.mockResolvedValueOnce({ data: { choices: [{ message: {} }] } });

    const result = await fetchStockNews(ticker, stockName);
    expect(result).toEqual([]);
  });

  test('JSON 파싱 실패 시 빈 배열 반환 (크래시 없음)', async () => {
    axios.post.mockResolvedValueOnce(mockResponse('이것은 JSON이 아닙니다.'));

    const result = await fetchStockNews(ticker, stockName);
    expect(result).toEqual([]);
  });

  test('필수 필드 누락된 아이템은 필터링됨', async () => {
    const newsArray = [
      { title: '유효한 뉴스', url: 'https://example.com/1', summary: '요약' },
      { title: '제목만 있음' }, // url, summary 없음 → 필터링
      { url: 'https://example.com/2', summary: '제목 없음' }, // title 없음 → 필터링
    ];
    axios.post.mockResolvedValueOnce(mockResponse(JSON.stringify(newsArray)));

    const result = await fetchStockNews(ticker, stockName);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('유효한 뉴스');
  });

  test('publishedAt 유효하지 않으면 null로 정규화', async () => {
    const newsArray = [
      { title: '뉴스', url: 'https://example.com', summary: '요약', publishedAt: '잘못된날짜' },
    ];
    axios.post.mockResolvedValueOnce(mockResponse(JSON.stringify(newsArray)));

    const result = await fetchStockNews(ticker, stockName);
    expect(result[0].publishedAt).toBeNull();
  });

  test('서버 오류(500) 시 재시도 후 최종 실패', async () => {
    const serverError = Object.assign(new Error('서버 오류'), { response: { status: 500 } });
    axios.post
      .mockRejectedValueOnce(serverError)
      .mockRejectedValueOnce(serverError);

    await expect(fetchStockNews(ticker, stockName)).rejects.toThrow('서버 오류');
    expect(axios.post).toHaveBeenCalledTimes(2);
  }, 10000);
});
