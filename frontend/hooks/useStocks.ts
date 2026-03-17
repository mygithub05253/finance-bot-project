'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { ApiResponse, Stock, StockCreateRequest, StockUpdateRequest } from '@/types';

/**
 * 활성 종목 목록 조회 훅
 */
export function useStocks() {
  return useQuery({
    queryKey: ['stocks'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Stock[]>>('/api/v1/stocks');
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });
}

/**
 * 종목 등록 훅
 * 성공 시 stocks 쿼리 자동 무효화
 */
export function useCreateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: StockCreateRequest) => {
      const { data } = await apiClient.post<ApiResponse<Stock>>('/api/v1/stocks', request);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
  });
}

/**
 * 종목 수정 훅
 */
export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, request }: { id: number; request: StockUpdateRequest }) => {
      const { data } = await apiClient.put<ApiResponse<Stock>>(`/api/v1/stocks/${id}`, request);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
  });
}

/**
 * 종목 비활성화(삭제) 훅
 */
export function useDeleteStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/api/v1/stocks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
  });
}
