const axios = require('axios');
const cheerio = require('cheerio');
const { analyzeNews } = require('../services/claude.service');
const { fetchStockNews } = require('../services/perplexity.service');
const config = require('../config');
const AppError = require('../errors/AppError');

/**
 * 수동 URL 등록 컨트롤러
 * POST /api/news/register
 *
 * 플로우:
 * 1. Redis 중복 확인 (7일 TTL) — dedup.service 브랜치에서 통합 예정
 * 2. 페이지 크롤링 (axios + cheerio)
 * 3. Claude 분류/요약
 * 4. api-server 저장
 * 5. Redis 중복 키 등록
 */
async function registerNews(req, res, next) {
  const { url } = req.body;

  if (!url) {
    return next(AppError.badRequest('URL은 필수입니다.'));
  }

  try {
    // 1. 뉴스 페이지 크롤링
    let pageResponse;
    try {
      pageResponse = await axios.get(url, {
        timeout: 5000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FinanceBot/1.0)' },
      });
    } catch (e) {
      return next(AppError.badRequest(`URL 크롤링 실패: ${e.message}`));
    }

    const $ = cheerio.load(pageResponse.data);
    const title = $('title').text().trim() || $('h1').first().text().trim() || '제목 없음';
    const contentSnippet = (
      $('article').text().trim() ||
      $('p').map((_, el) => $(el).text()).get().join(' ')
    ).substring(0, 2000);

    // 2. 관심 종목 목록 조회
    const stocksResponse = await axios.get(`${config.apiServerUrl}/api/v1/stocks`, {
      headers: { 'X-Internal-Secret': config.internalApiSecret },
      timeout: 5000,
    });
    const stocks = stocksResponse.data.data || [];

    // 3. Claude 분류/요약 (3초 이내 목표)
    const analysis = await analyzeNews(`제목: ${title}\n\n${contentSnippet}`, stocks);

    // 4. api-server 저장
    await axios.post(
      `${config.apiServerUrl}/api/v1/news`,
      {
        title,
        url,
        contentSnippet: contentSnippet.substring(0, 500),
        sourceType: 'MANUAL',
        stockId: analysis.stockId,
        summary: analysis.summary,
        category: analysis.category,
        sentiment: analysis.sentiment,
        keywords: analysis.keywords,
      },
      { headers: { 'X-Internal-Secret': config.internalApiSecret } }
    );

    return res.json({ success: true, data: { title, ...analysis } });
  } catch (error) {
    return next(error);
  }
}

/**
 * n8n 자동 수집 배치 컨트롤러
 * POST /api/news/batch
 *
 * n8n 스케줄러 (07:00 KST)가 호출.
 * 등록된 활성 종목 전체에 대해 Perplexity로 뉴스 수집 → api-server 저장.
 * 중복방지는 dedup.service 브랜치에서 통합 예정.
 */
async function batchCollect(req, res, next) {
  try {
    // 1. 활성 종목 목록 조회
    const stocksResponse = await axios.get(`${config.apiServerUrl}/api/v1/stocks`, {
      headers: { 'X-Internal-Secret': config.internalApiSecret },
      timeout: 5000,
    });
    const stocks = stocksResponse.data.data || [];

    if (stocks.length === 0) {
      return res.json({ success: true, message: '등록된 활성 종목 없음', saved: 0 });
    }

    let savedCount = 0;
    const errors = [];

    // 2. 종목별 순차 수집 (API 레이트 리밋 고려)
    for (const stock of stocks) {
      try {
        const newsItems = await fetchStockNews(stock.ticker, stock.name);

        for (const item of newsItems) {
          try {
            await axios.post(
              `${config.apiServerUrl}/api/v1/news`,
              {
                title: item.title,
                url: item.url,
                contentSnippet: item.summary,
                sourceType: 'AUTO',
                stockId: stock.id,
                summary: item.summary,
                category: '시장전망',
                sentiment: 'NEUTRAL',
                keywords: [],
                publishedAt: item.publishedAt,
              },
              { headers: { 'X-Internal-Secret': config.internalApiSecret } }
            );
            savedCount++;
          } catch (saveErr) {
            // URL 중복(409) 등 개별 저장 실패는 스킵
            if (saveErr.response?.status !== 409) {
              errors.push(`[${stock.ticker}] 저장 실패: ${saveErr.message}`);
            }
          }
        }
      } catch (fetchErr) {
        errors.push(`[${stock.ticker}] 수집 실패: ${fetchErr.message}`);
      }
    }

    return res.json({
      success: true,
      message: `배치 수집 완료`,
      saved: savedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { registerNews, batchCollect };
