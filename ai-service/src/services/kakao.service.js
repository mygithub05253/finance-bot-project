const axios = require('axios');
const config = require('../config');

const KAKAO_API_URL = 'https://kapi.kakao.com/v1/api/talk/friends/message/default/send';

/**
 * 카카오톡 나에게 보내기 API 연동
 * 매일 아침 07:00~07:30 사이에 뉴스 요약 발송
 */

/**
 * 카카오톡 메시지 발송
 * @param {string} accessToken - 카카오 액세스 토큰
 * @param {string} messageText - 발송할 메시지 텍스트
 * @returns {Promise<void>}
 */
async function sendKakaoMessage(accessToken, messageText) {
  await axios.post(
    KAKAO_API_URL,
    {
      receiver_uuids: JSON.stringify([config.kakaoTargetUuid]),
      template_object: JSON.stringify({
        object_type: 'text',
        text: messageText,
        link: {
          web_url: `${config.apiServerUrl}/dashboard`,
          mobile_web_url: `${config.apiServerUrl}/dashboard`,
        },
      }),
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
}

/**
 * 뉴스 요약 목록을 카카오톡 메시지 형식으로 포맷팅
 * @param {string} date - 날짜 (YYYY-MM-DD)
 * @param {Array<{ticker: string, name: string, summary: string, url: string}>} newsItems
 * @param {number} autoCount - 자동 수집 건수
 * @param {number} manualCount - 수동 등록 건수
 * @returns {string}
 */
function formatDailyMessage(date, newsItems, autoCount, manualCount) {
  const header = `📰 [${date}] 오늘의 금융 뉴스\n\n`;

  const body = newsItems
    .map(item =>
      `📊 ${item.name} (${item.ticker})\n  ${item.summary}\n  출처: ${item.url}`
    )
    .join('\n─────────────────\n');

  const footer = `\n─────────────────\n자동 ${autoCount}건 | 수동 ${manualCount}건`;

  return header + body + footer;
}

module.exports = { sendKakaoMessage, formatDailyMessage };
