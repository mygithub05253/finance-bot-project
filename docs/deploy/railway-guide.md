# Railway 배포 가이드

## 개요

api-server(Spring Boot)와 ai-service(Node.js)를 Railway에 배포하는 단계별 가이드입니다.

> **모노레포 구조 주의**: 이 프로젝트는 모노레포입니다. Railway에서 각 서비스마다 **Root Directory**를 별도로 지정해야 합니다.

---

## 1. 사전 준비

- [Railway](https://railway.app) 계정 생성 (GitHub 로그인 권장)
- Supabase 프로덕션 DB 생성 완료 (`supabase-guide.md` 참고)

> **비용**: Railway는 무료 플랜이 없습니다. **Hobby Plan ($5/월)** 또는 **Trial** (단기 무료)로 시작합니다.
> Hobby Plan은 월 $5 크레딧을 제공하며, 소규모 서비스는 크레딧 내에서 운영 가능합니다.

---

## 2. Railway 프로젝트 생성

1. [Railway 대시보드](https://railway.app/dashboard) → **New Project**
2. **Empty Project** 선택 (서비스를 하나씩 추가할 것이므로)

---

## 3. Redis 서비스 추가

1. 프로젝트 내 **+ Add Service** → **Database** → **Redis**
2. 생성 완료 후 Redis 서비스 클릭 → **Connect** 탭 확인
3. `REDIS_URL` 값 메모 (예: `redis://default:password@host:port`)

> Railway Redis는 `REDIS_URL` 환경변수 하나로 연결합니다. `REDIS_HOST/PORT`를 별도로 사용하지 않습니다.

---

## 4. api-server 배포

### 4-1. 서비스 추가

1. **+ Add Service** → **GitHub Repo**
2. `finance-bot-project` 레포지토리 선택
3. **⚠️ 중요**: 서비스 생성 후 **Settings** → **Build** → **Root Directory** 를 `api-server` 로 변경
4. Dockerfile이 `api-server/Dockerfile`로 자동 감지됨

### 4-2. 서비스 이름 변경 (선택)

Railway 서비스 → **Settings** → **Service Name**: `api-server`

### 4-3. 환경변수 설정

Railway 서비스 → **Variables** 탭 → **+ Add Variable**:

```
SPRING_PROFILES_ACTIVE=prod
SUPABASE_PROJECT_REF=<supabase-dashboard에서 확인>
SUPABASE_DB_PASSWORD=<프로젝트 생성 시 설정한 DB 비밀번호>
REDIS_URL=<Redis 서비스 Connect 탭의 REDIS_URL>
INTERNAL_API_SECRET=<32바이트 랜덤 문자열>
CORS_ALLOWED_ORIGINS=https://<your-frontend>.vercel.app
```

> **INTERNAL_API_SECRET 생성**: 터미널에서 `openssl rand -hex 32`

> **SUPABASE_PROJECT_REF 확인**: Supabase 대시보드 URL `https://supabase.com/dashboard/project/{여기가-ref}`

### 4-4. application-prod.yml의 REDIS_URL 지원 확인

`REDIS_URL` 형식을 사용하려면 `application-prod.yml`에 아래 설정 확인:
```yaml
spring:
  data:
    redis:
      url: ${REDIS_URL:redis://localhost:6379}
```

> 현재 설정이 `REDIS_HOST/PORT` 방식이라면 `REDIS_URL` 방식으로 업데이트 필요.

### 4-5. 도메인 생성

**Settings** → **Networking** → **Generate Domain** → URL 메모
- 예: `https://api-server-production-xxxx.up.railway.app`

---

## 5. ai-service 배포

### 5-1. 서비스 추가

1. **+ Add Service** → **GitHub Repo** → 동일 레포지토리 선택
2. **Settings** → **Build** → **Root Directory**: `ai-service` 로 변경
3. `ai-service/Dockerfile` 자동 감지됨

### 5-2. 환경변수 설정

```
NODE_ENV=production
PORT=3001
PERPLEXITY_API_KEY=<perplexity.ai에서 발급>
CLAUDE_API_KEY=<console.anthropic.com에서 발급>
KAKAO_REST_API_KEY=<developers.kakao.com에서 확인>
KAKAO_ACCESS_TOKEN=<OAuth2 발급 절차는 n8n-cloud-guide.md 참고>
INTERNAL_API_SECRET=<api-server와 동일한 값>
API_SERVER_URL=https://<api-server-domain>.up.railway.app
CORS_ALLOWED_ORIGINS=https://<your-frontend>.vercel.app
FRONTEND_URL=https://<your-frontend>.vercel.app
REDIS_URL=<Redis 서비스와 동일한 REDIS_URL>
```

### 5-3. 도메인 생성

**Settings** → **Networking** → **Generate Domain**
- 예: `https://ai-service-production-xxxx.up.railway.app`

---

## 6. GitHub Actions Secrets 설정

스케줄러(`.github/workflows/daily-scheduler.yml`)가 ai-service를 호출할 수 있도록:

1. GitHub 레포지토리 → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 으로 아래 2개 추가:

| Secret 이름 | 값 |
|-------------|-----|
| `AI_SERVICE_URL` | `https://ai-service-production-xxxx.up.railway.app` |
| `INTERNAL_API_SECRET` | Railway ai-service의 INTERNAL_API_SECRET 값 |

---

## 7. 배포 후 검증

### api-server 헬스체크

```bash
# 종목 목록 조회
curl https://<api-server-domain>.up.railway.app/api/v1/stocks

# 뉴스 목록 조회
curl "https://<api-server-domain>.up.railway.app/api/v1/news?page=0&size=5"
```

### ai-service 헬스체크

```bash
curl https://<ai-service-domain>.up.railway.app/health
```

### 예상 응답

- `GET /api/v1/stocks` → `{"success":true,"data":[...]}`
- `GET /health` → `{"status":"ok","service":"ai-service","env":"production"}`

---

## 8. 트러블슈팅

### Root Directory 미설정으로 빌드 실패

- 증상: `No Dockerfile found` 또는 Gradle 빌드 오류
- 해결: Railway 서비스 → Settings → Build → Root Directory 확인

### Flyway 마이그레이션 실패

- Supabase DB 신규 생성 후 스키마가 비어있어야 함
- `application-prod.yml`의 `baseline-on-migrate: true` 확인

### Redis 연결 실패

- `REDIS_URL` 환경변수가 올바르게 설정됐는지 확인
- Railway 내 동일 프로젝트의 Redis 서비스 URL 사용

### CORS 오류

- `CORS_ALLOWED_ORIGINS` 에 Vercel 도메인이 정확히 입력됐는지 확인 (`https://` 포함)

---

## 9. 비용 참고 (2025년 기준)

| 항목 | 플랜 | 비용 |
|------|------|------|
| Railway Hobby Plan | 월 $5 크레딧 포함 | $5/월 |
| api-server | Hobby 내 포함 | 크레딧 소진 시 추가 과금 |
| ai-service | Hobby 내 포함 | 크레딧 소진 시 추가 과금 |
| Redis | Hobby 내 포함 | 크레딧 소진 시 추가 과금 |

> 소규모 개인 서비스는 월 $5 크레딧 내에서 충분히 운영 가능합니다.
> 자세한 가격: [railway.app/pricing](https://railway.app/pricing)
