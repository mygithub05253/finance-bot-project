# KPI 모니터링 체크리스트

## 개요

Railway + Vercel + n8n Cloud 배포 후 1주일 운영 기간 동안 확인할 KPI 지표입니다.

---

## 1. 일일 운영 지표 (n8n 실행 후 확인)

### 뉴스 수집
| 지표 | 확인 방법 | 목표 |
|------|---------|------|
| 자동 수집 건수 (Perplexity) | n8n Executions → 배치 노드 결과 `saved` 값 | ≥ 5건/일 |
| 수동 등록 건수 | Supabase `news_article` 테이블 `source_type = 'MANUAL'` | 상황에 따라 |
| 중복 방지 작동 | n8n 배치 로그 `409 Conflict` 건수 | 0~5건 (정상) |

### 카카오톡 알림
| 지표 | 확인 방법 | 목표 |
|------|---------|------|
| 발송 성공 여부 | n8n Executions → 카카오 노드 상태 확인 | 성공 |
| 메시지 수신 시각 | 카카오톡 앱에서 직접 확인 | 07:00~07:10 KST |
| 액세스 토큰 만료 오류 | n8n 실패 로그 `[-401]` | 0건 |

---

## 2. API 응답 상태 (Railway 로그)

### 확인 명령어
```bash
# api-server 로그 확인 (Railway CLI 설치 후)
railway logs --service api-server --tail 100

# ai-service 로그 확인
railway logs --service ai-service --tail 100
```

### 주요 에러 패턴
| 에러 | 원인 | 해결 |
|------|------|------|
| `HikariPool timeout` | DB 연결 풀 부족 | `maximum-pool-size` 확인, Supabase 연결 수 확인 |
| `Redis connection refused` | Redis 서비스 다운 | Railway Redis 서비스 재시작 |
| `CORS error` | Vercel 도메인 미등록 | `CORS_ALLOWED_ORIGINS` 업데이트 |
| `401 Unauthorized` | Internal Secret 불일치 | api-server / ai-service 환경변수 동기화 |

---

## 3. DB 데이터 집계 (Supabase SQL Editor)

### 일일 수집 현황
```sql
-- 오늘 수집된 뉴스 건수 (KST 기준)
SELECT
  source_type,
  COUNT(*) AS count
FROM news_article
WHERE created_at >= CURRENT_DATE AT TIME ZONE 'Asia/Seoul'
GROUP BY source_type;
```

### 종목별 뉴스 현황
```sql
-- 최근 7일 종목별 뉴스 건수
SELECT
  s.ticker,
  s.name,
  COUNT(ns.id) AS news_count
FROM stock s
LEFT JOIN news_summary ns ON ns.stock_id = s.id
LEFT JOIN news_article na ON na.id = ns.article_id
WHERE na.created_at >= NOW() - INTERVAL '7 days'
GROUP BY s.ticker, s.name
ORDER BY news_count DESC;
```

### 카테고리 분포
```sql
-- 카테고리별 분포 (최근 30일)
SELECT
  ns.category,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage
FROM news_summary ns
JOIN news_article na ON na.id = ns.article_id
WHERE na.created_at >= NOW() - INTERVAL '30 days'
GROUP BY ns.category
ORDER BY count DESC;
```

---

## 4. 프론트엔드 접속 지표 (Vercel Analytics)

Vercel 대시보드 → **Analytics** 탭에서 확인:
- 일일 페이지뷰 (`/`, `/stocks`, `/register`)
- API 응답시간 (P50, P95)
- 에러 발생률

---

## 5. 1주일 운영 체크리스트

### Day 1 (배포 당일)
- [ ] 모든 서비스 헬스체크 통과
- [ ] n8n 수동 테스트 실행 → 카카오톡 수신 확인
- [ ] 프론트엔드 각 페이지 정상 로드 확인

### Day 2~3
- [ ] n8n 자동 실행 성공 확인 (22:00 UTC)
- [ ] 카카오톡 메시지 07:00~07:10 KST 수신 확인
- [ ] Supabase에 뉴스 데이터 정상 적재 확인

### Day 4~7
- [ ] 카카오 액세스 토큰 만료 여부 모니터링 (6시간 → 갱신 필요)
- [ ] 종목별 뉴스 수집 편차 확인 (0건인 종목 없는지)
- [ ] DB 용량 확인 (Supabase 무료 플랜: 500MB)

---

## 6. 장기 운영 고려사항

| 항목 | 내용 |
|------|------|
| DB 용량 관리 | 30일 이상 된 뉴스 아카이브 또는 삭제 정책 수립 |
| 카카오 토큰 갱신 | n8n 자동 갱신 워크플로우 구성 권장 |
| Railway 비용 | Hobby 플랜 월 $5 크레딧 초과 시 Starter Plan 업그레이드 |
| n8n 실행 수 | Free Plan 월 5,000 실행 제한 → 일일 1회 실행 = 연간 약 365회 (여유 있음) |
