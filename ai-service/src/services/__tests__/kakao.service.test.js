const axios = require('axios');
const { sendKakaoMessage, formatDailyMessage } = require('../kakao.service');

// axios 전체 모킹
jest.mock('axios');

// config 모킹 (frontendUrl 등 환경변수 의존 제거)
jest.mock('../../config', () => ({
  frontendUrl: 'https://finance-news-bot.vercel.app',
}));

describe('kakao.service - sendKakaoMessage', () => {
  const ACCESS_TOKEN = 'test-access-token';
  const MESSAGE = '테스트 메시지';

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('올바른 URL로 POST 요청 전송 (나에게 보내기 memo API)', async () => {
    axios.post.mockResolvedValueOnce({ data: { result_code: 0 } });

    await sendKakaoMessage(ACCESS_TOKEN, MESSAGE);

    // URL 검증: friends API가 아닌 memo API 사용
    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url] = axios.post.mock.calls[0];
    expect(url).toBe('https://kapi.kakao.com/v2/api/talk/memo/default/send');
    expect(url).not.toContain('friends');
  });

  test('Authorization 헤더에 Bearer 토큰 포함', async () => {
    axios.post.mockResolvedValueOnce({ data: { result_code: 0 } });

    await sendKakaoMessage(ACCESS_TOKEN, MESSAGE);

    const [, , config] = axios.post.mock.calls[0];
    expect(config.headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  test('Content-Type이 application/x-www-form-urlencoded', async () => {
    axios.post.mockResolvedValueOnce({ data: { result_code: 0 } });

    await sendKakaoMessage(ACCESS_TOKEN, MESSAGE);

    const [, , config] = axios.post.mock.calls[0];
    expect(config.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  test('receiver_uuids 파라미터 미포함 (memo API는 본인에게 전송)', async () => {
    axios.post.mockResolvedValueOnce({ data: { result_code: 0 } });

    await sendKakaoMessage(ACCESS_TOKEN, MESSAGE);

    // URLSearchParams로 전달된 바디 검증
    const [, body] = axios.post.mock.calls[0];
    const bodyStr = body.toString();
    expect(bodyStr).not.toContain('receiver_uuids');
    expect(bodyStr).toContain('template_object');
  });

  test('template_object에 text와 link 포함', async () => {
    axios.post.mockResolvedValueOnce({ data: { result_code: 0 } });

    await sendKakaoMessage(ACCESS_TOKEN, MESSAGE);

    const [, body] = axios.post.mock.calls[0];
    const templateStr = new URLSearchParams(body.toString()).get('template_object');
    const template = JSON.parse(templateStr);

    expect(template.object_type).toBe('text');
    expect(template.text).toBe(MESSAGE);
    expect(template.link).toBeDefined();
    expect(template.link.web_url).toContain('/dashboard');
  });

  test('카카오 API 오류 시 에러 코드 포함한 메시지 throw', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { code: -401, msg: 'expired access token' } },
    });

    await expect(sendKakaoMessage(ACCESS_TOKEN, MESSAGE)).rejects.toThrow(
      '카카오 API 오류 [-401]: expired access token'
    );
  });

  test('네트워크 오류 시 원본 에러 re-throw', async () => {
    const networkError = new Error('ECONNREFUSED');
    axios.post.mockRejectedValueOnce(networkError);

    await expect(sendKakaoMessage(ACCESS_TOKEN, MESSAGE)).rejects.toThrow('ECONNREFUSED');
  });
});

describe('kakao.service - formatDailyMessage', () => {
  const DATE = '2026-03-17';
  const NEWS_ITEMS = [
    { ticker: '005930', name: '삼성전자', summary: 'HBM3E 양산 본격화로 2분기 실적 개선 기대.', url: 'https://news.example.com/1' },
    { ticker: 'NVDA', name: 'NVIDIA', summary: 'AI 서버 수요 증가로 GPU 가격 상승 전망.', url: 'https://news.example.com/2' },
  ];

  test('날짜 헤더 포함', () => {
    const msg = formatDailyMessage(DATE, NEWS_ITEMS, 5, 2);
    expect(msg).toContain(`📰 [${DATE}] 오늘의 금융 뉴스`);
  });

  test('종목 ticker와 name 포함', () => {
    const msg = formatDailyMessage(DATE, NEWS_ITEMS, 5, 2);
    expect(msg).toContain('삼성전자 (005930)');
    expect(msg).toContain('NVIDIA (NVDA)');
  });

  test('자동/수동 건수 footer 포함', () => {
    const msg = formatDailyMessage(DATE, NEWS_ITEMS, 5, 2);
    expect(msg).toContain('자동 5건 | 수동 2건');
  });

  test('구분선(─────)으로 종목 구분', () => {
    const msg = formatDailyMessage(DATE, NEWS_ITEMS, 3, 1);
    expect(msg).toContain('─────────────────');
  });

  test('80자 초과 요약은 잘라서 … 추가', () => {
    const longSummary = 'A'.repeat(100);
    const items = [{ ticker: 'TEST', name: '테스트', summary: longSummary, url: 'https://example.com' }];
    const msg = formatDailyMessage(DATE, items, 1, 0);
    expect(msg).toContain('…');
    // 80자 + '…' = 81자
    expect(msg).toContain('A'.repeat(80) + '…');
  });

  test('빈 newsItems 배열 처리', () => {
    const msg = formatDailyMessage(DATE, [], 0, 0);
    expect(msg).toContain(`📰 [${DATE}]`);
    expect(msg).toContain('자동 0건 | 수동 0건');
  });
});
