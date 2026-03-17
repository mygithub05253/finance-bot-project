# Node.js ai-service API 명세

---

## 메타
| 항목 | 내용 |
|------|------|
| **버전** | v1.2 |
| **작성일** | 2026-03-17 |
| **상태** | Week 3 완료 — 카카오톡 알림 포함 전체 엔드포인트 구현 완료 |
| **Base URL** | `/api` |
| **서비스** | Node.js Express (ai-service) |
| **포트** | 3001 (로컬) |

### 변경 이력
| 버전 | 날짜 | 내용 |
|------|------|------|
| v1.0 | 2026-03-15 | 초안 작성 |
| v1.1 | 2026-03-15 | Week 1: Express 서버 구조, 라우팅, 내부 인증 미들웨어 구현 완료 |
| v1.2 | 2026-03-17 | Week 3: 카카오톡 알림 API 추가, Base URL `/ai/v1` → `/api`로 수정, memo API URL 버그 수정 |

---

## 공통 응답 형식

### 성공 응답
```json
{
  "success": true,
  "data": { }
}
```

### 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "CRAWL_FAILED",
    "message": "페이지를 크롤링할 수 없습니다."
  }
}
```

### 에러 코드 목록
| 코드 | HTTP | 설명 |
|------|------|------|
| CRAWL_FAILED | 422 | URL 크롤링 실패 (접근 불가, 타임아웃) |
| DUPLICATE_URL | 409 | 이미 등록된 URL (Redis 캐시 히트) |
| CLASSIFY_FAILED | 500 | Claude API 분류 오류 |
| INVALID_URL | 400 | 유효하지 않은 URL 형식 |
| INTERNAL_AUTH_FAILED | 403 | X-Internal-Secret 불일치 |

---

## 수동 뉴스 등록

### POST /api/news/register

사용자가 URL을 입력하면 크롤링 → Claude 분류/요약 → api-server 저장까지 처리.

**목표 응답 시간: 3초 이내**

```
POST /api/news/register
Content-Type: application/json
```

**Request:**
```json
{
  "url": "https://news.example.com/article/123"
}
```

**처리 흐름:**
```
URL 수신
  → Redis 중복 확인 (news:manual:{urlHash})
  → 중복이면 DUPLICATE_URL 409 반환
  → axios + cheerio 크롤링 (title, content, publishedAt)
  → Claude API 호출:
      - 관련 종목 매핑 (stock 목록 참조)
      - 카테고리 분류 (실적/규제/M&A/인사/기타)
      - 3-5줄 한국어 요약
      - 감성 분석 (POSITIVE/NEUTRAL/NEGATIVE)
  → Spring Boot api-server에 저장 (POST /api/v1/news + X-Internal-Secret)
  → Redis 키 등록 (TTL 7일)
  → 결과 반환
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "title": "삼성전자 HBM3E 양산 본격화",
    "url": "https://news.example.com/article/123",
    "sourceType": "MANUAL",
    "stockId": 1,
    "stockName": "삼성전자",
    "stockTicker": "005930",
    "summary": "HBM3E 양산 본격화로 2분기 실적 개선 기대.",
    "category": "실적",
    "sentiment": "POSITIVE",
    "keywords": ["HBM3E", "반도체", "엔비디아"]
  }
}
```

---

## 내부 배치 처리 (n8n 전용)

### POST /api/news/batch

n8n 스케줄러가 매일 07:00 KST에 Perplexity 수집 결과를 전달하면 일괄 처리.

```
POST /api/news/batch
X-Internal-Secret: {INTERNAL_API_SECRET}
Content-Type: application/json
```

**Request:**
```json
{
  "date": "2026-03-17",
  "articles": [
    {
      "stockId": 1,
      "ticker": "005930",
      "title": "삼성전자 HBM3E 양산 본격화",
      "url": "https://news.example.com/article/123",
      "content": "삼성전자가 HBM3E 양산을 본격화하며...",
      "publishedAt": "2026-03-17T06:00:00+09:00"
    }
  ]
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "date": "2026-03-17",
    "totalReceived": 10,
    "savedCount": 8,
    "skippedCount": 2,
    "kakaoSent": true,
    "processedAt": "2026-03-17T07:08:00+09:00"
  }
}
```

---

## 카카오톡 일일 알림

### POST /api/notify/daily

n8n 스케줄러가 배치 처리 완료 후 카카오톡 알림 발송을 요청.

```
POST /api/notify/daily
X-Internal-Secret: {INTERNAL_API_SECRET}
Content-Type: application/json
```

**Request:**
```json
{
  "accessToken": "kakao_access_token_here",
  "date": "2026-03-17",
  "newsItems": [
    {
      "ticker": "005930",
      "name": "삼성전자",
      "summary": "HBM3E 양산 본격화로 2분기 실적 개선 기대.",
      "url": "https://news.example.com/article/123"
    }
  ],
  "autoCount": 5,
  "manualCount": 2
}
```

**처리 흐름:**
```
accessToken, date, newsItems 검증
  → formatDailyMessage() 메시지 포맷팅 (80자 제한, 이모지 포함)
  → POST https://kapi.kakao.com/v2/api/talk/memo/default/send
  → 성공 시 { success: true, message: "카카오톡 발송 완료 (7건)" } 반환
```

**메시지 형식:**
```
📰 [2026-03-17] 오늘의 금융 뉴스

📊 삼성전자 (005930)
  HBM3E 양산 본격화로 2분기 실적 개선 기대.
  출처: https://news.example.com/...
─────────────────
자동 5건 | 수동 2건
```

**Response 200:**
```json
{
  "success": true,
  "message": "카카오톡 발송 완료 (7건)"
}
```

**참고:**
- 카카오 액세스 토큰은 n8n이 요청 시 직접 전달
- `나에게 보내기` API 사용 (`/v2/api/talk/memo/default/send`)
- 1,000자 제한: 종목별 요약 80자 자동 截断

---

## 헬스 체크

### GET /api/health

Railway 및 n8n에서 서비스 상태 확인용.

**Response 200:**
```json
{
  "status": "ok",
  "service": "ai-service",
  "version": "1.0.0"
}
```
