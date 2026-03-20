# n8n Cloud 설정 가이드

## 개요

n8n Cloud에서 매일 07:00 KST에 금융 뉴스를 자동 수집하고 카카오톡으로 발송하는 워크플로우를 설정합니다.

---

## 1. n8n Cloud 가입

1. [n8n Cloud](https://app.n8n.cloud) → **Free Trial** 또는 **Starter Plan** 가입
2. 워크스페이스 생성

---

## 2. Credentials (자격증명) 설정

### 2-1. Internal API Secret (X-Internal-Secret 헤더)

1. n8n → **Credentials** → **Add Credential**
2. **HTTP Header Auth** 선택
3. 설정:
   - Name: `Internal API Secret`
   - Header Name: `X-Internal-Secret`
   - Header Value: Railway 환경변수의 `INTERNAL_API_SECRET` 값

### 2-2. 카카오 OAuth2 액세스 토큰

카카오 액세스 토큰(유효기간 6시간)은 n8n 변수로 관리합니다.

**초기 액세스 토큰 발급**:
1. [카카오 개발자 콘솔](https://developers.kakao.com) → 내 애플리케이션
2. **카카오 로그인** → **redirect URI** 설정 (예: `http://localhost`)
3. 아래 URL을 브라우저에서 열기:
   ```
   https://kauth.kakao.com/oauth/authorize?client_id={REST_API_KEY}&redirect_uri=http://localhost&response_type=code&scope=talk_message
   ```
4. 리다이렉트된 URL에서 `code` 파라미터 추출
5. 액세스 토큰 발급:
   ```bash
   curl -X POST https://kauth.kakao.com/oauth/token \
     -d "grant_type=authorization_code" \
     -d "client_id={REST_API_KEY}" \
     -d "redirect_uri=http://localhost" \
     -d "code={발급받은_code}"
   ```
6. 응답에서 `access_token`, `refresh_token` 저장

---

## 3. n8n 변수(Variables) 설정

n8n → **Settings** → **Variables**:

| 변수명 | 값 |
|--------|-----|
| `API_SERVER_URL` | `https://api-server-<id>.up.railway.app` |
| `AI_SERVICE_URL` | `https://ai-service-<id>.up.railway.app` |
| `KAKAO_ACCESS_TOKEN` | 카카오 액세스 토큰 (주기적 갱신 필요) |
| `KAKAO_REFRESH_TOKEN` | 카카오 리프레시 토큰 (유효기간 60일) |

---

## 4. 워크플로우 임포트

1. n8n → **Workflows** → **Import from File**
2. `infra/n8n/workflows/daily-news-collection.json` 업로드
3. 임포트 후 각 HTTP Request 노드의 **Credentials**에서 `Internal API Secret` 연결 확인

---

## 5. 워크플로우 구조

```
[스케줄 트리거]         매일 22:00 UTC (= 07:00 KST)
       ↓
[뉴스 배치 수집]        POST /api/news/batch (Perplexity 자동 수집)
       ↓
[오늘 뉴스 조회]        GET /api/v1/news?fromDate=오늘
       ↓
[데이터 포맷팅]         newsItems 배열 생성, 날짜/건수 계산
       ↓
[뉴스 있음?]           총 건수 > 0 분기
    ↙        ↘
[카카오 발송]    [건너뜀]
POST /api/notify/daily
```

---

## 6. 카카오 액세스 토큰 갱신 전략

카카오 액세스 토큰은 **6시간**마다 만료됩니다.

### 방법 A: 수동 갱신 (단순, 매월 작업)

카카오 리프레시 토큰으로 새 액세스 토큰 발급 후 n8n 변수 수동 업데이트:

```bash
curl -X POST https://kauth.kakao.com/oauth/token \
  -d "grant_type=refresh_token" \
  -d "client_id={REST_API_KEY}" \
  -d "refresh_token={KAKAO_REFRESH_TOKEN}"
```

응답의 `access_token`을 n8n Variables의 `KAKAO_ACCESS_TOKEN`에 업데이트.

> 카카오 리프레시 토큰 유효기간: **60일** (활성 사용 시 자동 연장)

### 방법 B: n8n 자동 갱신 워크플로우 (권장)

별도 "token-refresh" 워크플로우를 매 5시간마다 실행:

1. `POST https://kauth.kakao.com/oauth/token` 호출 (refresh_token 사용)
2. 응답에서 새 `access_token` 추출
3. n8n Variables `KAKAO_ACCESS_TOKEN` 업데이트 (n8n API 활용)

---

## 7. 수동 테스트

워크플로우 임포트 후 스케줄 전에 수동 실행으로 검증:

1. n8n 워크플로우 열기 → **Test Workflow** 클릭
2. 각 노드 실행 결과 확인:
   - 배치 수집: `{"success":true,"saved":N}` 응답 확인
   - 뉴스 조회: `content` 배열에 오늘 뉴스 확인
   - 카카오 발송: 실제 카카오톡 메시지 수신 확인

---

## 8. 실운영 스케줄 활성화

1. 워크플로우 → 상단 토글 **Inactive → Active** 전환
2. 첫 실행 예약 날짜/시간 확인 (다음 22:00 UTC)
3. 실행 후 **Executions** 탭에서 성공 여부 확인

---

## 9. 트러블슈팅

### 배치 수집 실패 (401 Unauthorized)
- `Internal API Secret` credential 값이 Railway `INTERNAL_API_SECRET`과 일치하는지 확인

### 카카오 발송 실패 (401: kakaoError[-401])
- 액세스 토큰 만료 → n8n Variables `KAKAO_ACCESS_TOKEN` 갱신 필요

### 카카오 발송 실패 (400: kakaoError[-2])
- 메시지 1,000자 초과 → 종목 수가 너무 많은 경우 발생
- `kakao.service.js`의 `MAX_SUMMARY_LEN`을 줄이거나 종목 수를 줄임

### 뉴스 없음 (autoCount: 0)
- Perplexity API 키 유효성 확인
- ai-service Railway 로그 확인 (`railway logs`)
