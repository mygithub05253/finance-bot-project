'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, NewsFilter, NewsItem, PageResponse } from '@/types';

/**
 * 뉴스 목록 조회 훅 (TanStack Query)
 * - 필터(stockId, category, fromDate)가 변경되면 자동 재조회
 */
export function useNewsList(filter: NewsFilter) {
  return useQuery({
    queryKey: ['news', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filter.stockId) params.set('stockId', String(filter.stockId));
      if (filter.category) params.set('category', filter.category);
      if (filter.fromDate) params.set('fromDate', filter.fromDate);
      params.set('page', String(filter.page ?? 0));
      params.set('size', String(filter.size ?? 20));

      const { data } = await apiClient.get<ApiResponse<PageResponse<NewsItem>>>(
        `/api/v1/news?${params.toString()}`
      );
      return data.data;
    },
  });
}

/**
 * 뉴스 단건 조회 훅
 */
export function useNewsDetail(id: number) {
  return useQuery({
    queryKey: ['news', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<NewsItem>>(`/api/v1/news/${id}`);
      return data.data;
    },
  });
}
