const AppError = require('../errors/AppError');

/**
 * AI API 응답에서 JSON을 안전하게 추출하는 유틸 함수
 *
 * Claude/Perplexity는 JSON을 마크다운 코드블록으로 감싸서 응답하는 경우가 있음:
 *   ```json\n{...}\n```
 * 또는 앞뒤에 설명 텍스트가 붙는 경우도 있음.
 * 이 함수는 그런 케이스를 처리하여 순수 JSON 객체/배열을 반환함.
 *
 * @param {string} text - AI API 응답 텍스트
 * @returns {Object|Array} 파싱된 JSON
 * @throws {AppError} JSON 파싱 실패 시
 */
function parseJson(text) {
  if (!text || typeof text !== 'string') {
    throw AppError.internal('AI 응답이 비어있거나 문자열이 아닙니다.');
  }

  let cleaned = text.trim();

  // 마크다운 코드블록 제거: ```json ... ``` 또는 ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // 배열로 시작하는 경우 (Perplexity 응답)
  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    const jsonCandidate = cleaned.substring(arrayStart, arrayEnd + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch (_) {
      // 배열 파싱 실패 시 객체 파싱 시도
    }
  }

  // 객체로 시작하는 경우 (Claude 응답)
  const objStart = cleaned.indexOf('{');
  const objEnd = cleaned.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    const jsonCandidate = cleaned.substring(objStart, objEnd + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch (e) {
      throw AppError.internal(`AI 응답 JSON 파싱 실패: ${e.message}\n원문: ${text.substring(0, 200)}`);
    }
  }

  // 그대로 파싱 시도
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw AppError.internal(`AI 응답 JSON 파싱 실패: ${e.message}\n원문: ${text.substring(0, 200)}`);
  }
}

module.exports = { parseJson };
