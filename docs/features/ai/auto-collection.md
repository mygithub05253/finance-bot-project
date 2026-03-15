# F-AI-01: 자동 뉴스 수집 파이프라인

---

## 메타
| 항목 | 내용 |
|------|------|
| **기능 ID** | F-AI-01 |
| **버전** | v1.0 |
| **작성일** | 2026-03-15 |
| **상태** | 초안 |
| **우선순위** | Must Have (M2, M5) |

---

## 개요

n8n 스케줄러가 매일 07:00 KST에 실행되어 Perplexity API로 관심 종목별 최신 뉴스를 수집하고, ai-service를 통해 분류/요약 후 api-server에 저장한다. Redis로 중복 수집을 방지한다.

---

## 파이프라인 흐름 (n8n 워크플로우)

```
[Schedule Trigger]
  Cron: 0 22 * * 1-5 (UTC) = 07:00 KST 평일

  ↓

[HTTP Request: GET /api/v1/stocks]
  api-server에서 is_active=true 종목 목록 조회
  결과: [{id, ticker, name}, ...]

  ↓

[Loop Over Items: 종목별 반복]
  각 종목(ticker)에 대해:

  ↓

[HTTP Request: POST Perplexity API]
  프롬프트: "{name}({ticker}) 관련 오늘의 최신 금융 뉴스를 알려줘.
             각 뉴스의 제목, URL, 핵심 내용을 JSON 배열로 응답해줘."
  모델: llama-3.1-sonar-small-128k-online (실시간 검색)

  ↓

[Code Node: 응답 파싱]
  Perplexity 응답 → [{title, url, content}] 배열 추출

  ↓

[Loop 종료 후 결과 합산]

  ↓

[HTTP Request: POST /ai/v1/internal/batch]
  모든 종목의 수집 결과를 ai-service에 일괄 전달
  헤더: X-Internal-Secret

  ↓

[IF: 성공 여부 확인]
  성공 → [완료 로그 기록]
  실패 → [Error 노드: 오류 기록 + 재시도 없음 (다음 날 재실행)]
```

---

## Perplexity API 연동 (ai-service)

**파일**: `ai-service/src/services/perplexity.service.js`

```javascript
// 종목별 뉴스 검색 프롬프트
const buildPrompt = (ticker, name) => `
  ${name}(${ticker}) 관련 오늘 주요 금융 뉴스를 최대 3건 알려줘.
  각 뉴스에 대해 다음 JSON 배열 형식으로만 응답해줘:
  [
    {
      "title": "뉴스 제목",
      "url": "출처 URL",
      "content": "핵심 내용 2-3문장"
    }
  ]
`;
```

**모델 선택 기준:**
| 모델 | 특징 | 용도 |
|------|------|------|
| `llama-3.1-sonar-small-128k-online` | 빠른 응답, 실시간 검색 | 뉴스 수집 (기본) |
| `llama-3.1-sonar-large-128k-online` | 더 정확, 느림 | 중요 종목 심층 분석 시 |

---

## Redis 중복 방지

### 캐시 키 구조
```
news:auto:{stockId}:{YYYY-MM-DD}
예시: news:auto:1:2026-03-15
```

### 처리 로직
```javascript
// ai-service/src/services/news.service.js

const redisKey = `news:auto:${stockId}:${date}`;
const exists = await redis.get(redisKey);

if (exists) {
  // 이미 오늘 해당 종목 뉴스 수집됨 → 스킵
  return { skipped: true };
}

// ... 뉴스 수집 및 저장 처리 ...

// 성공 시 Redis 키 등록 (TTL 24시간)
await redis.setex(redisKey, 86400, JSON.stringify({ count: savedCount }));
```

### URL 레벨 중복 방지 (추가 안전장치)
```
news:auto:url:{sha256(url).substring(0, 16)}
TTL: 7일
```
동일 URL이 다른 종목에서 수집되더라도 중복 저장 방지.

---

## ai-service 배치 처리 (`/ai/v1/internal/batch`)

n8n으로부터 받은 기사 배열을 순차 처리:

```
각 article에 대해:
  1. Redis URL 중복 확인
  2. Claude API 호출:
     - 요약 생성 (3-5줄)
     - 카테고리 분류
     - 감성 분석
     - 키워드 추출
  3. POST /api/v1/internal/news (api-server 저장)
  4. Redis 키 등록

모든 처리 완료 → 카카오톡 메시지 발송 트리거
```

---

## 오류 처리 전략

| 상황 | 처리 방법 |
|------|---------|
| Perplexity API 타임아웃 | 10초 타임아웃, 다음 종목으로 스킵 |
| 빈 응답 (뉴스 없음) | 해당 종목 스킵, 로그 기록 |
| Claude API 실패 | 요약 없이 title + content만 저장 (summary = null) |
| api-server 저장 실패 | 로그 기록, 카카오톡 발송은 정상 진행 |
| Redis 연결 실패 | 중복 확인 스킵하고 저장 진행 (idempotency 보장) |

---

## n8n 워크플로우 파일

**위치**: `infra/n8n/workflows/daily-news-collection.json`

---

## 수락 기준 (Acceptance Criteria)

- [ ] 평일 07:00 KST에 자동 실행된다.
- [ ] is_active=true인 모든 종목에 대해 뉴스를 수집한다.
- [ ] 동일 종목+날짜 조합은 중복 수집되지 않는다. (Redis TTL 24h)
- [ ] 동일 URL은 어떤 종목에서도 중복 저장되지 않는다.
- [ ] 일부 종목 수집 실패 시 나머지 종목은 정상 처리된다.
- [ ] 전체 파이프라인 실행 시간이 10분을 초과하지 않는다.
- [ ] 처리 결과(저장 건수, 스킵 건수)가 로그에 기록된다.
