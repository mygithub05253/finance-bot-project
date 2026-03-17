const axios = require('axios');
const config = require('../config');

/**
 * 카카오톡 나에게 보내기 API 연동
 * - API: POST /v2/api/talk/memo/default/send (나에게 보내기)
 * - 매일 아침 07:00~07:30 사이 n8n 스케줄러가 호출
 * - 1,000자 제한: 종목별 요약 길이 자동 조절
 */

const KAKAO_MEMO_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';

/**
 * 카카오톡 나에게 보내기 발송
 * @param {string} accessToken - 카카오 액세스 토큰 (talk_message 스코프 필요)
 * @param {string} messageText - 발송할 메시지 텍스트 (1,000자 이하)
 * @returns {Promise<void>}
 * @throws {Error} 카카오 API 오류 시 상세 에러 메시지 포함
 */
async function sendKakaoMessage(accessToken, messageText) {
  // 카카오 memo API는 form-urlencoded + template_object JSON 문자열
  const params = new URLSearchParams();
  params.append(
    'template_object',
    JSON.stringify({
      object_type: 'text',
      text: messageText,
      link: {
        web_url: `${config.frontendUrl}/dashboard`,
        mobile_web_url: `${config.frontendUrl}/dashboard`,
      },
    })
  );

  try {
    await axios.post(KAKAO_MEMO_URL, params, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  } catch (error) {
    // 카카오 API 에러 응답 파싱 (error_code, message 필드)
    const kakaoError = error.response?.data;
    if (kakaoError) {
      const msg = `카카오 API 오류 [${kakaoError.code}]: ${kakaoError.msg}`;
      throw new Error(msg);
    }
    throw error;
  }
}

/**
 * 뉴스 요약 목록을 카카오톡 메시지 형식으로 포맷팅
 * - 1,000자 제한을 고려해 종목당 요약을 80자 이내로 자름
 * @param {string} date - 날짜 (YYYY-MM-DD)
 * @param {Array<{ticker: string, name: string, summary: string, url: string}>} newsItems
 * @param {number} autoCount - 자동 수집 건수
 * @param {number} manualCount - 수동 등록 건수
 * @returns {string} 카카오톡 메시지 텍스트
 */
function formatDailyMessage(date, newsItems, autoCount, manualCount) {
  const MAX_SUMMARY_LEN = 80;
  const header = `📰 [${date}] 오늘의 금융 뉴스\n\n`;

  const body = newsItems
    .map(item => {
      // 요약이 너무 길면 자르기
      const summary =
        item.summary.length > MAX_SUMMARY_LEN
          ? item.summary.slice(0, MAX_SUMMARY_LEN) + '…'
          : item.summary;
      return `📊 ${item.name} (${item.ticker})\n  ${summary}\n  출처: ${item.url}`;
    })
    .join('\n─────────────────\n');

  const footer = `\n─────────────────\n자동 ${autoCount}건 | 수동 ${manualCount}건`;

  return header + body + footer;
}

module.exports = { sendKakaoMessage, formatDailyMessage };
