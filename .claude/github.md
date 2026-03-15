# GitHub 워크플로우

## 브랜치 전략
```
main      → 배포용 (직접 push 금지, PR 머지만 허용)
develop   → 통합 브랜치 (PR 머지 대상)
feature/* → 기능 개발 (예: feature/stock-crud, feature/news-archive)
fix/*     → 버그 수정 (예: fix/kakao-send-error)
docs/*    → 문서 작업 (예: docs/update-prd)
```

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
  feat: 관심 종목 CRUD API 구현 (Spring Boot)
  fix: Perplexity API 타임아웃 오류 수정
  docs: PRD v1.1 업데이트 - MVP 범위 조정
  chore: Docker Compose MySQL 설정 추가
```

## PR 규칙
- PR 제목: `[서비스] 작업 내용` 형식 (예: `[api-server] 종목 CRUD API 구현`)
- `feature/*` → `develop` PR 생성 후 머지
- `develop` → `main` PR은 배포 준비 완료 시만
- PR 설명: 변경사항 요약 + 테스트 방법 + 스크린샷(UI 변경 시)

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

## GitHub Issues 라벨
- `feat` - 새 기능
- `bug` - 버그
- `docs` - 문서
- `infra` - 인프라/배포
- `ai` - AI 관련 (Perplexity, Claude)
- `week-1` ~ `week-4` - 개발 주차별 분류

## 저장소 구조
```
finance-bot-project/
├── .github/
│   └── workflows/       # CI/CD Actions
├── .claude/             # Claude 컨텍스트 파일
├── docs/
│   ├── idea/
│   └── PRD/
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
