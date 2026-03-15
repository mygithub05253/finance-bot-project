const express = require('express');
const router = express.Router();
const internalAuth = require('../middleware/internalAuth');
const { sendKakaoMessage, formatDailyMessage } = require('../services/kakao.service');

/**
 * 카카오톡 알림 발송 라우터
 * n8n 스케줄러가 매일 07:00 KST에 호출
 *
 * POST /api/notify/daily
 */
router.post('/daily', internalAuth, async (req, res) => {
  const { accessToken, date, newsItems, autoCount, manualCount } = req.body;

  if (!accessToken || !date || !newsItems) {
    return res.status(400).json({
      success: false,
      message: 'accessToken, date, newsItems는 필수입니다.',
    });
  }

  try {
    const message = formatDailyMessage(date, newsItems, autoCount || 0, manualCount || 0);
    await sendKakaoMessage(accessToken, message);

    return res.json({
      success: true,
      message: `카카오톡 발송 완료 (${newsItems.length}건)`,
    });
  } catch (error) {
    console.error('카카오톡 발송 오류:', error.message);
    return res.status(500).json({
      success: false,
      message: '카카오톡 발송 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
