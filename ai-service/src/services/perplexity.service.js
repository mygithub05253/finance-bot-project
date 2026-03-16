const axios = require('axios');
const config = require('../config');
const { parseJson } = require('../utils/parseJson');

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

// 응답 아이템 필수 필드
const REQUIRED_FIELDS = ['title', 'url', 'summary'];

/**
 * Perplexity 응답 아이템 유효성 검증
 * @param {any} item
 * @returns {boolean}
 */
function isValidNewsItem(item) {
  if (!item || typeof item !== 'object') return false;
  return REQUIRED_FIELDS.every((field) => item[field] && typeof item[field] === 'string');
}

/**
 * 재시도 포함 axios 요청
 * 타임아웃 또는 5xx 서버 오류 시 최대 maxRetries회 재시도
 *
 * @param {Function} requestFn - 실행할 비동기 함수
 * @param {number} maxRetries - 최대 재시도 횟수 (기본 2)
 * @param {number} delayMs - 재시도 간격 ms (기본 1000)
 */
async function withRetry(requestFn, maxRetries = 2, delayMs = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (err) {
      lastError = err;
      const isRetryable =
        err.code === 'ECONNABORTED' ||
        err.code === 'ETIMEDOUT' ||
        (err.response && err.response.status >= 500);
      if (!isRetryable || attempt === maxRetries) break;
      console.warn(`[Perplexity] 요청 실패 (${attempt}/${maxRetries}회), ${delayMs}ms 후 재시도...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

/**
 * Perplexity API로 특정 종목의 최신 뉴스 수집
 * n8n 스케줄러 → batchCollect 컨트롤러를 통해 매일 07:00 KST에 호출됨
 *
 * @param {string} ticker - 종목코드 (예: 005930)
 * @param {string} stockName - 종목명 (예: 삼성전자)
 * @returns {Promise<Array<{title: string, url: string, summary: string, publishedAt: string|null}>>}
 *          뉴스가 없거나 파싱 실패 시 빈 배열 반환
 */
async function fetchStockNews(ticker, stockName) {
  const today = new Date().toISOString().split('T')[0];

  const prompt = `${stockName}(${ticker}) 관련 오늘(${today}) 최신 뉴스를 최대 3건 찾아주세요.
각 뉴스에 대해 JSON 배열 형식으로만 반환해주세요. 뉴스가 없으면 빈 배열 []을 반환하세요:
[
  {
    "title": "뉴스 제목",
    "url": "https://...",
    "summary": "2-3줄 요약",
    "publishedAt": "2026-03-16T00:00:00Z"
  }
]
JSON 배열만 반환하고 다른 텍스트는 포함하지 마세요.`;

  const responseData = await withRetry(async () => {
    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        return_citations: true,
      },
      {
        headers: {
          Authorization: `Bearer ${config.perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );
    return response.data;
  });

  const content = responseData.choices?.[0]?.message?.content;
  if (!content) {
    console.warn(`[Perplexity] ${ticker} 응답 content 없음. 빈 배열 반환.`);
    return [];
  }

  // JSON 파싱 (마크다운 코드블록 처리 포함)
  let parsed;
  try {
    parsed = parseJson(content);
  } catch (_) {
    console.warn(`[Perplexity] ${ticker} JSON 파싱 실패. 빈 배열 반환.`);
    return [];
  }

  // 배열이 아닌 응답 처리
  if (!Array.isArray(parsed)) {
    console.warn(`[Perplexity] ${ticker} 응답이 배열이 아님. 빈 배열 반환.`);
    return [];
  }

  // 유효한 아이템만 필터링 + publishedAt 정규화
  return parsed
    .filter((item) => {
      if (!isValidNewsItem(item)) {
        console.warn(`[Perplexity] 유효하지 않은 아이템 스킵: ${JSON.stringify(item).substring(0, 80)}`);
        return false;
      }
      return true;
    })
    .map((item) => ({
      title: item.title,
      url: item.url,
      summary: item.summary,
      publishedAt: item.publishedAt && !isNaN(Date.parse(item.publishedAt)) ? item.publishedAt : null,
    }));
}

module.exports = { fetchStockNews };
