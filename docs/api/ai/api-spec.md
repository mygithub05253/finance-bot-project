# Node.js ai-service API 명세

---

## 메타
| 항목 | 내용 |
|------|------|
| **버전** | v1.1 |
| **작성일** | 2026-03-15 |
| **상태** | 스켈레톤 구현 완료 (Week 1) / 핵심 기능 Week 2 예정 |
| **Base URL** | `/ai/v1` |
| **서비스** | Node.js Express (ai-service) |
| **포트** | 3000 (로컬) |

### 변경 이력
| 버전 | 날짜 | 내용 |
|------|------|------|
| v1.0 | 2026-03-15 | 초안 작성 |
| v1.1 | 2026-03-15 | Week 1: Express 서버 구조, 라우팅, 내부 인증 미들웨어 구현 완료 |

---

## 공통 응답 형식

### 성공 응답
```json
{
  "success": true,
  "data": { },
  "timestamp": "2026-03-15T07:00:00+09:00"
}
```

### 에러 응답
```json
{
  "success": false,
  "error": {
    "code": "CRAWL_FAILED",
    "message": "페이지를 크롤링할 수 없습니다."
  },
  "timestamp": "2026-03-15T07:00:00+09:00"
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

### POST /ai/v1/news/register

사용자가 URL을 입력하면 크롤링 → Claude 분류/요약 → api-server 저장까지 처리.

**목표 응답 시간: 3초 이내**

```
POST /ai/v1/news/register
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
  → Spring Boot api-server에 저장 (POST /api/v1/internal/news)
  → Redis 키 등록 (TTL 7일)
  → 결과 반환
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "articleId": 42,
    "title": "삼성전자 HBM3E 양산 본격화",
    "url": "https://news.example.com/article/123",
    "stockId": 1,
    "stockName": "삼성전자",
    "ticker": "005930",
    "summary": "HBM3E 양산 본격화로 2분기 실적 개선 기대. 엔비디아 공급 확대 예정.",
    "category": "실적",
    "sentiment": "POSITIVE",
    "keywords": ["HBM3E", "반도체", "엔비디아"],
    "processedAt": "2026-03-15T10:30:00+09:00"
  }
}
```

**Error 409 - 중복 URL:**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_URL",
    "message": "이미 등록된 URL입니다.",
    "registeredAt": "2026-03-14T09:00:00+09:00"
  }
}
```

**Error 422 - 크롤링 실패:**
```json
{
  "success": false,
  "error": {
    "code": "CRAWL_FAILED",
    "message": "페이지에 접근할 수 없습니다. (로그인 필요 또는 봇 차단)"
  }
}
```

---

## 내부 배치 처리 (n8n 전용)

### POST /ai/v1/internal/batch

n8n 스케줄러가 매일 07:00 KST에 Perplexity 수집 결과를 전달하면 일괄 처리.

```
POST /ai/v1/internal/batch
X-Internal-Secret: {INTERNAL_API_SECRET}
Content-Type: application/json
```

**Request:**
```json
{
  "date": "2026-03-15",
  "articles": [
    {
      "stockId": 1,
      "ticker": "005930",
      "title": "삼성전자 HBM3E 양산 본격화",
      "url": "https://news.example.com/article/123",
      "content": "삼성전자가 HBM3E 양산을 본격화하며...",
      "publishedAt": "2026-03-15T06:00:00+09:00"
    }
  ]
}
```

**처리 흐름:**
```
각 article에 대해:
  → Redis 중복 확인 (news:auto:{stockId}:{date})
  → 중복이면 스킵
  → Claude API: 요약 + 카테고리 + 감성 분석
  → api-server 저장
  → Redis 키 등록 (TTL 24시간)

모든 처리 완료 후 → 카카오톡 메시지 발송
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "date": "2026-03-15",
    "totalReceived": 10,
    "savedCount": 8,
    "skippedCount": 2,
    "kakaoSent": true,
    "processedAt": "2026-03-15T07:08:00+09:00"
  }
}
```

---

## 헬스 체크

### GET /ai/v1/health

Railway 및 n8n에서 서비스 상태 확인용.

**Response 200:**
```json
{
  "status": "ok",
  "service": "ai-service",
  "version": "1.0.0",
  "timestamp": "2026-03-15T07:00:00+09:00",
  "dependencies": {
    "apiServer": "ok",
    "redis": "ok"
  }
}
```
