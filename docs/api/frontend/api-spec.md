# Frontend API 연동 명세

---

## 메타
| 항목 | 내용 |
|------|------|
| **버전** | v1.0 |
| **작성일** | 2026-03-15 |
| **상태** | 초안 |
| **서비스** | Next.js 15 (App Router) |

### 변경 이력
| 버전 | 날짜 | 내용 |
|------|------|------|
| v1.0 | 2026-03-15 | 초안 작성 |

---

## 환경변수
```
NEXT_PUBLIC_API_URL=https://api-financebot.railway.app    # api-server
NEXT_PUBLIC_AI_SERVICE_URL=https://ai-financebot.railway.app  # ai-service
```

> **주의**: API 키 등 비밀 값에 `NEXT_PUBLIC_` 접두사 사용 금지 (클라이언트 노출)

---

## API 클라이언트 설정

```typescript
// src/lib/api-client.ts
// api-server 클라이언트
export const apiClient = {
  baseURL: process.env.NEXT_PUBLIC_API_URL,
};

// ai-service 클라이언트
export const aiClient = {
  baseURL: process.env.NEXT_PUBLIC_AI_SERVICE_URL,
};
```

---

## 페이지별 API 연동

### 1. 대시보드 홈 (`/`)

**렌더링 방식**: Server Component (SSR)

**사용 API:**
| 메서드 | 엔드포인트 | 용도 |
|--------|-----------|------|
| GET | `/api/v1/news` | 뉴스 목록 (최신순, 기본 20건) |
| GET | `/api/v1/stocks` | 종목 필터 드롭다운 목록 |

**Query Parameters:**
```
/api/v1/news?page=0&size=20
/api/v1/news?stockId={id}&date={yyyy-MM-dd}&category={카테고리}
```

**컴포넌트 데이터 흐름:**
```
Page (Server Component)
  → fetchNews() → /api/v1/news
  → fetchStocks() → /api/v1/stocks
  → <NewsFilterBar stocks={stocks} /> (Client Component)
  → <NewsCardGrid news={news} />
  → <Pagination totalPages={totalPages} />
```

---

### 2. 뉴스 상세 (`/news/[id]`)

**렌더링 방식**: Server Component (SSR)

**사용 API:**
| 메서드 | 엔드포인트 | 용도 |
|--------|-----------|------|
| GET | `/api/v1/news/{id}` | 뉴스 상세 정보 |

---

### 3. 종목 관리 (`/stocks`)

**렌더링 방식**: Client Component (CSR) - CRUD 인터랙션

**사용 API:**
| 메서드 | 엔드포인트 | 용도 |
|--------|-----------|------|
| GET | `/api/v1/stocks` | 종목 목록 조회 |
| POST | `/api/v1/stocks` | 종목 등록 |
| PUT | `/api/v1/stocks/{id}` | 종목 수정 |
| DELETE | `/api/v1/stocks/{id}` | 종목 삭제 |

**상태 관리**: Zustand `useStockStore`

```typescript
// src/store/stockStore.ts
interface StockStore {
  stocks: Stock[];
  fetchStocks: () => Promise<void>;
  addStock: (data: StockCreateRequest) => Promise<void>;
  updateStock: (id: number, data: StockUpdateRequest) => Promise<void>;
  deleteStock: (id: number) => Promise<void>;
}
```

---

### 4. 수동 뉴스 등록 (`/news/register`)

**렌더링 방식**: Client Component (CSR)

**사용 API:**
| 메서드 | 엔드포인트 | 용도 |
|--------|-----------|------|
| POST | `/ai/v1/news/register` | URL 입력 → AI 분류/요약 |

**Form 스키마 (Zod):**
```typescript
const registerSchema = z.object({
  url: z.string().url('유효한 URL을 입력해주세요.'),
});
```

**UX 플로우:**
```
URL 입력 → 로딩 스피너 (처리 중, 최대 3초)
  → 성공: 분류 결과 미리보기 카드 표시 + 저장 확인
  → 실패 (DUPLICATE_URL): "이미 등록된 URL" 토스트
  → 실패 (CRAWL_FAILED): "페이지 크롤링 실패" 토스트
```

---

### 5. 발송 이력 (`/notifications`)

**렌더링 방식**: Server Component (SSR)

**사용 API:**
| 메서드 | 엔드포인트 | 용도 |
|--------|-----------|------|
| GET | `/api/v1/notifications` | 발송 이력 목록 |

---

## 공통 타입 정의

```typescript
// src/types/news.ts
export interface NewsArticle {
  id: number;
  title: string;
  url: string;
  sourceType: 'AUTO' | 'MANUAL';
  publishedAt: string;
  summary?: NewsSummary;
}

export interface NewsSummary {
  id: number;
  stockId: number | null;
  stockName: string | null;
  ticker: string | null;
  summary: string;
  category: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  keywords: string[];
}

// src/types/stock.ts
export interface Stock {
  id: number;
  ticker: string;
  name: string;
  sector: string | null;
  exchange: string | null;
  isActive: boolean;
}
```

---

## 에러 처리 패턴

```typescript
// src/lib/fetch-wrapper.ts

// Server Component에서
async function fetchNews(): Promise<NewsArticle[]> {
  const res = await fetch(`${API_URL}/api/v1/news`);
  if (!res.ok) {
    // Next.js error.tsx로 전파
    throw new Error('뉴스 목록을 불러올 수 없습니다.');
  }
  const json = await res.json();
  return json.data.content;
}

// Client Component에서 (Zustand)
try {
  await apiClient.post('/api/v1/stocks', data);
} catch (err) {
  toast.error('종목 등록에 실패했습니다.');
}
```
