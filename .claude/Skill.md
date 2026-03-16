# Finance Bot - 프로젝트 컨텍스트 & 개발 가이드

## 프로젝트 개요
- **이름**: 금융 뉴스 스크랩 및 투자 리서치 자동화 봇
- **목적**: 개인용 금융 뉴스 큐레이션 + 아카이빙 도구
- **핵심 기능**: 자동 수집(Perplexity) + 수동 URL 등록(Claude 분류) + 카카오톡 알림

---

## 기술 스택 전체 맵
```
Frontend:    Next.js 15 (App Router), TypeScript, Tailwind CSS + shadcn/ui, Zustand
api-server:  Spring Boot 3.x (Java 17), JPA, Supabase(PostgreSQL 15), Redis
ai-service:  Node.js (Express), claude.service.js, perplexity.service.js, kakao.service.js
data-service: FastAPI (Python), pandas (Level 2 이후)
자동화:      n8n (매일 07:00 KST 스케줄러)
배포:        Vercel(FE), Railway(api-server + ai-service), n8n Cloud
```

---

## 서비스별 역할
| 서비스 | 기술 | 역할 |
|--------|------|------|
| api-server | Spring Boot 3.x | 핵심 CRUD API (종목, 뉴스 아카이브, 발송 이력) |
| ai-service | Node.js (Express) | AI 오케스트레이터 (Perplexity, Claude, 카카오톡 연동) |
| data-service | FastAPI (Python) | 데이터 분석 (Level 2 이후 확장 대비) |

---

## 도메인 구조 (Spring Boot api-server)
```
com.financebot.apiserver/
├── domain/
│   ├── stock/        # 관심 종목 관리 (StockController, StockService, StockRepository)
│   ├── news/         # 뉴스 아카이브 (NewsArticle, NewsSummary)
│   └── notification/ # 발송 이력 (NotificationLog)
├── infra/
│   └── client/       # ai-service WebClient
└── global/
    ├── exception/     # GlobalExceptionHandler, CustomException
    └── response/      # ApiResponse<T> 공통 응답
```

## Node.js ai-service 구조
```
src/
├── services/
│   ├── claude.service.js      # Claude API (뉴스 분류/요약) - Haiku 모델
│   ├── perplexity.service.js  # Perplexity API (자동 수집)
│   └── kakao.service.js       # 카카오톡 REST API
├── routes/                    # Express 라우터
├── controllers/
└── middleware/
    └── internalAuth.js        # X-Internal-Secret 헤더 인증
```

---

## 코딩 가이드라인
- **주석**: 한국어 필수 (복잡한 비즈니스 로직)
- **들여쓰기**: 2 spaces
- **변수/함수**: camelCase
- **클래스/컴포넌트**: PascalCase
- **상수**: UPPER_SNAKE_CASE
- **TypeScript**: `any` 사용 금지, Strict Mode
- **에러 처리**: try-catch에서 적절한 에러 응답 반환 (단순 로그만 금지)
- **DTO 패턴**: 모든 API 요청/응답에 DTO 필수 사용

---

## 서비스별 코딩 패턴

### Spring Boot api-server
```java
// 생성자 주입 방식 필수 (필드 주입 금지)
@Service
@RequiredArgsConstructor
public class StockService {
    private final StockRepository stockRepository;

    // 서비스 레이어에서 @Transactional 관리
    @Transactional
    public StockResponse create(StockCreateRequest request) { ... }

    // 소프트 삭제 패턴 (is_active = false)
    @Transactional
    public void deactivate(Long id) { ... }
}

// ApiResponse<T> 공통 응답 형식
@RestController
public class StockController {
    @PostMapping
    public ResponseEntity<ApiResponse<StockResponse>> create(...) {
        return ResponseEntity.status(201).body(ApiResponse.success(response));
    }
}
```

### Node.js ai-service
```javascript
// 서비스 레이어에서 비즈니스 로직 집중
// 에러는 적절한 HTTP 상태코드와 함께 반환
const classifyNews = async (url) => {
    try {
        // axios + cheerio로 크롤링
        // Claude API 호출 → JSON 파싱
        // Redis 중복 체크
    } catch (error) {
        // 단순 console.error만 하지 말고 에러 전파
        throw new AppError('분류 실패', 500, error.message);
    }
};
```

### Next.js Frontend
```typescript
// Server Component 우선 (데이터 패칭은 서버에서)
// Client Component는 interactivity 필요 시만 ('use client')
// Zustand 스토어: 클라이언트 상태만 관리
// React Hook Form + Zod: 폼 검증

// API 호출은 별도 lib/api.ts에 집중
export const fetchStocks = async (): Promise<Stock[]> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/stocks`);
    if (!res.ok) throw new Error('종목 조회 실패');
    return res.json();
};
```

---

## 테스트 전략
| 서비스 | 테스트 도구 | 우선순위 |
|--------|------------|---------|
| api-server | JUnit 5 + MockMvc | Service 레이어 단위 테스트 |
| ai-service | Jest | Service 함수 단위 테스트, API 응답 모킹 |
| frontend | N/A (MVP 단계) | - |

---

## 에러 처리 패턴
```
api-server:  GlobalExceptionHandler → ApiResponse<T> 형태로 통일
ai-service:  AppError 클래스 → Express error middleware → JSON 에러 응답
frontend:    try-catch + 사용자 친화적 에러 메시지 (toast/alert)
```

---

## 보안 패턴
- 서비스 간 통신: `X-Internal-Secret` 헤더 필수 (ai-service → api-server)
- 환경변수: `.env` 파일 절대 커밋 금지, `.env.example`만 커밋
- API 키: 모두 환경변수로 관리 (CLAUDE_API_KEY, PERPLEXITY_API_KEY 등)

---

## 작업 완료 프로토콜 (MANDATORY)

모든 작업이 완료된 후 반드시 아래 순서를 따릅니다.

### 1단계: 문서 업데이트
다음 파일들을 작업 내용에 맞게 업데이트 (버전 관리 필수):

| 파일 | 업데이트 조건 |
|------|------------|
| `docs/PRD/PRD.md` | 기능 추가/변경 시 버전 증가 |
| `docs/db/ERD.md` | DB 스키마 변경 시 |
| `docs/api/backend/api-spec.md` | api-server API 변경 시 |
| `docs/api/ai/api-spec.md` | ai-service API 변경 시 |
| `docs/api/frontend/api-spec.md` | 프론트엔드 API 호출 변경 시 |
| `docs/features/ai/auto-collection.md` | AI 수집 기능 변경 시 |
| `docs/features/ai/notification.md` | 알림 기능 변경 시 |
| `docs/features/user/news-archive.md` | 뉴스 아카이브 기능 변경 시 |
| `docs/features/user/news-registration.md` | 수동 등록 기능 변경 시 |
| `docs/features/user/stock-management.md` | 종목 관리 기능 변경 시 |

### 2단계: README 업데이트
- `README.md` (루트): 개발 진행 현황 체크리스트 업데이트
- 변경된 서비스 폴더의 `README.md` 업데이트

### 3단계: Velog 초안 업데이트
`docs/velog/*.md` 중 해당 브랜치와 연계된 포스팅 초안에 내용 추가
- `.claude/velog.md`의 "브랜치 → Velog 연계 맵" 참조

### 4단계: Git 작업
```bash
# 변경사항 커밋
git add <변경된 파일들>
git commit -m "feat: 작업 내용 요약"

# 브랜치 push 및 PR 생성
git push -u origin <브랜치명>
gh pr create --base develop --title "[서비스] 작업 내용" --body "..."
```

---

## 컨텍스트 관리 전략 (Auto-Compact)

### 언제 compact가 필요한가
- 대화가 길어져 컨텍스트 윈도우가 가득 찰 때 자동으로 compact 실행
- 작업 중단 없이 연속적으로 진행 가능

### Memory 파일 관리 원칙
- 중요 결정사항은 즉시 `memory/MEMORY.md`에 기록
- 세션 종료 전 아래를 확인:
  - 완료된 작업 → `MEMORY.md`의 진행 상태 업데이트
  - 새로운 파일 위치 → `핵심 파일 위치` 섹션에 추가
  - 새로운 설계 결정 → `주요 설계 결정` 섹션에 추가
- 상세 기술 노트가 필요한 경우 `memory/` 하위에 별도 파일 생성 후 MEMORY.md에 링크

### 효율적 컨텍스트 사용
- 작업 시작 시 반드시 `MEMORY.md` 확인하여 이전 작업 이어받기
- 대규모 파일 읽기 시 필요한 섹션만 선택적으로 읽기 (offset/limit 활용)
- 반복적인 전체 파일 읽기 대신 특정 패턴 검색(Grep) 활용

---

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

# 테스트
cd api-server && ./gradlew test
cd ai-service && npm test
```
