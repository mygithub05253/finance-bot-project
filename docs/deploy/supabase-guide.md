# Supabase 프로덕션 DB 설정 가이드

## 개요

Supabase(PostgreSQL 15)를 프로덕션 데이터베이스로 설정하는 단계별 가이드입니다.
로컬 개발 환경의 `postgres-pgvector` 컨테이너 대신 Supabase 클라우드 DB를 사용합니다.

---

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 접속 → **New Project**
2. 설정:
   - **Name**: `finance-bot`
   - **Database Password**: 강력한 랜덤 비밀번호 생성 및 저장
   - **Region**: Northeast Asia (Tokyo) 또는 가장 가까운 리전
3. 생성 완료 (약 2분 소요)

---

## 2. 연결 정보 확인

**Project Settings** → **Database** → **Connection Info**:
- **Project Ref**: `abcdefghijklmn` (예시)
- **Host**: `db.abcdefghijklmn.supabase.co`
- **Port**: `5432` (직접 연결) / `6543` (Transaction Pooler)
- **User**: `postgres`
- **Password**: 프로젝트 생성 시 설정한 값

---

## 3. Railway 환경변수 설정

api-server Railway 서비스 → **Variables** 탭:

```
SUPABASE_PROJECT_REF=abcdefghijklmn
SUPABASE_DB_PASSWORD=your-db-password
```

> `SUPABASE_PROJECT_REF`는 Supabase 프로젝트 설정 URL에서 확인 가능:
> `https://supabase.com/dashboard/project/{SUPABASE_PROJECT_REF}`

---

## 4. Flyway 마이그레이션 실행 확인

api-server 최초 배포 시 Flyway가 자동으로 DB 스키마를 생성합니다.

**실행되는 마이그레이션 파일**:
- `V1__init_schema.sql`: 전체 스키마 (stock, news_article, news_summary, notification_log)

**확인 방법** (Supabase SQL Editor):
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

## 5. 초기 데이터 삽입 (선택)

관심 종목 초기 데이터를 Supabase SQL Editor에서 직접 삽입:

```sql
INSERT INTO stock (ticker, name, sector, exchange, is_active, created_at, updated_at)
VALUES
  ('005930', '삼성전자', '반도체', 'KOSPI', true, NOW(), NOW()),
  ('000660', 'SK하이닉스', '반도체', 'KOSPI', true, NOW(), NOW()),
  ('035720', '카카오', '인터넷', 'KOSPI', true, NOW(), NOW()),
  ('NVDA', 'NVIDIA', '반도체', 'NASDAQ', true, NOW(), NOW()),
  ('AAPL', 'Apple', 'IT', 'NASDAQ', true, NOW(), NOW());
```

> api-server의 `GET /api/v1/stocks`로 결과 확인

---

## 6. 연결 검증

### 로컬에서 프로덕션 DB 연결 테스트 (개발 시)

```bash
# 임시 환경변수로 프로덕션 DB에 연결
SPRING_PROFILES_ACTIVE=prod \
SUPABASE_PROJECT_REF=abcdefghijklmn \
SUPABASE_DB_PASSWORD=your-db-password \
REDIS_HOST=localhost \
REDIS_PORT=6379 \
./gradlew bootRun
```

---

## 7. 보안 설정

### Row Level Security (RLS)
- Supabase 기본값: RLS 비활성화
- api-server가 `postgres` 계정으로 직접 접근하므로 RLS 비활성화 상태 유지
- 공개 데이터이므로 별도 정책 불필요

### 연결 SSL
- `application-prod.yml`에 `?sslmode=require` 설정 완료
- Supabase는 SSL 연결 필수

---

## 8. 트러블슈팅

### AbstractMethodError (Flyway)
- `build.gradle`에 `flyway-database-postgresql` 의존성이 없는지 확인
- `flyway-core` (9.x 내장 PostgreSQL 지원)만 사용해야 함

### 연결 시간 초과
- `maximum-pool-size: 5` 설정 확인 (Supabase 무료 플랜 최대 60 연결)
- Railway와 Supabase가 같은 리전에 있는지 확인 (레이턴시 최소화)

### 마이그레이션 실패 (테이블 이미 존재)
- `baseline-on-migrate: true` 설정 확인
- Supabase 프로젝트 신규 생성 시 public 스키마가 비어있어야 함
