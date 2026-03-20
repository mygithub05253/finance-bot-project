# [금융 뉴스 큐레이터 #3] Week 2: Perplexity + Claude + Redis로 AI 파이프라인 구축하기

> **시리즈**: n8n + AI로 나만의 투자 뉴스 아카이브 만들기
> **이번 편**: Node.js ai-service에 Perplexity 자동 수집, Claude 분류, Redis 중복 방지를 구현하고 Spring Boot news CRUD까지 완성한 과정

---

## 이번 편에서 다루는 것

- 왜 스켈레톤 코드를 그냥 쓰면 안 됐는가 (품질 이슈 분석)
- `parseJson` 유틸 — Claude/Perplexity 응답의 마크다운 코드블록 문제 해결
- Perplexity API 연동 — 재시도 로직, 응답 유효성 검증
- Claude 뉴스 분류 API — sentiment enum 검증, stockId null 안전 처리
- Redis 중복 방지 — 자동 24h / 수동 7d TTL 설계
- Spring Boot news CRUD — NewsArticle + NewsSummary 한 트랜잭션
- n8n 워크플로우 JSON 구성

---

## 1. 문제 발견: 스켈레톤에 숨어있던 7가지 이슈

Week 2를 시작하면서 기존 스켈레톤 코드를 리뷰했더니 아래 이슈들이 발견됐습니다.

| # | 이슈 | 영향 |
|---|------|------|
| 1 | `JSON.parse(text)` 직접 호출 | Claude/Perplexity가 마크다운 코드블록으로 응답하면 앱 크래시 |
| 2 | Redis 매 요청마다 `new Redis() + quit()` | 비효율적, 연결 실패 시 fallback 없음 |
| 3 | 라우터에 비즈니스 로직 혼재 | 컨트롤러 레이어 없음 → 단위 테스트 불가 |
| 4 | 테스트 파일 0개 | 검증 불가 |
| 5 | `/api/news/batch` 엔드포인트 없음 | n8n이 호출할 배치 진입점 없음 |
| 6 | api-server news 도메인 폴더만 있고 구현 없음 | 뉴스 저장 API 없음 |
| 7 | 카카오 API URL 오류 (`friends` → `memo`) | Week 3 이슈, 미리 파악 |

이 이슈들을 5개 브랜치로 나눠서 해결했습니다.

---

## 2. parseJson 유틸 — 마크다운 코드블록 문제

Claude와 Perplexity는 JSON을 요청해도 가끔 이렇게 응답합니다:

```
```json
{
  "stockId": 1,
  "category": "실적",
  ...
}
```
```

직접 `JSON.parse()` 하면 당연히 에러. 그래서 공통 유틸을 만들었습니다.

```javascript
// ai-service/src/utils/parseJson.js
function parseJson(text) {
  let cleaned = text.trim();
  // 마크다운 코드블록 제거
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // { 와 [ 중 먼저 등장하는 것 우선 시도
  // - Claude 응답: {"keywords":[...]} → { 먼저 → 객체 우선
  // - Perplexity 응답: [{...},{...}] → [ 먼저 → 배열 우선
  const objStart = cleaned.indexOf('{');
  const arrayStart = cleaned.indexOf('[');
  const objectFirst = objStart !== -1 && (arrayStart === -1 || objStart < arrayStart);
  // ...파싱 시도...
}
```

처음에는 배열을 먼저 시도했다가 버그가 났습니다. Claude JSON에 `keywords: ["실적", "HBM"]` 배열이 포함되면, `[`를 먼저 찾아서 키워드 배열만 추출해버리는 문제였습니다. `{`와 `[` 중 먼저 등장하는 쪽을 기준으로 처리하도록 수정하여 해결했습니다.

---

## 3. Perplexity API 연동

```javascript
// ai-service/src/services/perplexity.service.js (핵심 부분)
async function withRetry(requestFn, maxRetries = 2, delayMs = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (err) {
      const isRetryable = err.code === 'ECONNABORTED' || err.response?.status >= 500;
      if (!isRetryable || attempt === maxRetries) throw err;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

async function fetchStockNews(ticker, stockName) {
  return withRetry(async () => {
    const response = await axios.post(PERPLEXITY_API_URL, {
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
      return_citations: true,
    }, { timeout: 15000 });

    const content = response.data.choices[0].message.content;
    const newsItems = parseJson(content);  // 마크다운 코드블록 대응

    if (!Array.isArray(newsItems)) return [];  // 배열 아닌 경우 빈 배열 반환
    return newsItems.filter(isValidNewsItem);  // title/url/summary 필수 필드 검증
  });
}
```

단위 테스트는 8개 작성했습니다 — 정상 파싱, 마크다운 코드블록, 빈 배열, axios 재시도 등.

---

## 4. Claude 분류 API

```javascript
// ai-service/src/services/claude.service.js (핵심 부분)
const VALID_SENTIMENTS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
const VALID_CATEGORIES = ['실적', '규제', 'M&A', '인사', '시장전망', '기타'];

function normalizeAnalysisResult(raw) {
  // stockId: 정수 또는 null (문자열 "null", 0, undefined도 null로)
  let stockId = null;
  if (raw.stockId !== null && raw.stockId !== undefined && raw.stockId !== 'null') {
    const parsed = parseInt(raw.stockId, 10);
    if (!isNaN(parsed) && parsed > 0) stockId = parsed;
  }

  // sentiment: 유효값 아니면 NEUTRAL로 fallback
  const sentiment = VALID_SENTIMENTS.includes(raw.sentiment) ? raw.sentiment : 'NEUTRAL';

  // category: 유효값 아니면 기타로 fallback
  const category = VALID_CATEGORIES.includes(raw.category) ? raw.category : '기타';

  // keywords: 배열 아니거나 없으면 빈 배열, 비문자열 필터링
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.filter(k => typeof k === 'string')
    : [];

  return { stockId, category, summary: raw.summary?.trim() || '', sentiment, keywords };
}
```

Claude가 `"stockId": "null"` (문자열)이나 `"sentiment": "VERY_POSITIVE"` 같은 값을 돌려줄 수 있어서 방어 코드가 필요했습니다.

---

## 5. Redis 중복 방지 설계

PRD의 요구사항: **자동 24h TTL, 수동 7d TTL**

```javascript
// ai-service/src/services/dedup.service.js
const TTL_AUTO_SECONDS = 24 * 60 * 60;      // 24시간
const TTL_MANUAL_SECONDS = 7 * 24 * 60 * 60; // 7일

async function isDuplicate(url, type) {
  if (!redisConfig.isAvailable()) {
    // Redis 비가용 시 중복 허용 (서비스 계속 실행 우선)
    return false;
  }
  const key = `news:dedup:${type}:${sha256(url)}`;
  return (await redis.get(key)) !== null;
}

async function markAsProcessed(url, type) {
  if (!redisConfig.isAvailable()) return; // 조용히 넘어감
  const key = `news:dedup:${type}:${sha256(url)}`;
  await redis.setex(key, getTtl(type), '1');
}
```

**설계 포인트**: Redis가 죽어도 서비스가 멈추면 안 됩니다. `isDuplicate`가 `false`를 반환(중복 허용)하면 같은 뉴스가 2번 저장될 수는 있지만, Redis 장애로 뉴스 수집 자체가 멈추는 것보다 낫습니다.

---

## 6. Spring Boot news CRUD

news_article + news_summary를 한 트랜잭션으로 저장합니다.

```java
// api-server/.../domain/news/service/NewsService.java
@Transactional
public NewsResponse createNews(NewsCreateRequest request) {
  // URL 중복 확인 (DB 레벨 방어)
  if (newsArticleRepository.existsByUrl(request.url())) {
    throw BusinessException.conflict("이미 등록된 URL: " + request.url());
  }

  // NewsArticle 저장
  NewsArticle article = NewsArticle.builder()
      .title(request.title()).url(request.url())
      .sourceType(SourceType.valueOf(request.sourceType()))
      // ...
      .build();
  newsArticleRepository.save(article);

  // NewsSummary 저장 (JSONB keywords 포함)
  NewsSummary summary = NewsSummary.builder()
      .article(article).stock(stock)
      .sentiment(Sentiment.valueOf(request.sentiment()))
      .keywords(request.keywords())
      // ...
      .build();
  newsSummaryRepository.save(summary);

  return NewsResponse.from(article, summary);
}
```

JSONB `keywords` 컬럼은 `hypersistence-utils`의 `@Type(JsonType.class)`로 처리했습니다.

```java
@Type(JsonType.class)
@Column(columnDefinition = "jsonb")
private List<String> keywords;
```

---

## 7. n8n 워크플로우 구성

`infra/n8n/workflows/daily-news-collection.json`에 워크플로우를 JSON으로 저장해뒀습니다. n8n Cloud에서 임포트하면 됩니다.

```
Schedule Trigger (22:00 UTC = 07:00 KST, 평일)
    ↓
POST /api/news/batch (ai-service)
    ↓
if success
    ├── true  → POST /api/notify/daily (카카오톡 발송)
    └── false → 오류 로그
```

---

## 8. 테스트 결과 요약

| 브랜치 | 테스트 | 결과 |
|--------|--------|------|
| `feature/week2-perplexity-api` | 8개 | ✅ 8/8 통과 |
| `feature/week2-claude-classify` | 11개 | ✅ 11/11 통과 |
| `feature/week2-redis-dedup` | 10개 | ✅ 10/10 통과 |

---

## 마무리

Week 2에서 가장 인상적이었던 건 **스켈레톤 코드 리뷰의 중요성**이었습니다. 그냥 넘어갔다면 프로덕션에서 마크다운 코드블록 하나 때문에 서비스가 죽을 뻔했습니다.

다음 편(#4)에서는 **GitHub Actions CI 구축 삽질기** — gradle-wrapper, Flyway 버전, 멀티모듈 빌드 이슈를 다룹니다.

---

*GitHub: https://github.com/mygithub05253/finance-bot-project*
