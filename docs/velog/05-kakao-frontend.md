# [금융 뉴스 큐레이터 #5] 카카오톡 알림 연동 + Next.js 15 대시보드 구현

> **시리즈**: [금융 뉴스 큐레이터] n8n + AI로 나만의 투자 뉴스 아카이브 만들기
> **GitHub**: https://github.com/mygithub05253/finance-bot-project

---

## 들어가며

Week 2에서 AI 파이프라인(Perplexity, Claude, Redis)을 완성했다면, Week 3는 그 결과물을 **눈에 보이게** 만드는 주간이었다. 두 가지 큰 목표가 있었다:

1. **카카오톡 알림**: 매일 아침 수집된 뉴스를 카카오톡으로 받아보기
2. **Next.js 대시보드**: 뉴스 카드 목록, 종목 관리, 수동 URL 등록 UI

그리고 작업 도중 **카카오 API URL 버그**를 발견해 수정하는 과정도 있었다. 이번 포스팅에서는 그 삽질기까지 정직하게 남겨본다.

---

## 1. 카카오톡 알림 — API URL 버그 발견과 수정

### 버그: 친구에게 보내기 vs 나에게 보내기

기존 코드를 보니 이런 URL이 있었다:

```javascript
// 🚨 잘못된 코드 (Week 2에서 작성된 것)
const KAKAO_API_URL = 'https://kapi.kakao.com/v1/api/talk/friends/message/default/send';
```

`friends/message`는 **친구 목록에서 특정인에게 보내는 API**다. 개인 도구이므로 **나에게 보내기**(`memo`) API를 써야 한다. 차이점 정리:

| 항목 | friends/message | memo |
|------|----------------|------|
| 용도 | 카카오 친구에게 전송 | 나 자신에게 전송 |
| URL | `/v1/api/talk/friends/message/default/send` | `/v2/api/talk/memo/default/send` |
| 필수 파라미터 | `receiver_uuids` (수신자 UUID 배열) | 없음 (본인에게만 전송) |
| 권한 | 카카오 친구 목록 접근 스코프 필요 | `talk_message` 스코프만 필요 |

### 수정된 코드

```javascript
// ✅ 올바른 코드
const KAKAO_MEMO_URL = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';

async function sendKakaoMessage(accessToken, messageText) {
  // memo API는 URLSearchParams로 form-urlencoded 직렬화
  const params = new URLSearchParams();
  params.append(
    'template_object',
    JSON.stringify({
      object_type: 'text',
      text: messageText,
      link: {
        web_url: `${config.frontendUrl}/dashboard`,
        mobile_web_url: `${config.frontendUrl}/dashboard`,
      },
    })
  );

  try {
    await axios.post(KAKAO_MEMO_URL, params, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  } catch (error) {
    // 카카오 API 에러 응답 파싱 (code, msg 필드)
    const kakaoError = error.response?.data;
    if (kakaoError) {
      throw new Error(`카카오 API 오류 [${kakaoError.code}]: ${kakaoError.msg}`);
    }
    throw error;
  }
}
```

주요 변경점:
- `receiver_uuids` 파라미터 제거
- `URLSearchParams`로 form-urlencoded 직렬화 명시
- 카카오 에러 응답 파싱 (`code`, `msg` 필드)
- 요약 80자 초과 시 자동 말줄임표 처리 (1,000자 제한 대응)

### 테스트 코드

버그 수정이다 보니 테스트가 특히 중요했다. 13개 케이스를 작성해서 100% 커버리지를 달성했다:

```javascript
test('올바른 URL로 POST 요청 전송 (나에게 보내기 memo API)', async () => {
  axios.post.mockResolvedValueOnce({ data: { result_code: 0 } });
  await sendKakaoMessage(ACCESS_TOKEN, MESSAGE);

  const [url] = axios.post.mock.calls[0];
  expect(url).toBe('https://kapi.kakao.com/v2/api/talk/memo/default/send');
  expect(url).not.toContain('friends'); // 친구 API 아닌지 명시적 검증
});

test('receiver_uuids 파라미터 미포함', async () => {
  axios.post.mockResolvedValueOnce({ data: { result_code: 0 } });
  await sendKakaoMessage(ACCESS_TOKEN, MESSAGE);

  const [, body] = axios.post.mock.calls[0];
  expect(body.toString()).not.toContain('receiver_uuids');
});
```

---

## 2. api-server News CRUD — DB 테이블은 있는데 Java 코드가 없다?

Week 2에서 Flyway V1 마이그레이션으로 `news_article`, `news_summary` 테이블은 이미 만들었다. 하지만 Java 엔티티 코드가 없었다. Week 3에서 구현했다.

### 엔티티 설계 포인트

**keywords 컬럼은 JSONB**다. Spring Boot 3.x(Hibernate 6)에서 JSONB를 다루는 방법은 크게 두 가지인데:

```java
// 방법 1: hypersistence-utils (build.gradle에 이미 포함)
@Type(JsonType.class)
@Column(columnDefinition = "jsonb")
private List<String> keywords;

// 방법 2: Hibernate 6 네이티브 @JdbcTypeCode
@JdbcTypeCode(SqlTypes.JSON)
private List<String> keywords;
```

hypersistence-utils가 이미 의존성에 있었으므로 방법 1을 선택했다. DDL은 Flyway가 관리하고, JPA는 읽기/쓰기만 담당한다.

### 내부 API 인증

ai-service → api-server 통신은 `X-Internal-Secret` 헤더로 보호한다:

```java
@PostMapping
public ResponseEntity<ApiResponse<NewsResponse>> createNews(
    @RequestHeader(value = "X-Internal-Secret", required = false) String secret,
    @Valid @RequestBody NewsCreateRequest request) {

  if (!internalSecret.equals(secret)) {
    throw BusinessException.badRequest("유효하지 않은 내부 인증 헤더입니다.");
  }

  return ResponseEntity.status(HttpStatus.CREATED)
      .body(ApiResponse.success("뉴스가 저장되었습니다.", newsService.createNews(request)));
}
```

`application.yml`에 환경변수로:
```yaml
internal:
  secret: ${INTERNAL_API_SECRET:dev-secret}
```

---

## 3. Next.js 15 기반 설정 — App Router에서 클라이언트/서버 컴포넌트 분리 전략

### 설치한 패키지

```bash
npm install zustand @tanstack/react-query axios react-hook-form zod @hookform/resolvers
npm install class-variance-authority clsx tailwind-merge lucide-react @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-select
```

shadcn/ui CLI 대신 **핵심 컴포넌트를 직접 구현**했다. 이유는 Tailwind v4 호환성 때문이었는데, 덕분에 각 컴포넌트 동작을 완전히 이해하게 되었다.

### 클라이언트/서버 컴포넌트 분리 기준

```
app/layout.tsx           ← Server Component (HTML 쉘)
  └── Providers.tsx      ← 'use client' (QueryClientProvider)
       └── Header.tsx    ← Server Component (정적 링크)
            └── page.tsx ← Server Component (Suspense 경계)
                 └── NewsList.tsx    ← 'use client' (useQuery)
                 └── NewsFilter.tsx  ← 'use client' (Zustand + useQuery)
```

**판단 기준**: 인터랙션(클릭, 상태 변경), 브라우저 API, React 훅 사용 → Client Component로 분리.

### Zustand + TanStack Query 역할 분리

```typescript
// Zustand: 필터 상태 (클라이언트 UI 상태)
const { filter, setFilter } = useNewsFilterStore();

// TanStack Query: 서버 데이터 (API 응답 캐싱)
const { data, isLoading } = useNewsList(filter);
// → filter가 변경되면 queryKey가 변경 → 자동 재조회
```

---

## 4. 뉴스 대시보드 — 감성 분석 컬러 코딩과 스켈레톤 UX

### NewsCard 컴포넌트

감성(POSITIVE/NEUTRAL/NEGATIVE)에 따라 배지 색상을 다르게 처리했다:

```typescript
// components/ui/badge.tsx의 variant 확장
const badgeVariants = cva('...', {
  variants: {
    variant: {
      positive: 'border-transparent bg-green-50 text-green-700',
      neutral: 'border-transparent bg-gray-50 text-gray-600',
      negative: 'border-transparent bg-red-50 text-red-600',
    }
  }
});

// NewsCard에서 사용
function getSentimentVariant(sentiment: Sentiment | null) {
  switch (sentiment) {
    case 'POSITIVE': return 'positive';
    case 'NEGATIVE': return 'negative';
    default: return 'neutral';
  }
}
```

### 스켈레톤 로딩

`animate-pulse`로 구현한 스켈레톤을 Suspense fallback에 활용:

```tsx
// app/page.tsx
<Suspense
  fallback={
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <NewsCardSkeleton key={i} />
      ))}
    </div>
  }
>
  <NewsList />
</Suspense>
```

---

## 5. 수동 URL 등록 — 3초 이내 목표 달성하기

PRD에서 정한 KPI: **URL 입력 후 3초 이내 분류 완료**.

### ai-service 타임아웃 설정

```typescript
// lib/api.ts
const aiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AI_SERVICE_URL,
  timeout: 8000, // 3초 목표, 최대 8초
});
```

### 로딩 UX

```tsx
{isPending && (
  <div className="flex flex-col items-center py-10 text-gray-500 gap-3">
    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    <p className="text-sm">Claude AI가 뉴스를 분석 중입니다…</p>
    <p className="text-xs text-gray-400">종목 분류 · 감성 분석 · 요약 생성</p>
  </div>
)}
```

분석 완료 후 결과 카드를 즉시 표시한다. **성공 후 쿼리 무효화**도 빠뜨리지 않았다:

```typescript
// hooks/useNewsRegister.ts
useMutation({
  onSuccess: () => {
    // 대시보드 뉴스 목록 자동 갱신
    queryClient.invalidateQueries({ queryKey: ['news'] });
  },
});
```

---

## 트러블슈팅: N+1 쿼리 주의

`getNewsList`에서 페이지 단위로 NewsArticle을 조회한 뒤, 각 Article에 대해 NewsSummary를 개별 조회하는 N+1 문제가 있다:

```java
// 현재 코드 (N+1 발생)
return newsArticleRepository
    .findAllWithFilter(...)
    .map(article -> {
        NewsSummary summary = newsSummaryRepository.findByArticle(article).orElse(null);
        return NewsResponse.from(article, summary);
    });
```

Week 4에서 `JOIN FETCH` 또는 별도 `IN` 쿼리로 최적화할 예정이다. 현재는 데이터 건수가 적어 성능 문제 없음.

---

## 마치며

Week 3에서 완성된 것들:
- ✅ 카카오톡 나에게 보내기 API (버그 수정 + 테스트 13개)
- ✅ api-server News CRUD (NewsArticle + NewsSummary + 내부 인증)
- ✅ Next.js 15 기반 설정 (shadcn/ui 스타일, Zustand, TanStack Query)
- ✅ 뉴스 대시보드 (카드, 필터, 스켈레톤, 상세 페이지)
- ✅ 종목 관리 + 수동 URL 등록 UI

다음 Week 4에서는 드디어 **실제 배포**다:
- Railway에 api-server + ai-service + Redis 배포
- Supabase 프로덕션 DB 연결
- Vercel에 Next.js 배포
- n8n Cloud 워크플로우 임포트 및 실제 07:00 KST 수집 검증

> 전체 코드: https://github.com/mygithub05253/finance-bot-project

---

**태그:** `#카카오API` `#Nextjs15` `#Zustand` `#AppRouter` `#금융자동화` `#TanStackQuery` `#SpringBoot`
