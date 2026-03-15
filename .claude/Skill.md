# Finance Bot - 프로젝트 컨텍스트

## 프로젝트 개요
- **이름**: 금융 뉴스 스크랩 및 투자 리서치 자동화 봇
- **목적**: 개인용 금융 뉴스 큐레이션 + 아카이빙 도구
- **핵심 기능**: 자동 수집(Perplexity) + 수동 URL 등록(Claude 분류) + 카카오톡 알림

## 기술 스택 전체 맵
```
Frontend:    Next.js 15 (App Router), TypeScript, Tailwind CSS + shadcn/ui, Zustand
api-server:  Spring Boot 3.x (Java 17), JPA, Supabase(PostgreSQL 15), Redis
ai-service:  Node.js (Express), claude.service.js, perplexity.service.js, kakao.service.js
data-service: FastAPI (Python), pandas (Level 2 이후)
자동화:      n8n (매일 07:00 KST 스케줄러)
배포:        Vercel(FE), Railway(api-server + ai-service), n8n Cloud
```

## 서비스별 역할
| 서비스 | 기술 | 역할 |
|--------|------|------|
| api-server | Spring Boot 3.x | 핵심 CRUD API (종목, 뉴스 아카이브, 발송 이력) |
| ai-service | Node.js (Express) | AI 오케스트레이터 (Perplexity, Claude, 카카오톡 연동) |
| data-service | FastAPI (Python) | 데이터 분석 (Level 2 이후 확장 대비) |

## 도메인 구조 (Spring Boot api-server)
```
com.gachon.financebot/
├── domain/
│   ├── stock/        # 관심 종목 관리
│   ├── news/         # 뉴스 아카이브
│   └── notification/ # 발송 이력
├── infra/
│   └── client/       # ai-service WebClient
└── global/
    ├── exception/
    └── response/     # ApiResponse<T>
```

## Node.js ai-service 구조
```
src/
├── services/
│   ├── claude.service.js      # Claude API (뉴스 분류/요약)
│   ├── perplexity.service.js  # Perplexity API (자동 수집)
│   └── kakao.service.js       # 카카오톡 REST API
├── routes/                    # Express 라우터
├── controllers/
└── middleware/
```

## 코딩 가이드라인
- **주석**: 한국어 필수 (복잡한 비즈니스 로직)
- **들여쓰기**: 2 spaces
- **변수/함수**: camelCase
- **클래스/컴포넌트**: PascalCase
- **상수**: UPPER_SNAKE_CASE
- **TypeScript**: `any` 사용 금지, Strict Mode
- **에러 처리**: try-catch에서 적절한 에러 응답 반환 (단순 로그만 금지)
- **DTO 패턴**: 모든 API 요청/응답에 DTO 필수 사용

## 실행 명령어
```bash
# 로컬 인프라
docker-compose up -d  # PostgreSQL(로컬) + Redis

# api-server
cd api-server && ./gradlew bootRun --args='--spring.profiles.active=local'

# ai-service
cd ai-service && npm run start:dev

# frontend
cd frontend && npm run dev
```
