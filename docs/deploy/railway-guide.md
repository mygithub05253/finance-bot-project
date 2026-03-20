# Railway 배포 가이드

## 개요

api-server(Spring Boot)와 ai-service(Node.js)를 Railway에 배포하는 단계별 가이드입니다.

---

## 1. 사전 준비

- [Railway](https://railway.app) 계정 생성
- GitHub 레포지토리 연결 완료
- Supabase 프로덕션 DB 생성 완료 (`supabase-guide.md` 참고)

---

## 2. Railway 프로젝트 생성

1. Railway 대시보드 → **New Project**
2. **Deploy from GitHub repo** 선택
3. `finance-bot-project` 레포지토리 선택

---

## 3. Redis 애드온 추가

1. Railway 프로젝트 내 **Add Service** → **Database** → **Redis**
2. 생성 완료 후 Redis 서비스 클릭 → **Connect** 탭에서 환경변수 확인
   - `REDIS_URL` (자동 주입됨)
   - 혹은 `REDISHOST`, `REDISPORT`를 수동으로 api-server/ai-service에 설정

---

## 4. api-server 배포

### 4-1. 서비스 추가
1. **Add Service** → **GitHub Repo** → `api-server` 루트 디렉토리 선택
2. Dockerfile 자동 감지됨

### 4-2. 환경변수 설정
Railway 서비스 → **Variables** 탭에 아래 항목 입력:

```
SPRING_PROFILES_ACTIVE=prod
SUPABASE_PROJECT_REF=<your-supabase-project-ref>
SUPABASE_DB_PASSWORD=<your-supabase-db-password>
REDIS_HOST=<Railway Redis 내부 호스트>
REDIS_PORT=6379
INTERNAL_API_SECRET=<32바이트 랜덤 문자열>
CORS_ALLOWED_ORIGINS=https://<your-frontend>.vercel.app
```

> **INTERNAL_API_SECRET 생성**: `openssl rand -hex 32`

### 4-3. 도메인 확인
- Railway 자동 생성 도메인: `https://api-server-<id>.up.railway.app`
- **Settings** → **Networking** → Generate Domain

---

## 5. ai-service 배포

### 5-1. 서비스 추가
1. **Add Service** → **GitHub Repo** → `ai-service` 루트 디렉토리 선택
2. Dockerfile 자동 감지됨

### 5-2. 환경변수 설정

```
NODE_ENV=production
PORT=3001
PERPLEXITY_API_KEY=<your-perplexity-api-key>
CLAUDE_API_KEY=<your-anthropic-api-key>
KAKAO_REST_API_KEY=<your-kakao-rest-api-key>
KAKAO_ACCESS_TOKEN=<your-kakao-access-token>
INTERNAL_API_SECRET=<api-server와 동일한 값>
API_SERVER_URL=https://<api-server-domain>.up.railway.app
CORS_ALLOWED_ORIGINS=https://<your-frontend>.vercel.app
FRONTEND_URL=https://<your-frontend>.vercel.app
REDIS_HOST=<Railway Redis 내부 호스트>
REDIS_PORT=6379
```

> **카카오 Access Token 발급**: `n8n-cloud-guide.md` 내 OAuth2 섹션 참고

### 5-3. 도메인 확인
- `https://ai-service-<id>.up.railway.app`

---

## 6. 배포 후 검증

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

## 7. 트러블슈팅

### Flyway 마이그레이션 실패
- Supabase DB가 신규 생성된 경우 `baseline-on-migrate: true` 설정 확인
- `application-prod.yml`의 Supabase 연결 URL 확인

### Redis 연결 실패
- Railway Redis 서비스와 api-server/ai-service가 **동일 프로젝트** 내에 있어야 내부 통신 가능
- 외부 Redis 사용 시 `REDIS_URL` 형식으로 연결

### CORS 오류
- `CORS_ALLOWED_ORIGINS`에 Vercel 배포 URL이 정확히 입력되었는지 확인
- `https://` 포함 여부 확인

---

## 8. 비용 참고

| 서비스 | 플랜 | 예상 비용 |
|--------|------|---------|
| api-server | Hobby | 무료 (500시간/월) |
| ai-service | Hobby | 무료 (500시간/월) |
| Redis | Hobby | 무료 (25MB) |

> Railway Hobby 플랜: 월 $5 크레딧 무료 제공 (2024년 기준)
