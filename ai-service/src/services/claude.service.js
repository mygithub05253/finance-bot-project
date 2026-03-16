const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const { parseJson } = require('../utils/parseJson');
const AppError = require('../errors/AppError');

const anthropic = new Anthropic({ apiKey: config.claudeApiKey });

/**
 * Claude API를 이용한 뉴스 분류 및 요약
 * 수동 URL 등록 시 호출 (3초 이내 목표)
 */

const VALID_SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
const VALID_CATEGORIES = ['실적', '규제', 'M&A', '인사', '시장전망', '기타'];

/**
 * Claude 응답에서 결과를 검증하고 정규화
 * @param {Object} raw - parseJson으로 추출한 원시 객체
 * @returns {{stockId: number|null, category: string, summary: string, sentiment: string, keywords: string[]}}
 */
function normalizeAnalysisResult(raw) {
  // stockId: 정수 또는 null (문자열 "null", 0, undefined도 null로 처리)
  let stockId = null;
  if (raw.stockId !== null && raw.stockId !== undefined && raw.stockId !== 'null') {
    const parsed = parseInt(raw.stockId, 10);
    if (!isNaN(parsed) && parsed > 0) {
      stockId = parsed;
    }
  }

  // sentiment: POSITIVE/NEUTRAL/NEGATIVE 중 하나, 그 외엔 NEUTRAL로 fallback
  const sentiment = VALID_SENTIMENTS.includes(raw.sentiment) ? raw.sentiment : 'NEUTRAL';

  // category: 유효값 중 하나, 그 외엔 '기타'로 fallback
  const category = VALID_CATEGORIES.includes(raw.category) ? raw.category : '기타';

  // keywords: 배열이 아니거나 없으면 빈 배열로 처리
  const keywords = Array.isArray(raw.keywords) ? raw.keywords.filter(k => typeof k === 'string') : [];

  // summary: 문자열이어야 함
  const summary = typeof raw.summary === 'string' ? raw.summary.trim() : '';

  return { stockId, category, summary, sentiment, keywords };
}

/**
 * 뉴스 본문을 분석하여 종목 분류 + 카테고리 + 요약 + 감성 분석 반환
 * @param {string} newsContent - 뉴스 본문 텍스트
 * @param {Array<{id: number, ticker: string, name: string}>} stockList - 관심 종목 목록
 * @returns {Promise<{stockId: number|null, category: string, summary: string, sentiment: string, keywords: string[]}>}
 */
async function analyzeNews(newsContent, stockList) {
  if (!newsContent || typeof newsContent !== 'string') {
    throw AppError.badRequest('뉴스 본문이 없거나 잘못된 형식입니다.');
  }

  const stockListText = stockList.length > 0
    ? stockList.map(s => `- id: ${s.id}, ticker: ${s.ticker}, 종목명: ${s.name}`).join('\n')
    : '(등록된 관심 종목 없음)';

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

  const responseText = message.content[0].text;
  const raw = parseJson(responseText);
  return normalizeAnalysisResult(raw);
}

module.exports = { analyzeNews };
