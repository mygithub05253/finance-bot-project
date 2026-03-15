const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

const anthropic = new Anthropic({ apiKey: config.claudeApiKey });

/**
 * Claude API를 이용한 뉴스 분류 및 요약
 * 수동 URL 등록 시 호출 (3초 이내 목표)
 */

/**
 * 뉴스 본문을 분석하여 종목 분류 + 카테고리 + 요약 + 감성 분석 반환
 * @param {string} newsContent - 뉴스 본문 텍스트
 * @param {Array<{id: number, ticker: string, name: string}>} stockList - 관심 종목 목록
 * @returns {Promise<{stockId: number|null, category: string, summary: string, sentiment: string, keywords: string[]}>}
 */
async function analyzeNews(newsContent, stockList) {
  const stockListText = stockList
    .map(s => `- id: ${s.id}, ticker: ${s.ticker}, 종목명: ${s.name}`)
    .join('\n');

  const prompt = `당신은 한국 금융 뉴스 분석 전문가입니다.
아래 뉴스 본문을 분석하여 JSON 형식으로 응답해주세요.

# 관심 종목 목록
${stockListText}

# 분석 요청
1. 관련 종목: 뉴스가 위 종목 중 어느 종목과 관련 있는지 id를 반환 (없으면 null)
2. 카테고리: 실적/규제/M&A/인사/시장전망/기타 중 하나
3. 요약: 3-5줄 한국어 요약
4. 감성: POSITIVE/NEUTRAL/NEGATIVE 중 하나
5. 키워드: 핵심 키워드 3-5개 배열

# 뉴스 본문
${newsContent}

# 응답 형식 (JSON만 반환, 다른 텍스트 없이)
{
  "stockId": 1,
  "category": "실적",
  "summary": "요약 내용...",
  "sentiment": "POSITIVE",
  "keywords": ["키워드1", "키워드2"]
}`;

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',  // 속도 우선 (3초 이내 목표)
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].text.trim();
  return JSON.parse(responseText);
}

module.exports = { analyzeNews };
