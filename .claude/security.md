# 보안 체크리스트

## 환경변수 목록 (.env.example)

### api-server (.env.local / application-local.yml)
```
SPRING_PROFILES_ACTIVE=local
# 로컬: Docker PostgreSQL / 프로덕션: Supabase
DB_URL=jdbc:postgresql://localhost:5432/financebot
DB_USERNAME=postgres
DB_PASSWORD=
SUPABASE_PROJECT_REF=      # Supabase 프로젝트 참조 ID (프로덕션 전용)
SUPABASE_DB_PASSWORD=      # Supabase DB 비밀번호 (프로덕션 전용)
REDIS_HOST=localhost
REDIS_PORT=6379
INTERNAL_API_SECRET=       # 랜덤 생성 (openssl rand -hex 32)
```

### ai-service (.env)
```
NODE_ENV=development
PORT=3000
PERPLEXITY_API_KEY=        # https://www.perplexity.ai/settings/api
CLAUDE_API_KEY=            # https://console.anthropic.com
KAKAO_REST_API_KEY=        # https://developers.kakao.com
KAKAO_TARGET_UUID=         # 본인 카카오 UUID (개인 메시지 발송)
INTERNAL_API_SECRET=       # api-server와 동일값
API_SERVER_URL=http://localhost:8080
```

### frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:3000
```

---

## API 키 관리 원칙

1. **하드코딩 절대 금지**: 모든 API 키는 환경변수로 관리
2. **`.env` 파일 커밋 금지**: `.gitignore`에 반드시 추가
3. **`.env.example`만 커밋**: 실제 값 없이 키 이름만 기재
4. **Next.js 주의**: `NEXT_PUBLIC_` 접두사 환경변수는 브라우저에 노출됨
   - 비밀 키에 `NEXT_PUBLIC_` 사용 금지
   - 서버에서만 사용해야 하는 키는 접두사 없이 사용

---

## .gitignore 필수 항목
```gitignore
# 환경변수
.env
.env.local
.env.*.local

# Spring Boot 설정 (로컬 전용)
api-server/src/main/resources/application-local.yml
api-server/src/main/resources/application-secret.yml

# 빌드 결과물
api-server/build/
frontend/.next/
frontend/out/
node_modules/
```

---

## 서비스 간 통신 보안

**INTERNAL_API_SECRET 사용 흐름:**
```
n8n → ai-service: X-Internal-Secret 헤더 포함
n8n → api-server: X-Internal-Secret 헤더 포함
ai-service → api-server: X-Internal-Secret 헤더 포함
```

**Spring Boot 검증 예시:**
```java
// InternalAuthFilter.java
String secret = request.getHeader("X-Internal-Secret");
if (!INTERNAL_API_SECRET.equals(secret)) {
  response.sendError(HttpServletResponse.SC_FORBIDDEN);
  return;
}
```

---

## Redis 캐시 키 보안
```
news:auto:{stockId}:{YYYY-MM-DD}   TTL: 24시간
news:manual:{urlHash}              TTL: 7일

urlHash 생성:
  String hash = DigestUtils.sha256Hex(url).substring(0, 16);
```

---

## 카카오톡 보안

**KAKAO_TARGET_UUID 발급 방법:**
1. 카카오 개발자 앱 생성 → REST API 키 발급
2. 카카오 로그인 후 `/v2/user/me` 호출 → `kakaoAccount.email` 확인
3. 관리자 권한으로 UUID 조회 (나에게 보내기는 본인 UUID 사용)

**주의**: KAKAO_TARGET_UUID는 개인 식별 정보 → 절대 커밋 금지

---

## 배포 환경 보안 체크리스트
- [ ] 모든 환경변수 Railway/Vercel에 등록 확인
- [ ] `.env` 파일 미커밋 확인 (`git status` 재확인)
- [ ] INTERNAL_API_SECRET 강도 확인 (32바이트 이상 랜덤)
- [ ] Supabase DB 비밀번호 강도 확인 (Supabase 대시보드)
- [ ] Redis 외부 노출 여부 확인 (Railway 내부 전용)
- [ ] n8n 자격증명 암호화 저장 확인
