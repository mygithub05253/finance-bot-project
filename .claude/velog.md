# Velog 포스팅 가이드

## 시리즈명
**[금융 뉴스 큐레이터] n8n + AI로 나만의 투자 뉴스 아카이브 만들기**

---

## 포스팅 목록

### #1 - 설계 편
**제목:** `[금융 뉴스 큐레이터 #1] 개인 투자 뉴스 자동화 설계 - Spring Boot + Node.js + n8n`

**주요 내용:**
- 페인포인트 정의 (뉴스 수동 탐색, 히스토리 관리 불가)
- 3-서비스 아키텍처 결정 이유 (Spring Boot / Node.js / FastAPI)
- ERD 설계 (stock, news_article, news_summary, notification_log)
- 기술 스택 선택 근거 (Perplexity, Claude, n8n)

**태그:** `#SpringBoot` `#Nodejs` `#n8n` `#금융자동화` `#사이드프로젝트`

---

### #2 - AI 파이프라인 편
**제목:** `[금융 뉴스 큐레이터 #2] Perplexity + Claude API 연동기 (뉴스 자동분류 구현)`

**주요 내용:**
- n8n 워크플로우 구성 (Schedule → Perplexity → ai-service → api-server)
- Claude 분류 프롬프트 설계 (종목 매핑, 카테고리, 감성 분석)
- Redis 중복 방지 로직 (TTL 전략)
- 트러블슈팅: Perplexity 응답 파싱 오류 해결기

**태그:** `#ClaudeAPI` `#PerplexityAPI` `#Redis` `#n8n` `#AI개발`

---

### #3 - 배포 완성 편
**제목:** `[금융 뉴스 큐레이터 #3] 카카오톡 알림 + Vercel/Railway 배포 완성기`

**주요 내용:**
- 카카오 REST API 연동 삽질기 (UUID 발급, 나에게 보내기)
- Railway 배포 과정 (Spring Boot + Node.js 멀티 서비스)
- Vercel 프론트엔드 배포
- 1주일 운영 회고 (자동 수집 성공률, 아쉬운 점)

**태그:** `#카카오API` `#Railway` `#Vercel` `#배포` `#회고`

---

## 포스팅 작성 가이드라인

**구성 템플릿:**
```
1. 들어가며 (왜 만들었나)
2. 문제 상황 / 요구사항
3. 설계 / 구현 과정 (핵심 코드 포함)
4. 트러블슈팅 (겪은 오류 + 해결)
5. 결과 / 데모
6. 마치며 (다음 편 예고)
```

**코드 블록 규칙:**
- 언어 명시 필수 (```java, ```javascript, ```yaml)
- 핵심 로직만 발췌 (전체 코드는 GitHub 링크)

**GitHub 링크:** 각 포스팅에 저장소 링크 첨부
