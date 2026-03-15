# Spring Boot api-server REST API 명세

---

## 메타
| 항목 | 내용 |
|------|------|
| **버전** | v1.0 |
| **작성일** | 2026-03-15 |
| **상태** | 초안 |
| **Base URL** | `/api/v1` |
| **서비스** | Spring Boot 3.x (api-server) |
| **포트** | 8080 (로컬) |

### 변경 이력
| 버전 | 날짜 | 내용 |
|------|------|------|
| v1.0 | 2026-03-15 | 초안 작성 |

---

## 공통 응답 형식

### 성공 응답
```json
{
  "success": true,
  "data": { },
  "message": null,
  "timestamp": "2026-03-15T07:00:00+09:00"
}
```

### 에러 응답
```json
{
  "success": false,
  "data": null,
  "message": "종목을 찾을 수 없습니다.",
  "timestamp": "2026-03-15T07:00:00+09:00"
}
```

### HTTP 상태 코드
| 코드 | 상황 |
|------|------|
| 200 | 조회/수정 성공 |
| 201 | 생성 성공 |
| 204 | 삭제 성공 (응답 바디 없음) |
| 400 | 잘못된 요청 (유효성 검증 실패) |
| 403 | 내부 시크릿 불일치 |
| 404 | 리소스 없음 |
| 409 | 중복 데이터 (ticker 중복 등) |
| 500 | 서버 내부 오류 |

---

## 종목 관리 (Stocks)

### 1. 종목 목록 조회
```
GET /api/v1/stocks
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ticker": "005930",
      "name": "삼성전자",
      "sector": "반도체",
      "exchange": "KOSPI",
      "isActive": true,
      "createdAt": "2026-03-15T00:00:00+09:00"
    }
  ]
}
```
> `isActive = true`인 종목만 반환. 소프트 삭제된 종목 제외.

---

### 2. 종목 등록
```
POST /api/v1/stocks
Content-Type: application/json
```

**Request:**
```json
{
  "ticker": "005930",
  "name": "삼성전자",
  "sector": "반도체",
  "exchange": "KOSPI"
}
```

**유효성 검증:**
| 필드 | 규칙 |
|------|------|
| ticker | NotBlank, 최대 20자 |
| name | NotBlank, 최대 100자 |
| sector | 선택, 최대 50자 |
| exchange | 선택, 최대 20자 (KOSPI/KOSDAQ/NASDAQ) |

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "ticker": "005930",
    "name": "삼성전자",
    "sector": "반도체",
    "exchange": "KOSPI",
    "isActive": true
  }
}
```

**Error 409 - 중복 ticker:**
```json
{
  "success": false,
  "data": null,
  "message": "이미 등록된 종목 코드입니다. ticker=005930"
}
```

---

### 3. 종목 수정
```
PUT /api/v1/stocks/{id}
Content-Type: application/json
```

**Request:**
```json
{
  "name": "삼성전자",
  "sector": "반도체/AI",
  "exchange": "KOSPI"
}
```
> ticker는 수정 불가 (변경 시 삭제 후 재등록)

**Response 200:** 수정된 종목 정보 반환 (종목 등록 응답 포맷 동일)

---

### 4. 종목 삭제 (소프트 삭제)
```
DELETE /api/v1/stocks/{id}
```

**Response 204:** 바디 없음

> `isActive = false` 처리. DB에서 실제 삭제하지 않음.

---

## 뉴스 아카이브 (News)

### 1. 뉴스 목록 조회
```
GET /api/v1/news
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| stockId | Long | 선택 | 종목 ID 필터 |
| date | String | 선택 | 날짜 필터 (yyyy-MM-dd) |
| category | String | 선택 | 카테고리 필터 (실적/규제/M&A/인사/기타) |
| sourceType | String | 선택 | AUTO / MANUAL |
| page | Int | 선택 | 페이지 번호 (기본값: 0) |
| size | Int | 선택 | 페이지 크기 (기본값: 20, 최대: 50) |

**예시:**
```
GET /api/v1/news?stockId=1&date=2026-03-15&category=실적&page=0&size=20
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 42,
        "title": "삼성전자 HBM3E 양산 본격화",
        "url": "https://news.example.com/article/123",
        "sourceType": "AUTO",
        "publishedAt": "2026-03-15T06:00:00+09:00",
        "summary": {
          "id": 10,
          "stockId": 1,
          "stockName": "삼성전자",
          "ticker": "005930",
          "summary": "HBM3E 양산 본격화로 2분기 실적 개선 기대.",
          "category": "실적",
          "sentiment": "POSITIVE",
          "keywords": ["HBM3E", "반도체", "실적"]
        }
      }
    ],
    "totalElements": 42,
    "totalPages": 3,
    "currentPage": 0,
    "size": 20
  }
}
```

---

### 2. 뉴스 상세 조회
```
GET /api/v1/news/{id}
```

**Response 200:** 뉴스 목록 단일 항목 포맷 동일

**Error 404:**
```json
{
  "success": false,
  "data": null,
  "message": "뉴스를 찾을 수 없습니다. id=42"
}
```

---

## 내부 API (Internal - ai-service 전용)

> 모든 내부 API는 `X-Internal-Secret` 헤더 필수. 불일치 시 403 반환.

### 1. 뉴스 저장 (ai-service → api-server)
```
POST /api/v1/internal/news
X-Internal-Secret: {INTERNAL_API_SECRET}
Content-Type: application/json
```

**Request:**
```json
{
  "title": "삼성전자 HBM3E 양산 본격화",
  "url": "https://news.example.com/article/123",
  "contentSnippet": "삼성전자가 HBM3E ...",
  "sourceType": "AUTO",
  "publishedAt": "2026-03-15T06:00:00+09:00",
  "summary": {
    "stockId": 1,
    "summary": "HBM3E 양산 본격화로 2분기 실적 개선 기대.",
    "category": "실적",
    "sentiment": "POSITIVE",
    "keywords": ["HBM3E", "반도체", "실적"]
  }
}
```

**Response 201:** 저장된 뉴스 ID 반환

---

## 발송 이력 (Notifications)

### 1. 발송 이력 목록
```
GET /api/v1/notifications
```

**Query Parameters:** `page`, `size`, `status` (SUCCESS/FAIL)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 5,
        "status": "SUCCESS",
        "messagePreview": "📰 [2026-03-15] 오늘의 금융 뉴스...",
        "sentAt": "2026-03-15T07:10:00+09:00"
      }
    ],
    "totalElements": 10
  }
}
```
