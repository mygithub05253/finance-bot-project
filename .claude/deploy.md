# 배포 가이드

## 서비스별 배포 플랫폼
| 서비스 | 플랫폼 | URL 패턴 |
|--------|--------|---------|
| frontend | Vercel | `https://finance-news-bot.vercel.app` |
| api-server | Railway | `https://api-financebot.railway.app` |
| ai-service | Railway | `https://ai-financebot.railway.app` |
| n8n | n8n Cloud | `https://n8n.io` (클라우드 플랜) |
| MySQL | Railway (애드온) | Railway 내부 연결 |
| Redis | Railway (애드온) | Railway 내부 연결 |

---

## Frontend (Vercel)

**환경변수:**
```
NEXT_PUBLIC_API_URL=https://api-financebot.railway.app
NEXT_PUBLIC_AI_SERVICE_URL=https://ai-financebot.railway.app
```

**배포 설정:**
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `.next`
- 자동 배포: `main` 브랜치 push 트리거

---

## Backend - api-server (Railway)

**환경변수:**
```
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:mysql://{Railway MySQL 내부 URL}:3306/financebot
DB_USERNAME=root
DB_PASSWORD={Railway 자동 생성}
REDIS_HOST={Railway Redis 내부 호스트}
REDIS_PORT=6379
INTERNAL_API_SECRET={랜덤 생성 시크릿}
```

**배포 설정:**
- Root Directory: `api-server`
- Build Command: `./gradlew build -x test`
- Start Command: `java -jar build/libs/*.jar`

---

## Backend - ai-service (Railway)

**환경변수:**
```
NODE_ENV=production
PORT=3000
PERPLEXITY_API_KEY={발급 키}
CLAUDE_API_KEY={발급 키}
KAKAO_REST_API_KEY={발급 키}
KAKAO_TARGET_UUID={본인 카카오 UUID}
INTERNAL_API_SECRET={api-server와 동일값}
API_SERVER_URL=https://api-financebot.railway.app
```

**배포 설정:**
- Root Directory: `ai-service`
- Build Command: `npm ci`
- Start Command: `npm start`

---

## n8n Cloud

**스케줄 설정:**
- 실행 시각: `07:00 KST` = `22:00 UTC`
- Cron: `0 22 * * 1-5` (평일만)

**워크플로우 파일 위치:** `infra/n8n/workflows/*.json`

**n8n 자격증명 등록:**
- Perplexity API Key
- Claude API Key
- api-server Internal Secret (X-Internal-Secret 헤더)
- ai-service Internal Secret

---

## 로컬 개발 환경

```bash
# 1. 인프라 실행 (MySQL + Redis)
docker-compose up -d

# 2. api-server 실행
cd api-server
./gradlew bootRun --args='--spring.profiles.active=local'
# → http://localhost:8080

# 3. ai-service 실행
cd ai-service
npm run start:dev
# → http://localhost:3000

# 4. frontend 실행
cd frontend
npm run dev
# → http://localhost:3001
```

**docker-compose.yml 위치:** `infra/docker-compose.yml`

---

## 배포 순서 (최초 배포)

1. Railway 프로젝트 생성 → MySQL, Redis 애드온 추가
2. api-server 배포 → 환경변수 설정 → DB 마이그레이션 확인
3. ai-service 배포 → 환경변수 설정 → `/ai/v1/health` 확인
4. n8n Cloud 워크플로우 임포트 → 자격증명 연결 → 테스트 실행
5. Vercel 배포 → 환경변수 설정 → 도메인 확인
