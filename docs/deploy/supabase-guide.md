# Supabase 프로덕션 DB 설정 가이드

## 개요

Supabase(PostgreSQL 15)를 프로덕션 데이터베이스로 설정하는 단계별 가이드입니다.
로컬 개발의 `postgres-pgvector` 컨테이너 대신 Supabase 클라우드 DB를 사용합니다.

---

## 1. Supabase 프로젝트 생성

1. [Supabase 대시보드](https://supabase.com/dashboard) → **New project**
2. 설정:
   - **Name**: `finance-bot`
   - **Database Password**: 강력한 랜덤 비밀번호 생성 → 반드시 메모
   - **Region**: `Northeast Asia (Tokyo)` — Railway와 레이턴시 최소화
3. **Create new project** 클릭 → 약 2분 소요

---

## 2. 연결 정보 확인

### Project Reference ID 확인

1. Supabase 대시보드 → 해당 프로젝트 클릭
2. 상단 URL 확인: `https://supabase.com/dashboard/project/{PROJECT_REF}`
3. `{PROJECT_REF}` 부분 메모 (예: `abcdefghijklmnop`)

### 연결 문자열 확인

1. 프로젝트 대시보드 → 상단 **Connect** 버튼 클릭
2. **Connection string** 탭 → **URI** 방식 선택
3. 또는 **Project Settings** (좌측 하단 톱니바퀴) → **Database** → **Connection string**

| 항목 | 값 |
|------|-----|
| Host | `db.{PROJECT_REF}.supabase.co` |
| Port (직접 연결) | `5432` |
| Port (Transaction Pooler) | `6543` |
| User | `postgres` |
| Password | 프로젝트 생성 시 설정한 값 |

> **주의**: Railway에서는 **직접 연결 (포트 5432)** 을 사용합니다. Transaction Pooler(6543)는 user 형식이 달라 Flyway와 호환성 문제가 발생할 수 있습니다.

---

## 3. Railway 환경변수 설정

api-server Railway 서비스 → **Variables** 탭:

```
SUPABASE_PROJECT_REF=abcdefghijklmnop
SUPABASE_DB_PASSWORD=your-db-password
```

이 값들은 `application-prod.yml`에서 다음과 같이 사용됩니다:

```yaml
url: jdbc:postgresql://db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres?sslmode=require
username: postgres
password: ${SUPABASE_DB_PASSWORD}
```

---

## 4. Flyway 마이그레이션 실행 확인

api-server 최초 배포 시 Flyway가 자동으로 DB 스키마를 생성합니다.

**실행되는 마이그레이션 파일**:
- `V1__init_schema.sql`: 전체 스키마 (stock, news_article, news_summary, notification_log)

**Railway 배포 로그에서 확인**:

Railway 서비스 → **Deployments** → 최신 배포 → **View Logs**:
```
INFO  FlywayExecutor: Database: jdbc:postgresql://db.xxx.supabase.co:5432/postgres
INFO  DbMigrate: Successfully applied 1 migration to schema "public"
```

**Supabase SQL Editor에서 확인**:

1. Supabase 대시보드 → **SQL Editor** → **New query**
2. 아래 쿼리 실행:

```sql
-- Flyway 마이그레이션 이력 확인
SELECT version, description, installed_on, success
FROM flyway_schema_history
ORDER BY installed_rank;

-- 테이블 생성 확인
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

**예상 테이블 목록**:
- `stock`
- `news_article`
- `news_summary`
- `notification_log`
- `flyway_schema_history`

---

## 5. 초기 데이터 삽입 (권장)

관심 종목 초기 데이터를 Supabase SQL Editor에서 삽입합니다.

1. Supabase 대시보드 → **SQL Editor** → **New query**
2. 아래 SQL 실행:

```sql
INSERT INTO stock (ticker, name, sector, exchange, is_active, created_at, updated_at)
VALUES
  ('005930', '삼성전자', '반도체', 'KOSPI', true, NOW(), NOW()),
  ('000660', 'SK하이닉스', '반도체', 'KOSPI', true, NOW(), NOW()),
  ('035720', '카카오', '인터넷', 'KOSPI', true, NOW(), NOW()),
  ('NVDA', 'NVIDIA', '반도체', 'NASDAQ', true, NOW(), NOW()),
  ('AAPL', 'Apple', 'IT', 'NASDAQ', true, NOW(), NOW());
```

3. 프론트엔드 `/stocks` 페이지 또는 `GET /api/v1/stocks`로 확인

---

## 6. 보안 설정

### Row Level Security (RLS)

- Supabase 기본값: RLS 비활성화
- api-server가 `postgres` 슈퍼유저로 직접 접근하므로 RLS 비활성화 유지
- 개인 도구이므로 별도 정책 불필요

### SSL 연결

- `application-prod.yml`에 `?sslmode=require` 설정 완료
- Supabase는 SSL 연결 필수 (미설정 시 연결 거부)

---

## 7. 트러블슈팅

### AbstractMethodError (Flyway 시작 시 오류)

- `build.gradle`에 `flyway-database-postgresql` 의존성이 없는지 확인
- `flyway-core` (9.x 내장 PostgreSQL 지원)만 사용해야 함

### 연결 시간 초과 (HikariPool timeout)

- `maximum-pool-size: 5` 확인 (Supabase 무료 플랜 최대 60 연결)
- Railway와 Supabase 리전을 동일하게 설정 (Tokyo 권장)

### 마이그레이션 실패 (테이블 이미 존재)

- `baseline-on-migrate: true` 설정 확인 (`application.yml`)
- Supabase 신규 프로젝트의 public 스키마가 비어 있어야 함

### 비밀번호 특수문자 문제

- DB 비밀번호에 `@`, `#`, `&` 등 특수문자가 있으면 JDBC URL 인코딩 필요
- 가능하면 영숫자만으로 구성된 비밀번호 사용 권장
