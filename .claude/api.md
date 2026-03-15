# API 설계 컨벤션

## Base URL
- **Spring Boot api-server**: `/api/v1`
- **Node.js ai-service**: `/ai/v1`

## 공통 응답 형식 (ApiResponse<T>)
```json
{
  "success": true,
  "data": { ... },
  "message": null,
  "timestamp": "2026-03-15T07:00:00+09:00"
}
```

에러 응답:
```json
{
  "success": false,
  "data": null,
  "message": "종목을 찾을 수 없습니다.",
  "timestamp": "2026-03-15T07:00:00+09:00"
}
```

---

## Spring Boot api-server

### 종목 관리
```
GET    /api/v1/stocks                # 전체 목록 (is_active=true)
POST   /api/v1/stocks                # 종목 등록
PUT    /api/v1/stocks/{id}           # 종목 수정
DELETE /api/v1/stocks/{id}           # 소프트 삭제 (is_active=false)
```

### 뉴스 아카이브
```
GET  /api/v1/news                    # 목록 조회 (날짜/종목/카테고리 필터)
GET  /api/v1/news/{id}               # 상세 조회

쿼리 파라미터:
  ?stockId=1&date=2026-03-15&category=실적&page=0&size=20
```

### 발송 이력
```
GET  /api/v1/notifications           # 발송 이력 목록
GET  /api/v1/notifications/stats     # 기간별 통계
```

---

## Node.js ai-service

### 뉴스 등록 (수동)
```
POST /ai/v1/news/register

Request:
{
  "url": "https://news.example.com/article/123"
}

Response:
{
  "success": true,
  "data": {
    "articleId": 42,
    "title": "삼성전자 HBM3E 양산 본격화",
    "ticker": "005930",
    "summary": "...",
    "category": "실적",
    "sentiment": "POSITIVE"
  }
}
```

### 배치 처리 (n8n 내부 호출)
```
POST /ai/v1/internal/batch

Request:
{
  "date": "2026-03-15",
  "articles": [
    {
      "title": "...",
      "url": "...",
      "content": "...",
      "ticker": "005930"
    }
  ]
}

헤더: X-Internal-Secret: {INTERNAL_API_SECRET}
```

### 헬스 체크
```
GET /ai/v1/health
→ { "status": "ok", "timestamp": "..." }
```

---

## DTO 패턴 (Spring Boot)

```java
// 요청 DTO
public record StockCreateRequest(
  @NotBlank String ticker,
  @NotBlank String name,
  String sector,
  String exchange
) {}

// 응답 DTO
public record StockResponse(
  Long id,
  String ticker,
  String name,
  String sector,
  String exchange,
  boolean isActive
) {}
```

---

## HTTP 상태 코드 규칙
| 상황 | 코드 |
|------|------|
| 조회 성공 | 200 OK |
| 생성 성공 | 201 Created |
| 처리 완료 (응답 없음) | 204 No Content |
| 잘못된 요청 | 400 Bad Request |
| 인증 실패 | 401 Unauthorized |
| 권한 없음 | 403 Forbidden |
| 리소스 없음 | 404 Not Found |
| 중복 오류 | 409 Conflict |
| 서버 오류 | 500 Internal Server Error |

---

## 서비스 간 통신 (내부 API)
- **헤더**: `X-Internal-Secret: {INTERNAL_API_SECRET}`
- **Spring Boot → Node.js**: WebClient 사용
- **n8n → api-server / ai-service**: HTTP Request 노드 + Secret 헤더
- 시크릿 미일치 시 `403 Forbidden` 반환
