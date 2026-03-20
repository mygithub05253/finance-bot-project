# Vercel 배포 가이드

## 개요

Next.js 15 프론트엔드를 Vercel에 배포하는 단계별 가이드입니다.
Railway 배포가 완료된 이후에 진행해야 합니다 (`railway-guide.md` 참고).

---

## 1. 사전 준비

- [Vercel](https://vercel.com) 계정 생성
- GitHub 레포지토리 연결 권한
- Railway api-server 및 ai-service 배포 완료 (URL 확인 필요)

---

## 2. Vercel 프로젝트 생성

1. Vercel 대시보드 → **Add New** → **Project**
2. GitHub 레포지토리 `finance-bot-project` 선택
3. **Root Directory**: `frontend` 로 변경 (중요!)
4. Framework Preset: **Next.js** (자동 감지됨)
5. **Deploy** 클릭

---

## 3. 환경변수 설정

Vercel 프로젝트 → **Settings** → **Environment Variables**:

| 변수명 | 값 | 환경 |
|--------|-----|------|
| `NEXT_PUBLIC_API_SERVER_URL` | `https://api-server-<id>.up.railway.app` | Production |
| `NEXT_PUBLIC_AI_SERVICE_URL` | `https://ai-service-<id>.up.railway.app` | Production |

> **중요**: `NEXT_PUBLIC_` 접두사 변수는 브라우저에 노출됩니다. API 키 등 민감한 정보 절대 금지.

---

## 4. 도메인 설정 (선택)

### 자동 생성 도메인
- `https://finance-bot-project-<id>.vercel.app`

### 커스텀 도메인 (선택)
1. Vercel 프로젝트 → **Settings** → **Domains**
2. 도메인 입력 → DNS 설정 안내에 따라 CNAME/A 레코드 추가

---

## 5. CORS 업데이트

Vercel 배포 후 Railway 서비스의 `CORS_ALLOWED_ORIGINS`를 Vercel 도메인으로 업데이트:

**api-server Railway Variables**:
```
CORS_ALLOWED_ORIGINS=https://finance-bot-project-<id>.vercel.app
```

**ai-service Railway Variables**:
```
CORS_ALLOWED_ORIGINS=https://finance-bot-project-<id>.vercel.app
FRONTEND_URL=https://finance-bot-project-<id>.vercel.app
```

> 환경변수 변경 후 Railway 서비스 자동 재배포됨

---

## 6. 배포 후 검증 (Chrome으로 확인)

| 페이지 | 확인 항목 |
|--------|---------|
| `/` | 뉴스 대시보드 로드, 종목 필터 동작 |
| `/stocks` | 종목 목록 표시 (api-server 연결 확인) |
| `/register` | URL 입력 → ai-service 연결 확인 |
| `/news/[id]` | 뉴스 상세 페이지 표시 |

---

## 7. 자동 배포 설정

Vercel은 기본적으로 `master` 브랜치에 push 시 자동 배포됩니다:
- **Production**: `master` 브랜치
- **Preview**: 나머지 브랜치 (PR 미리보기)

---

## 8. 트러블슈팅

### 빌드 오류: 타입 에러
```bash
# 로컬에서 빌드 테스트
cd frontend && npm run build
```

### API 연결 실패 (CORS 오류)
- `NEXT_PUBLIC_API_SERVER_URL`에 `https://` 포함 여부 확인
- Railway api-server `CORS_ALLOWED_ORIGINS`에 Vercel 도메인 정확히 입력됐는지 확인

### 환경변수 미적용
- Vercel 환경변수 설정 후 **재배포(Redeploy)** 필요
- `NEXT_PUBLIC_` 변수는 빌드 시 정적으로 삽입되므로 재빌드 필요

---

## 9. Docker/Railway로 프론트엔드 배포 (대안)

Vercel 대신 Railway에 배포하려면 `frontend/Dockerfile`을 사용합니다:

```bash
# 로컬 테스트
docker build -t frontend-test frontend/
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_SERVER_URL=http://localhost:8080 \
  -e NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:3001 \
  frontend-test
```

> `output: 'standalone'` 설정이 `next.config.ts`에 포함되어 있어 Docker 배포 지원됨
