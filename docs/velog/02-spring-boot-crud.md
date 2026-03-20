# [금융 뉴스 큐레이터 #2] 모노레포 + Spring Boot CRUD 구현기 - Supabase/Flyway/GitHub Actions

> **시리즈:** [금융 뉴스 큐레이터] n8n + AI로 나만의 투자 뉴스 아카이브 만들기
> **태그:** `#SpringBoot` `#Flyway` `#GitHubActions` `#Supabase` `#PostgreSQL` `#사이드프로젝트`

---

## 들어가며

[지난 편](#)에서 전체 아키텍처를 설계했습니다. 이번 편에서는 실제 코드를 작성한 Week 1 작업을 다룹니다.

- 모노레포 디렉토리 구조 세팅
- Spring Boot api-server: Stock CRUD API 구현
- Flyway 마이그레이션으로 DB 스키마 버전 관리
- GitHub Actions CI 파이프라인 구성
- **트러블슈팅**: GitHub에서 `frontend` 폴더가 화살표(→)로 표시되는 서브모듈 문제

---

## 모노레포 구조 결정

이 프로젝트는 Spring Boot, Node.js, Next.js 세 가지 기술 스택이 공존합니다. 별도 레포지토리로 분리하면 CI/CD와 문서 관리가 복잡해져서 **모노레포**로 결정했습니다.

```
finance-bot-project/
├── api-server/          # Spring Boot 3.x (Java 17)
├── ai-service/          # Node.js Express
├── frontend/            # Next.js 15
├── data-service/        # FastAPI (Level 2 이후)
├── infra/
│   └── docker-compose.yml   # 로컬: PostgreSQL + Redis
├── .github/
│   └── workflows/ci.yml
└── docs/                # 프로젝트 문서
```

각 서비스가 독립 배포되지만 같은 레포에서 관리하면 PR 하나로 여러 서비스 변경을 추적할 수 있습니다.

---

## Spring Boot 패키지 구조

`com.financebot.apiserver` 아래를 **도메인 중심**으로 구성했습니다.

```
src/main/java/com/financebot/apiserver/
├── domain/
│   ├── stock/
│   │   ├── Stock.java            # 엔티티
│   │   ├── StockRepository.java  # JPA Repository
│   │   ├── StockService.java     # 비즈니스 로직
│   │   ├── StockController.java  # REST Controller
│   │   └── dto/                  # Request/Response DTO
│   └── news/
│       ├── NewsArticle.java
│       └── ...
└── common/
    ├── BaseEntity.java           # 공통 타임스탬프
    ├── ApiResponse.java          # 공통 응답 포맷
    └── exception/                # 전역 예외 처리
```

---

## Stock 엔티티 설계 - 소프트 삭제 패턴

관심 종목은 실제 삭제 대신 `isActive` 플래그를 `false`로 변경하는 **소프트 삭제** 패턴을 사용합니다. 이유는 두 가지입니다.

1. `news_summary`가 `stock_id`로 FK를 참조하므로 실제 삭제 시 FK 위반 발생
2. "이전에 어떤 종목을 관심 목록에 등록했는지" 이력 추적 가능

```java
@Entity
@Table(name = "stock")
public class Stock extends BaseEntity {

  @Column(nullable = false, unique = true, length = 20)
  private String ticker;       // 005930

  @Column(nullable = false, length = 100)
  private String name;         // 삼성전자

  @Column(length = 50)
  private String sector;       // 반도체

  @Column(length = 20)
  private String exchange;     // KOSPI / KOSDAQ / NASDAQ

  @Column(nullable = false)
  private boolean isActive = true;

  // 소프트 삭제: DELETE 쿼리 대신 flag 변경
  public void deactivate() {
    this.isActive = false;
  }

  public void update(String name, String sector, String exchange) {
    this.name = name;
    this.sector = sector;
    this.exchange = exchange;
  }
}
```

`BaseEntity`는 `@CreatedDate`, `@LastModifiedDate`를 JPA Auditing으로 자동 관리합니다.

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

  @CreatedDate
  @Column(nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @LastModifiedDate
  @Column(nullable = false)
  private OffsetDateTime updatedAt;
}
```

---

## Flyway 마이그레이션 - PostgreSQL 주의사항

JPA의 `spring.jpa.hibernate.ddl-auto: create`는 **절대 사용하지 않습니다.** 프로덕션에서 서버 재시작 시 테이블이 날아갈 위험이 있기 때문입니다. Flyway로 버전 관리합니다.

```
api-server/src/main/resources/db/migration/
├── V1__init_schema.sql    # 테이블 생성
└── V2__add_index.sql      # 인덱스 추가
```

MySQL과 다른 **PostgreSQL 문법**에 주의해야 합니다.

```sql
-- V1__init_schema.sql
-- MySQL의 AUTO_INCREMENT → PostgreSQL의 GENERATED ALWAYS AS IDENTITY
CREATE TABLE stock (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticker     VARCHAR(20) NOT NULL,
  name       VARCHAR(100) NOT NULL,
  sector     VARCHAR(50),
  exchange   VARCHAR(20),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL,  -- DATETIME → TIMESTAMPTZ (시간대 포함)
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uk_stock_ticker UNIQUE (ticker)
);

-- news_summary의 keywords는 JSONB로 GIN 인덱스 활용
CREATE TABLE news_summary (
  ...
  keywords  JSONB,  -- MySQL에는 없는 타입
  CONSTRAINT chk_sentiment CHECK (sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE'))
);
```

```sql
-- V2__add_index.sql
-- JSONB GIN 인덱스: 키워드 포함 검색 가속
CREATE INDEX idx_news_summary_keywords
  ON news_summary USING GIN (keywords);

-- 종목별 최신순 뉴스 조회 최적화
CREATE INDEX idx_news_summary_stock_created
  ON news_summary (stock_id, created_at DESC);
```

---

## GitHub Actions CI - 멀티 서비스 병렬 빌드

세 서비스를 **병렬**로 빌드/테스트합니다. 순차 실행 대비 CI 시간이 3배 단축됩니다.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [ develop ]

jobs:
  api-server:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: api-server
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
      - name: Gradle 빌드 및 테스트
        run: ./gradlew build --no-daemon

  ai-service:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ai-service
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci && npm test

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci && npm run build
```

---

## 트러블슈팅: GitHub frontend 화살표(→) 서브모듈 문제

GitHub에서 `frontend` 폴더가 폴더 아이콘이 아니라 **화살표(→) 아이콘**으로 표시되고, 클릭해도 파일 목록이 보이지 않는 문제가 발생했습니다.

### 원인

`create-next-app`이 `frontend` 폴더 내에 `.git` 폴더를 자동으로 생성합니다. 이 상태에서 상위 레포에서 `git add .`를 실행하면 Git이 해당 폴더를 **별도 레포지토리(서브모듈)**로 인식하고 `160000` 모드의 gitlink로 등록합니다.

```bash
# 문제 확인: 160000 모드가 서브모듈 등록을 의미
$ git ls-files --stage | grep frontend
160000 8d8531358c0208124849eecffe6bad1701db0208 0  frontend
```

### 해결 방법

`.git` 폴더를 삭제한 후 git 인덱스에서 gitlink를 제거하고 일반 폴더로 재등록합니다.

```bash
# 1. frontend/.git 폴더 삭제 (또는 파일 탐색기에서 삭제)
rm -rf frontend/.git

# 2. git 인덱스에서 서브모듈 gitlink 제거
git rm --cached frontend

# 3. 일반 폴더로 재등록
git add frontend/

# 4. 커밋 및 푸시
git commit -m "fix: frontend 서브모듈 연결 해제 및 일반 폴더로 전환"
git push
```

이후 GitHub에서 정상적으로 `frontend` 폴더 내 파일 목록이 표시됩니다.

---

## 결과

Week 1 완료 후 GitHub 저장소 상태:

```
✅ api-server/  - Stock CRUD API (GET/POST/PUT/DELETE) + Flyway 마이그레이션
✅ ai-service/  - Express 서버 구조 + 내부 인증 미들웨어
✅ frontend/    - Next.js 15 App Router 기본 세팅 (서브모듈 문제 해결)
✅ .github/     - CI 워크플로우 (develop PR 트리거)
✅ infra/       - docker-compose.yml (PostgreSQL + Redis 로컬 환경)
```

---

## 마치며

Week 1에서 가장 많이 배운 점은 **PostgreSQL과 MySQL의 문법 차이**입니다. `AUTO_INCREMENT` → `GENERATED ALWAYS AS IDENTITY`, `DATETIME` → `TIMESTAMPTZ`, `TEXT` 기반의 `JSONB`... 처음엔 낯설지만 JSONB의 GIN 인덱스는 키워드 검색에서 강력한 성능을 보여줄 것으로 기대합니다.

다음 편에서는 **AI 파이프라인 구축** — Perplexity 뉴스 수집, Claude 분류, Redis 중복 방지, n8n 워크플로우를 다루겠습니다.

**GitHub 저장소:** https://github.com/mygithub05253/finance-bot-project

---

*다음 편 예고: [#3] Week 2 AI 파이프라인 — Perplexity + Claude + Redis + n8n으로 자동 뉴스 수집*
