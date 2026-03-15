const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const { analyzeNews } = require('../services/claude.service');
const { createClient: createRedisClient } = require('../config/redis');
const internalAuth = require('../middleware/internalAuth');
const config = require('../config');
const crypto = require('crypto');

/**
 * 수동 URL 등록 라우터
 * POST /api/news/register
 */
router.post('/register', internalAuth, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ success: false, message: 'URL은 필수입니다.' });
  }

  try {
    // 1. Redis 중복 확인 (TTL 7일)
    const redis = createRedisClient();
    const urlHash = crypto.createHash('sha256').update(url).digest('hex').substring(0, 16);
    const redisKey = `news:manual:${urlHash}`;
    const isDuplicate = await redis.get(redisKey);

    if (isDuplicate) {
      await redis.quit();
      return res.status(409).json({
        success: false,
        message: '이미 등록된 URL입니다. (7일 내 중복)',
      });
    }

    // 2. 뉴스 페이지 크롤링 (axios + cheerio)
    const pageResponse = await axios.get(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinanceBot/1.0)' },
    });
    const $ = cheerio.load(pageResponse.data);
    const title = $('title').text().trim() || $('h1').first().text().trim();
    // 본문 추출: 일반적인 article/p 태그 우선
    const contentSnippet = $('article').text().trim().substring(0, 2000)
      || $('p').map((_, el) => $(el).text()).get().join(' ').substring(0, 2000);

    // 3. 관심 종목 목록 조회 (api-server에서 가져옴)
    const stocksResponse = await axios.get(`${config.apiServerUrl}/api/v1/stocks`, {
      headers: { 'X-Internal-Secret': config.internalApiSecret },
    });
    const stocks = stocksResponse.data.data;

    // 4. Claude API 분류/요약 (3초 이내 목표 - claude-haiku 사용)
    const analysis = await analyzeNews(`제목: ${title}\n\n${contentSnippet}`, stocks);

    // 5. api-server에 뉴스 저장
    await axios.post(`${config.apiServerUrl}/api/v1/news`, {
      title,
      url,
      contentSnippet: contentSnippet.substring(0, 500),
      sourceType: 'MANUAL',
      stockId: analysis.stockId,
      summary: analysis.summary,
      category: analysis.category,
      sentiment: analysis.sentiment,
      keywords: analysis.keywords,
    }, {
      headers: { 'X-Internal-Secret': config.internalApiSecret },
    });

    // 6. Redis에 중복 방지 키 등록 (TTL 7일)
    await redis.set(redisKey, '1', 'EX', 7 * 24 * 60 * 60);
    await redis.quit();

    return res.json({
      success: true,
      data: { title, ...analysis },
    });
  } catch (error) {
    console.error('수동 URL 등록 오류:', error.message);
    return res.status(500).json({
      success: false,
      message: '뉴스 등록 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;
