const axios = require('axios');
const { sendKakaoMessage, formatDailyMessage } = require('../services/kakao.service');
const AppError = require('../errors/AppError');
const config = require('../config');

/**
 * 카카오톡 일일 뉴스 알림 발송 컨트롤러
 * POST /api/notify/daily
 *
 * GitHub Actions 스케줄러 (07:00 KST)에서 호출.
 * KAKAO_ACCESS_TOKEN 환경변수에서 토큰을 읽고,
 * api-server에서 오늘 뉴스를 직접 조회한 후 카카오톡으로 발송.
 */
async function sendDailyNotification(req, res, next) {
  // 환경변수에서 카카오 액세스 토큰 읽기
  const accessToken = config.kakaoAccessToken;

  if (!accessToken) {
    return next(AppError.badRequest('KAKAO_ACCESS_TOKEN 환경변수가 설정되지 않았습니다.'));
  }

  try {
    // 오늘 날짜 (KST 기준 YYYY-MM-DD)
    const todayKST = new Date().toLocaleDateString('sv-SE', {
      timeZone: 'Asia/Seoul',
    }); // → "2026-03-20" 형식

    // api-server에서 오늘 뉴스 조회
    const newsResponse = await axios.get(`${config.apiServerUrl}/api/v1/news`, {
      params: { fromDate: todayKST, size: 20, page: 0 },
      headers: { 'X-Internal-Secret': config.internalApiSecret },
      timeout: 10000,
    });

    const newsData = newsResponse.data?.data?.content || [];

    if (newsData.length === 0) {
      return res.json({
        success: true,
        message: '오늘 수집된 뉴스가 없어 카카오톡 발송을 건너뜁니다.',
        sent: 0,
      });
    }

    // 뉴스 데이터를 카카오 메시지 포맷으로 변환
    const newsItems = newsData.map(item => ({
      ticker: item.stock?.ticker || '',
      name: item.stock?.name || '',
      summary: item.summary?.summary || '',
      url: item.url || '',
    }));

    const autoCount = newsData.filter(item => item.sourceType === 'AUTO').length;
    const manualCount = newsData.filter(item => item.sourceType === 'MANUAL').length;

    const message = formatDailyMessage(todayKST, newsItems, autoCount, manualCount);
    await sendKakaoMessage(accessToken, message);

    return res.json({
      success: true,
      message: `카카오톡 발송 완료 (${newsItems.length}건)`,
      sent: newsItems.length,
      autoCount,
      manualCount,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { sendDailyNotification };
