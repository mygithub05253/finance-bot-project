# 스케줄러 설정 가이드 (GitHub Actions — n8n 무료 대체)

## 개요

매일 07:00 KST에 뉴스를 자동 수집하고 카카오톡으로 발송하는 스케줄러 설정 가이드입니다.

> **n8n Cloud 안내**: n8n Cloud는 14일 무료 체험 후 유료($20/월~)입니다.
> 이 가이드는 **GitHub Actions Cron**을 사용하는 무료 대체 방법을 설명합니다.
> 이미 사용 중인 GitHub Actions와 통합되어 별도 서비스 없이 운영 가능합니다.

---

## 방법 A: GitHub Actions Cron (권장 — 무료)

### 동작 방식

```
[GitHub Actions Cron: 22:00 UTC = 07:00 KST]
    ↓
[POST /api/news/batch]      Perplexity로 종목별 뉴스 자동 수집
    ↓
[POST /api/notify/daily]    카카오톡 나에게 보내기
```

워크플로우 파일은 이미 생성되어 있습니다: `.github/workflows/daily-scheduler.yml`

### 1단계: GitHub Secrets 설정

GitHub 레포지토리 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret 이름 | 값 | 설명 |
|-------------|-----|------|
| `AI_SERVICE_URL` | `https://ai-service-xxx.up.railway.app` | Railway ai-service 도메인 |
| `INTERNAL_API_SECRET` | `<32바이트 랜덤>` | Railway ai-service 환경변수와 동일 |

### 2단계: 스케줄러 활성화 확인

GitHub 레포지토리 → **Actions** 탭 → **일일 뉴스 수집 스케줄러** 워크플로우 확인

> GitHub Actions는 fork된 레포지토리에서는 스케줄이 비활성화됩니다.
> 자신의 레포지토리인 경우 자동으로 활성화됩니다.

### 3단계: 수동 테스트 실행

배포 직후 정상 동작 확인:

1. GitHub → **Actions** → **일일 뉴스 수집 스케줄러**
2. **Run workflow** → **Run workflow** 클릭
3. 실행 결과 확인:
   - ✅ 각 Step 녹색 체크 확인
   - 카카오톡 앱에서 메시지 수신 확인

### 4단계: 실행 로그 확인

Actions → 해당 실행 → 각 Step 클릭:
```
▶ 뉴스 배치 수집 시작...
HTTP 상태: 200
응답: {"success":true,"saved":8,"skipped":2}
✅ 뉴스 배치 수집 완료
▶ 카카오톡 발송 시작...
HTTP 상태: 200
응답: {"success":true,"sent":8}
✅ 카카오톡 발송 완료
```

---

## 카카오 액세스 토큰 발급

ai-service의 `KAKAO_ACCESS_TOKEN` 환경변수에 설정할 토큰을 발급합니다.

### 1단계: 카카오 개발자 콘솔 설정

1. [카카오 개발자 콘솔](https://developers.kakao.com) → **내 애플리케이션** → 앱 선택
2. **카카오 로그인** → 활성화: **ON**
3. **Redirect URI** 추가: `http://localhost`

### 2단계: 인가 코드 발급

아래 URL을 **브라우저 주소창**에 직접 입력:

```
https://kauth.kakao.com/oauth/authorize?client_id={REST_API_KEY}&redirect_uri=http://localhost&response_type=code&scope=talk_message
```

- `{REST_API_KEY}` → 카카오 개발자 콘솔 → **앱 키** → **REST API 키**
- 카카오 로그인 후 `http://localhost/?code=XXXXXX` 로 리다이렉트됨
- URL에서 `code=` 뒤의 값 복사

### 3단계: 액세스 토큰 발급

```bash
curl -X POST https://kauth.kakao.com/oauth/token \
  -d "grant_type=authorization_code" \
  -d "client_id={REST_API_KEY}" \
  -d "redirect_uri=http://localhost" \
  -d "code={2단계에서_복사한_code}"
```

응답 예시:
```json
{
  "access_token": "xxxxxxxxxxxxxxxxxxxxxx",
  "refresh_token": "yyyyyyyyyyyyyyyyyyyyyy",
  "expires_in": 21599,
  "refresh_token_expires_in": 5183999
}
```

- `access_token` → Railway ai-service `KAKAO_ACCESS_TOKEN` 환경변수에 설정
- `refresh_token` → 별도 보관 (갱신 시 사용, 유효기간 60일)

### 4단계: 토큰 갱신 (만료 시)

액세스 토큰은 **6시간**마다 만료됩니다. 만료 시 아래 명령어로 갱신:

```bash
curl -X POST https://kauth.kakao.com/oauth/token \
  -d "grant_type=refresh_token" \
  -d "client_id={REST_API_KEY}" \
  -d "refresh_token={저장한_refresh_token}"
```

응답의 새 `access_token`을 Railway ai-service 환경변수에 업데이트.

> **실용 팁**: GitHub Actions가 매일 실행되므로 토큰 만료 여부를 Actions 로그로 확인 가능합니다.
> 실패 시 GitHub에서 이메일 알림이 자동 발송됩니다.

---

## 방법 B: n8n Self-hosted (Railway에서 무료 실행)

n8n의 GUI 워크플로우 방식이 필요하다면 Railway에 n8n을 직접 배포할 수 있습니다.

### 설정 방법

1. Railway 프로젝트 → **+ Add Service** → **Docker Image**
2. Image: `n8nio/n8n`
3. 환경변수:
   ```
   N8N_BASIC_AUTH_ACTIVE=true
   N8N_BASIC_AUTH_USER=admin
   N8N_BASIC_AUTH_PASSWORD=<비밀번호>
   N8N_HOST=<Railway 자동 생성 도메인>
   ```
4. 기존 `infra/n8n/workflows/daily-news-collection.json` 임포트

> **비용**: Railway 월 크레딧 내 포함 (소규모 사용 시 추가 비용 없음)

---

## 트러블슈팅

### GitHub Actions 스케줄이 실행되지 않음

- 레포지토리가 60일 이상 비활성화되면 스케줄이 자동 중지됨
- Actions 탭에서 **Enable workflow** 클릭으로 재활성화

### 배치 수집 실패 (HTTP 401)

- `INTERNAL_API_SECRET` Secret이 Railway ai-service 환경변수와 일치하는지 확인

### 카카오톡 발송 실패 (HTTP 401)

- `KAKAO_ACCESS_TOKEN` 만료 → 위 토큰 갱신 절차 진행
- Railway ai-service `KAKAO_ACCESS_TOKEN` 환경변수 업데이트 후 재배포

### 뉴스 수집 0건

- Railway ai-service 로그 확인 (Dashboard → ai-service → Logs)
- `PERPLEXITY_API_KEY` 유효성 확인
