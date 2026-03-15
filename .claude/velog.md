# Velog 포스팅 가이드

## 시리즈명
**[금융 뉴스 큐레이터] n8n + AI로 나만의 투자 뉴스 아카이브 만들기**

---

## 포스팅 목록 (6편)

### #1 - 설계 편 ✅ 초안 완료
**제목:** `[금융 뉴스 큐레이터 #1] 개인 투자 뉴스 자동화 설계 - Spring Boot + Node.js + n8n`
**파일:** `docs/velog/01-design.md`

**주요 내용:**
- 페인포인트 정의 (뉴스 수동 탐색, 히스토리 관리 불가)
- 3-서비스 아키텍처 결정 이유 (Spring Boot / Node.js / FastAPI)
- ERD 설계 (stock, news_article, news_summary, notification_log)
- 기술 스택 선택 근거 (Perplexity, Claude Haiku, n8n, Supabase)
- Flyway 마이그레이션 전략 (ddl-auto 미사용 이유)

**태그:** `#SpringBoot` `#Nodejs` `#n8n` `#금융자동화` `#사이드프로젝트` `#Supabase`

---

### #2 - Week 1 구현 편 ✅ 초안 완료
**제목:** `[금융 뉴스 큐레이터 #2] 모노레포 + Spring Boot CRUD 구현기 - Supabase/Flyway/GitHub Actions`
**파일:** `docs/velog/02-spring-boot-crud.md`

**주요 내용:**
- 모노레포 디렉토리 구조 세팅 결정 이유
- Spring Boot 패키지 구조 (domain 중심 Layered Architecture)
- Stock 엔티티 설계 (BaseEntity, 소프트 삭제 패턴)
- Flyway V1/V2 마이그레이션 PostgreSQL 문법 주의사항
- GitHub Actions 멀티 서비스 CI (api-server / ai-service / frontend 병렬)
- 트러블슈팅: GitHub frontend 서브모듈(화살표) 문제 해결

**태그:** `#SpringBoot` `#Flyway` `#GitHub Actions` `#Supabase` `#PostgreSQL`

---

### #3 - Week 2-1 AI 수집 편 ⏳ 작업 예정
**제목:** `[금융 뉴스 큐레이터 #3] Perplexity API로 뉴스 자동 수집 + n8n 워크플로우 구성`
**파일:** `docs/velog/03-perplexity-n8n.md`

**주요 내용:**
- Perplexity API 선택 이유 (실시간 검색 + 출처 URL 자동 제공)
- perplexity.service.js 구현 (JSON 응답 강제 프롬프트 전략)
- n8n Cloud 워크플로우 구성 (Schedule → HTTP → Loop → Batch)
- n8n Code Node로 Perplexity 응답 파싱하기
- 트러블슈팅: Perplexity 응답 파싱 오류 / 빈 배열 처리

**태그:** `#PerplexityAPI` `#n8n` `#AI개발` `#뉴스자동화` `#Nodejs`

---

### #4 - Week 2-2 Claude + Redis 편 ⏳ 작업 예정
**제목:** `[금융 뉴스 큐레이터 #4] Claude Haiku로 뉴스 분류 + Redis TTL 중복 방지 구현`
**파일:** `docs/velog/04-claude-redis.md`

**주요 내용:**
- Claude Haiku vs Sonnet 선택 이유 (3초 이내 응답 목표)
- 금융 뉴스 분류 프롬프트 설계 (종목 매핑, 카테고리, 감성, 키워드 JSON)
- Redis TTL 전략: 자동 24h / 수동 7d / URL 해시 레벨 이중 방지
- ai-service 배치 처리 엔드포인트 (`/ai/v1/internal/batch`)
- 트러블슈팅: Claude JSON 응답 파싱 실패 처리, Redis 연결 실패 fallback

**태그:** `#ClaudeAPI` `#Redis` `#AI분류` `#금융뉴스` `#Nodejs`

---

### #5 - Week 3 알림 & 대시보드 편 ⏳ 작업 예정
**제목:** `[금융 뉴스 큐레이터 #5] 카카오톡 알림 연동 + Next.js 15 대시보드 구현`
**파일:** `docs/velog/05-kakao-frontend.md`

**주요 내용:**
- 카카오 REST API "나에게 보내기" 연동 삽질기 (UUID/토큰 발급 과정)
- access_token 만료 자동 갱신 로직 (refresh_token → Redis 저장)
- 메시지 포맷 설계 (1,000자 제한, 종목별 요약 길이 조절)
- Next.js 15 App Router: Server Component SSR vs Client Component CSR 구분 기준
- Zustand 종목 관리 스토어 설계
- React Hook Form + Zod URL 등록 폼 구현
- 트러블슈팅: 카카오 앱 권한 설정 누락 오류

**태그:** `#카카오API` `#Next.js15` `#Zustand` `#AppRouter` `#금융자동화`

---

### #6 - Week 4 배포 + 회고 편 ⏳ 작업 예정
**제목:** `[금융 뉴스 큐레이터 #6] Railway/Vercel 배포 완성 + 1주일 운영 회고`
**파일:** `docs/velog/06-deploy-retrospect.md`

**주요 내용:**
- Railway 멀티 서비스 배포 (api-server + ai-service + Redis)
- Supabase 프로덕션 DB 연결 (pgBouncer 6543 포트 선택 이유)
- Vercel 프론트엔드 배포 + 환경변수 설정
- n8n Cloud 워크플로우 임포트 및 실 운영 테스트
- 1주일 운영 수치: 자동 수집 성공률, 카카오톡 발송 성공률
- 아쉬운 점 & 다음 레벨(Level 2) 계획 (FastAPI 데이터 분석)
- 트러블슈팅: Railway 환경변수 누락 오류, n8n 타임아웃 설정

**태그:** `#Railway` `#Vercel` `#배포` `#회고` `#사이드프로젝트`

---

## 포스팅 작성 가이드라인

**구성 템플릿:**
```
1. 들어가며 (왜 만들었나 / 이번 편에서 다룰 내용)
2. 문제 상황 / 요구사항
3. 설계 / 구현 과정 (핵심 코드 포함)
4. 트러블슈팅 (겪은 오류 + 해결)
5. 결과 / 데모 (스크린샷 또는 응답 예시)
6. 마치며 (다음 편 예고)
```

**코드 블록 규칙:**
- 언어 명시 필수 (```java, ```javascript, ```yaml, ```sql)
- 핵심 로직만 발췌 (전체 코드는 GitHub 링크)
- 주석은 한국어로 작성

**분량 기준:**
- 목표: 2,000 ~ 4,000자 (읽기 적당한 길이)
- 코드 블록 포함 시 5,000자까지 허용
- 코드 블록 비율: 전체의 30~40%

**GitHub 링크:** 각 포스팅에 저장소 링크 첨부
`https://github.com/mygithub05253/finance-bot-project`
