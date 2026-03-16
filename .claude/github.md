# GitHub 워크플로우

## 브랜치 전략
```
main      → 배포용 (직접 push 금지, PR 머지만 허용)
develop   → 통합 브랜치 (feature/* PR 머지 대상)
feature/* → 기능 개발 (예: feature/week2-perplexity-api)
fix/*     → 버그 수정 (예: fix/kakao-send-error)
docs/*    → 문서/설정 작업 (예: docs/update-prd)
```

---

## 작업 단위 브랜치 원칙

### 핵심 원칙
- **하나의 브랜치 = 하나의 논리적 작업 단위** (atomic branch)
- 브랜치는 반드시 `develop`에서 분기
- `main`, `develop`에 직접 push 금지 (PR을 통해서만 머지)
- 작업 완료 후 PR 머지 → 브랜치 삭제

### 브랜치 라이프사이클
```
1. develop 최신화:  git checkout develop && git pull origin develop
2. 브랜치 분기:      git checkout -b feature/week2-perplexity-api
3. 작업 수행:        커밋 단위로 쪼개어 커밋 (원자적 커밋)
4. push:            git push -u origin feature/week2-perplexity-api
5. PR 생성:          GitHub에서 feature/* → develop PR 생성
6. 머지 후 삭제:      브랜치 삭제 (GitHub UI 또는 git branch -d)
```

---

## Week별 브랜치 계획

### Week 2: AI 파이프라인
| 브랜치명 | 작업 내용 | Velog |
|---------|---------|-------|
| `feature/week2-ai-service-setup` | Node.js ai-service Express 기본 구조 세팅 | #3 |
| `feature/week2-perplexity-api` | Perplexity API 연동 (perplexity.service.js) | #3 |
| `feature/week2-n8n-workflow` | n8n 워크플로우 구성 (스케줄 → 수집 → 저장) | #3 |
| `feature/week2-claude-classify` | Claude 수동 등록 분류 API (claude.service.js) | #4 |
| `feature/week2-redis-dedup` | Redis 중복 방지 구현 (TTL 전략) | #4 |

### Week 3: 알림 & 프론트엔드
| 브랜치명 | 작업 내용 | Velog |
|---------|---------|-------|
| `feature/week3-kakao-api` | 카카오톡 REST API 연동 (kakao.service.js) | #5 |
| `feature/week3-news-dashboard` | Next.js 뉴스 카드 목록 대시보드 | #5 |
| `feature/week3-stock-management-ui` | 종목 관리 페이지 (CRUD UI) | #5 |
| `feature/week3-url-registration-ui` | 수동 URL 등록 폼 UI | #5 |

### Week 4: 배포 & 검증
| 브랜치명 | 작업 내용 | Velog |
|---------|---------|-------|
| `feature/week4-railway-deploy` | Railway 배포 (api-server + ai-service + Redis) | #6 |
| `feature/week4-supabase-prod` | Supabase 프로덕션 DB 연결 | #6 |
| `feature/week4-vercel-deploy` | Vercel 프론트엔드 배포 | #6 |
| `feature/week4-n8n-cloud-setup` | n8n Cloud 워크플로우 임포트 및 실 운영 | #6 |

---

## 커밋 컨벤션 (Conventional Commits)
```
feat:      새 기능 추가
fix:       버그 수정
docs:      문서 변경 (코드 변경 없음)
refactor:  코드 리팩터링 (기능 변경 없음)
test:      테스트 추가/수정
chore:     빌드 설정, 패키지 업데이트
style:     코드 포맷 변경 (기능 변경 없음)

예시:
  feat: Perplexity API 뉴스 자동 수집 구현
  fix: Perplexity API 타임아웃 오류 수정
  docs: PRD v1.3 업데이트 - Week 1 완료 반영
  chore: Redis ioredis 패키지 추가
```

---

## PR 규칙
- PR 제목: `[서비스] 작업 내용` 형식 (예: `[ai-service] Perplexity API 연동`)
- `feature/*` / `fix/*` / `docs/*` → `develop` PR 생성 후 머지
- `develop` → `main` PR은 배포 준비 완료 시만
- PR 설명 템플릿:
  ```
  ## 변경사항
  - 무엇을 구현/수정했는지

  ## 관련 브랜치/이슈
  - Velog #N 초안 연계

  ## 테스트 방법
  - 로컬 실행 및 검증 방법

  ## 스크린샷 (UI 변경 시)
  ```

---

## GitHub Actions (develop PR 트리거)
```yaml
# .github/workflows/ci.yml

jobs:
  api-server:
    steps:
      - Java 17 + Gradle 빌드
      - JUnit 테스트 실행
      - 빌드 결과 확인

  ai-service:
    steps:
      - Node.js 18 + npm ci
      - npm test 실행

  frontend:
    steps:
      - Node.js 18 + npm ci
      - Next.js 빌드 검증 (npm run build)
```

---

## GitHub Issues 라벨
- `feat` - 새 기능
- `bug` - 버그
- `docs` - 문서
- `infra` - 인프라/배포
- `ai` - AI 관련 (Perplexity, Claude)
- `week-1` ~ `week-4` - 개발 주차별 분류

---

## 저장소 구조
```
finance-bot-project/
├── .github/
│   └── workflows/       # CI/CD Actions
├── .claude/             # Claude 컨텍스트 파일
├── docs/
│   ├── api/             # API 명세 (버전 관리)
│   ├── db/              # ERD (버전 관리)
│   ├── features/        # 기능 명세 (버전 관리)
│   ├── idea/
│   ├── PRD/
│   └── velog/           # Velog 포스팅 초안
├── frontend/            # Next.js 15
├── api-server/          # Spring Boot 3.x
├── ai-service/          # Node.js Express
├── data-service/        # FastAPI (Level 2 이후)
├── infra/
│   ├── docker-compose.yml
│   └── n8n/
│       └── workflows/   # n8n 워크플로우 JSON
└── README.md
```
