# [금융 뉴스 큐레이터 #6] Railway + Vercel + n8n 배포기 — 개인 서비스 운영의 첫 날

> **시리즈**: [금융 뉴스 큐레이터] n8n + AI로 나만의 투자 뉴스 아카이브 만들기
> **GitHub**: https://github.com/mygithub05253/finance-bot-project

---

## 들어가며

[#5에서 카카오톡 알림과 Next.js 대시보드](./05-kakao-frontend.md)를 완성했다. 이제 그것을 **실제로 인터넷에 올리는 것**만 남았다. Week 4의 목표는 단 하나: 배포.

로컬에서 잘 되던 것들이 클라우드에서 안 되는 경험은 모든 개발자가 한 번쯤은 겪는다. 이번 포스팅은 그 좌충우돌 기록이다.

---

## 1. 배포 아키텍처 결정

```
[Vercel] Next.js 대시보드
    ↕ HTTPS
[Railway] api-server (Spring Boot)  ← [Railway Redis]
    ↕ X-Internal-Secret
[Railway] ai-service (Node.js)
    ↕
[Supabase] PostgreSQL 15
    ↕ n8n Webhook
[n8n Cloud] 07:00 KST 스케줄러
```

각 서비스를 선택한 이유:
- **Railway**: Dockerfile 한 장으로 Java/Node.js 배포. 무료 크레딧 제공
- **Vercel**: Next.js 공식 지원, Git push만으로 배포 자동화
- **Supabase**: PostgreSQL 15 + Flyway 마이그레이션 완벽 지원, 무료 플랜으로 시작
- **n8n Cloud**: 스케줄러 + HTTP 노드로 코드 없이 워크플로우 구성

---

## 2. Dockerfile 작성 — multi-stage build

처음에는 Railway가 소스만 올리면 알아서 빌드해주는 줄 알았다. Gradle 프로젝트는 multi-stage build가 필수다:

```dockerfile
# Stage 1: 빌드
FROM gradle:8.9-jdk21-alpine AS builder
WORKDIR /app
COPY . .
RUN gradle build -x test --no-daemon

# Stage 2: 경량 런타임
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
COPY --from=builder /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=prod", "app.jar"]
```

**포인트**:
1. `jdk-alpine` (빌더) → `jre-alpine` (런타임) 분리로 이미지 크기 대폭 감소
2. `non-root` 사용자로 실행 (보안)
3. Spring Profile을 `prod`로 고정 → `application-prod.yml` 자동 로드

ai-service도 비슷하게:

```dockerfile
FROM node:20-alpine
RUN npm ci --only=production  # devDependencies 제외
```

---

## 3. Supabase 연결 — SSL은 필수

로컬 PostgreSQL은 SSL 없이 바로 연결됐는데, Supabase는 다르다:

```yaml
# application-prod.yml
spring:
  datasource:
    url: jdbc:postgresql://db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require
```

`?sslmode=require` 를 빠뜨리면 연결 실패다. HikariCP 설정도 중요하다:

```yaml
hikari:
  maximum-pool-size: 5     # Supabase 무료: 최대 60 연결
  minimum-idle: 1
  idle-timeout: 600000     # 10분 유휴 후 반환
  max-lifetime: 1800000    # 30분마다 연결 재생성
```

`max-lifetime`이 없으면 Supabase가 세션을 끊어버릴 때 앱이 에러를 뿜는다.

---

## 4. Flyway 마이그레이션 — 프로덕션에서 자동 실행

`application.yml`에 `baseline-on-migrate: true`가 설정되어 있어서, 신규 Supabase DB에 api-server가 최초 연결될 때 Flyway가 자동으로 스키마를 생성한다.

```
[Railway api-server 시작]
    → Flyway 감지: 마이그레이션 이력 없음
    → V1__init_schema.sql 실행
    → stock, news_article, news_summary, notification_log 테이블 생성 완료
```

배포 로그에서 이 부분을 꼭 확인해야 한다:
```
INFO FlywayExecutor: Database: jdbc:postgresql://db.xxx.supabase.co:5432/postgres
INFO DbMigrate: Successfully applied 1 migration to schema "public"
```

---

## 5. Next.js Vercel 배포 — output standalone

Vercel 배포는 가장 쉬웠다. GitHub 연결 → Root Directory `frontend` 설정 → 환경변수 2개 입력 끝:

```
NEXT_PUBLIC_API_SERVER_URL=https://api-server-xxx.up.railway.app
NEXT_PUBLIC_AI_SERVICE_URL=https://ai-service-xxx.up.railway.app
```

`next.config.ts`에 `output: 'standalone'`을 추가했다. Vercel은 안 써도 되지만, 나중에 Docker로 배포할 때를 위해 추가해뒀다:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    }];
  },
};
```

---

## 6. n8n 워크플로우 — JSON 한 파일로 끝

n8n Cloud의 장점은 워크플로우를 JSON으로 내보내고 임포트할 수 있다는 것이다. 직접 GUI에서 만든 워크플로우를 `infra/n8n/workflows/daily-news-collection.json`으로 저장해뒀다.

**n8n 워크플로우 흐름**:
```
[Cron: 22:00 UTC]
    ↓
[POST /api/news/batch]     Perplexity로 종목별 뉴스 자동 수집
    ↓
[GET /api/v1/news]         오늘 수집된 뉴스 조회
    ↓
[Code Node]                newsItems 배열 포맷팅
    ↓
[IF: 뉴스 건수 > 0]
    ↙           ↘
[카카오 발송]   [건너뜀]
```

뉴스가 없는 날에는 카카오톡을 보내지 않는다. 빈 메시지를 받는 것보다 낫다.

---

## 7. 카카오 액세스 토큰 관리

카카오 OAuth2 토큰은 **6시간**마다 만료된다. 장기 운영을 위한 두 가지 선택지:

**방법 A (단순)**: 리프레시 토큰으로 수동 갱신 (유효기간 60일)
```bash
curl -X POST https://kauth.kakao.com/oauth/token \
  -d "grant_type=refresh_token" \
  -d "client_id={REST_API_KEY}" \
  -d "refresh_token={REFRESH_TOKEN}"
```

**방법 B (자동화)**: n8n에 토큰 갱신 워크플로우 추가 (매 5시간 실행)

개인 서비스이므로 당분간은 방법 A로 운영하고, 불편함이 느껴지면 B로 전환할 계획이다.

---

## 8. 배포 후 첫 알림

매일 아침 07:00 KST에 카카오톡으로 이런 메시지가 온다:

```
📰 [2026-03-21] 오늘의 금융 뉴스

📊 삼성전자 (005930)
  HBM4 양산 기대감 높아져, 2분기 실적 상회 전망…
  출처: https://...
─────────────────
📊 NVIDIA (NVDA)
  Blackwell GPU 공급 증가, 데이터센터 수요 여전히 강세…
  출처: https://...
─────────────────
자동 10건 | 수동 2건
```

직접 만든 서비스가 돌아가는 것을 보는 뿌듯함은 뭐라 말할 수 없다.

---

## 9. 전체 시리즈 마무리

4주간의 프로젝트를 돌아보면:

| Week | 작업 |
|------|------|
| Week 1 | 모노레포 세팅, Spring Boot CRUD, GitHub Actions CI |
| Week 2 | Perplexity/Claude AI 파이프라인, Redis 중복 방지, n8n 설계 |
| Week 3 | 카카오톡 알림, Next.js 15 대시보드, CORS/DB 버그 수정 |
| Week 4 | Railway/Vercel/Supabase/n8n Cloud 배포 + 운영 자동화 |

처음부터 완벽한 설계보다는, **빠르게 만들고 실제로 써보면서 고치는** 방식이 개인 프로젝트에 더 잘 맞는다는 걸 느꼈다.

코드는 [GitHub](https://github.com/mygithub05253/finance-bot-project)에 공개되어 있습니다.

---

*다음 편: Velog #7 — 1개월 운영 회고 (예정)*
