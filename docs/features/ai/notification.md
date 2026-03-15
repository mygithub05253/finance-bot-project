# F-AI-02: 카카오톡 알림 발송

---

## 메타
| 항목 | 내용 |
|------|------|
| **기능 ID** | F-AI-02 |
| **버전** | v1.1 |
| **작성일** | 2026-03-15 |
| **상태** | 설계 완료 / 구현 Week 3 예정 |
| **우선순위** | Must Have (M4) |

---

## 개요

자동 수집 파이프라인 완료 후 카카오톡 개인 메시지로 뉴스 요약을 발송한다.
발송 시각 목표: **07:30 KST 이전**. 발송 이력은 api-server에 기록한다.

---

## 발송 타이밍

```
07:00 KST  n8n 스케줄 시작 (자동 수집)
  ↓  약 5-10분 소요 (종목 수에 따라)
07:10 KST  /ai/v1/internal/batch 완료
  ↓  메시지 생성 및 카카오톡 발송
07:10-07:20 KST  카카오톡 수신 (목표: 07:30 이전)
```

---

## 카카오톡 메시지 포맷

### 기본 포맷 (텍스트 메시지)
```
📰 [2026-03-15] 오늘의 금융 뉴스

📊 삼성전자 (005930)  🟢 실적
HBM3E 양산 본격화로 2분기 실적 개선 기대.
엔비디아 공급 확대 예정.
🔗 https://news.example.com/article/123

📊 SK하이닉스 (000660)  🟢 실적
AI 서버 수요 증가로 D램 가격 상승 전망.
🔗 https://news.example.com/article/456

─────────────────────
자동 5건 | 수동 2건
🌐 https://finance-news-bot.vercel.app
```

### 감성 이모지 매핑
| sentiment | 이모지 |
|-----------|--------|
| POSITIVE | 🟢 |
| NEUTRAL | 🟡 |
| NEGATIVE | 🔴 |

### 메시지 제한 처리
- 카카오톡 텍스트 메시지 최대 길이: 1,000자
- 종목이 많을 경우 요약 길이 자동 단축 (종목당 최대 150자)
- 10건 초과 시 상위 10건만 발송 + "외 N건" 표기

---

## 카카오톡 REST API 연동

**파일**: `ai-service/src/services/kakao.service.js`

### 나에게 보내기 API
```
POST https://kapi.kakao.com/v2/api/talk/memo/default/send
Authorization: Bearer {KAKAO_ACCESS_TOKEN}
Content-Type: application/x-www-form-urlencoded

template_object={
  "object_type": "text",
  "text": "메시지 내용",
  "link": {
    "web_url": "https://finance-news-bot.vercel.app",
    "mobile_web_url": "https://finance-news-bot.vercel.app"
  }
}
```

> **주의**: 카카오 개발자 앱에서 "나에게 보내기" 권한 활성화 필요.
> 토큰 갱신: `KAKAO_REFRESH_TOKEN`으로 자동 갱신 로직 구현 필요 (access_token 유효기간 6시간).

### 토큰 관리 전략

```javascript
// kakao.service.js

// access_token 만료 시 자동 갱신
async function refreshAccessToken() {
  const response = await axios.post('https://kauth.kakao.com/oauth/token', {
    grant_type: 'refresh_token',
    client_id: process.env.KAKAO_REST_API_KEY,
    refresh_token: process.env.KAKAO_REFRESH_TOKEN,
  });
  // 새 access_token을 환경변수 또는 Redis에 저장
  return response.data.access_token;
}
```

---

## 발송 이력 저장 (api-server)

발송 성공/실패 후 api-server의 `notification_log` 테이블에 기록.

```javascript
// 발송 완료 후 api-server에 이력 저장
await axios.post(`${API_SERVER_URL}/api/v1/internal/notifications`, {
  status: 'SUCCESS',
  messagePreview: message.substring(0, 500),
  sentAt: new Date().toISOString(),
}, {
  headers: { 'X-Internal-Secret': process.env.INTERNAL_API_SECRET }
});
```

---

## 오류 처리 전략

| 상황 | 처리 방법 |
|------|---------|
| 카카오 access_token 만료 | refresh_token으로 자동 갱신 후 재발송 |
| 카카오 API 오류 (5xx) | 30초 후 1회 재시도 |
| 재시도 실패 | 실패 이력 저장 + 다음 날 자동 수집은 정상 진행 |
| 뉴스 0건 수집 | 발송 스킵 (빈 메시지 발송 금지) |

---

## 카카오 앱 초기 설정 절차

1. [카카오 개발자 콘솔](https://developers.kakao.com) → 앱 생성
2. REST API 키 발급 → `KAKAO_REST_API_KEY` 환경변수 등록
3. 카카오 로그인 → Authorization Code 발급
4. `https://kauth.kakao.com/oauth/token`으로 access_token + refresh_token 발급
5. `refresh_token` → `KAKAO_REFRESH_TOKEN` 환경변수 등록
6. 카카오 앱 설정 → "카카오톡 메시지" 권한 활성화 신청

---

## 수락 기준 (Acceptance Criteria)

- [ ] 평일 07:30 KST 이전에 카카오톡 메시지가 수신된다. (95% 이상)
- [ ] 수집된 뉴스가 0건인 날에는 메시지가 발송되지 않는다.
- [ ] 메시지에 종목명, 카테고리, 요약, 원문 링크가 포함된다.
- [ ] 발송 성공/실패 이력이 api-server에 기록된다.
- [ ] access_token 만료 시 자동 갱신 후 재발송된다.
- [ ] 카카오 API 오류 시 1회 재시도가 수행된다.
