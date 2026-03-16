const express = require('express');
const router = express.Router();
const internalAuth = require('../middleware/internalAuth');
const { registerNews, batchCollect } = require('../controllers/news.controller');

/**
 * 뉴스 라우터
 *
 * POST /api/news/register — 수동 URL 등록 (프론트엔드 → ai-service)
 * POST /api/news/batch    — n8n 자동 수집 배치 (n8n → ai-service)
 */
router.post('/register', internalAuth, registerNews);
router.post('/batch', internalAuth, batchCollect);

module.exports = router;
