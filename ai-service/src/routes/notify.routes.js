const express = require('express');
const router = express.Router();
const internalAuth = require('../middleware/internalAuth');
const { sendDailyNotification } = require('../controllers/notify.controller');

/**
 * 알림 라우터
 *
 * POST /api/notify/daily — 카카오톡 일일 뉴스 발송 (n8n → ai-service)
 */
router.post('/daily', internalAuth, sendDailyNotification);

module.exports = router;
