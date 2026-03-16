const { sendKakaoMessage, formatDailyMessage } = require('../services/kakao.service');
const AppError = require('../errors/AppError');

/**
 * 카카오톡 일일 뉴스 알림 발송 컨트롤러
 * POST /api/notify/daily
 *
 * n8n 스케줄러 (07:00 KST)가 accessToken과 뉴스 데이터를 담아 호출.
 */
async function sendDailyNotification(req, res, next) {
  const { accessToken, date, newsItems, autoCount, manualCount } = req.body;

  if (!accessToken || !date || !newsItems) {
    return next(AppError.badRequest('accessToken, date, newsItems는 필수입니다.'));
  }

  if (!Array.isArray(newsItems)) {
    return next(AppError.badRequest('newsItems는 배열이어야 합니다.'));
  }

  try {
    const message = formatDailyMessage(date, newsItems, autoCount || 0, manualCount || 0);
    await sendKakaoMessage(accessToken, message);

    return res.json({
      success: true,
      message: `카카오톡 발송 완료 (${newsItems.length}건)`,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { sendDailyNotification };
