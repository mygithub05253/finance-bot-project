/**
 * 공통 타입 정의
 * api-server 응답 구조와 1:1 매핑
 */

// ─────────────────────────────────────────────
// 공통 API 응답 래퍼 (ApiResponse<T>)
// ─────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
}

// 페이지네이션 응답 (Spring Data Page<T>)
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;       // 현재 페이지 (0부터 시작)
  size: number;
  last: boolean;
  first: boolean;
  empty: boolean;
}

// ─────────────────────────────────────────────
// 관심 종목 (Stock)
// ─────────────────────────────────────────────
export interface Stock {
  id: number;
  ticker: string;
  name: string;
  sector: string | null;
  exchange: 'KOSPI' | 'KOSDAQ' | 'NASDAQ' | 'NYSE' | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockCreateRequest {
  ticker: string;
  name: string;
  sector?: string;
  exchange?: Stock['exchange'];
}

export interface StockUpdateRequest {
  name?: string;
  sector?: string;
  exchange?: Stock['exchange'];
}

// ─────────────────────────────────────────────
// 뉴스 (NewsArticle + NewsSummary)
// ─────────────────────────────────────────────
export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
export type SourceType = 'AUTO' | 'MANUAL';

export interface NewsItem {
  // 원문 정보
  id: number;
  title: string;
  url: string;
  contentSnippet: string | null;
  sourceType: SourceType;
  publishedAt: string | null;

  // AI 분석 결과
  summaryId: number | null;
  stockId: number | null;
  stockName: string | null;
  stockTicker: string | null;
  summary: string | null;
  category: string | null;
  sentiment: Sentiment | null;
  keywords: string[] | null;

  createdAt: string;
}

// 수동 URL 등록 요청 (ai-service로 전달)
export interface NewsRegisterRequest {
  url: string;
}

// 뉴스 목록 필터 파라미터
export interface NewsFilter {
  stockId?: number;
  category?: string;
  fromDate?: string;
  page?: number;
  size?: number;
}

// ─────────────────────────────────────────────
// 감성 분석 색상 맵
// ─────────────────────────────────────────────
export const SENTIMENT_COLOR: Record<Sentiment, string> = {
  POSITIVE: 'text-green-600 bg-green-50',
  NEUTRAL: 'text-gray-600 bg-gray-50',
  NEGATIVE: 'text-red-600 bg-red-50',
};

export const SENTIMENT_LABEL: Record<Sentiment, string> = {
  POSITIVE: '긍정',
  NEUTRAL: '중립',
  NEGATIVE: '부정',
};
