const axios = require('axios');
const config = require('../config');

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

/**
 * Perplexity API를 이용한 관심 종목 뉴스 자동 수집
 * n8n 스케줄러가 매일 07:00 KST에 호출
 */

/**
 * 특정 종목의 최신 뉴스를 Perplexity로 수집
 * @param {string} ticker - 종목코드
 * @param {string} stockName - 종목명
 * @returns {Promise<Array<{title: string, url: string, summary: string, publishedAt: string}>>}
 */
async function fetchStockNews(ticker, stockName) {
  const today = new Date().toISOString().split('T')[0];

  const prompt = `${stockName}(${ticker}) 관련 오늘(${today}) 최신 뉴스를 3건 찾아주세요.
각 뉴스에 대해 JSON 배열 형식으로 반환해주세요:
[
  {
    "title": "뉴스 제목",
    "url": "https://...",
    "summary": "2-3줄 요약",
    "publishedAt": "2024-01-01T00:00:00Z"
  }
]
JSON 배열만 반환하고 다른 텍스트는 포함하지 마세요.`;

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
      timeout: 15000,  // 15초 타임아웃
    }
  );

  const content = response.data.choices[0].message.content.trim();
  return JSON.parse(content);
}

module.exports = { fetchStockNews };
