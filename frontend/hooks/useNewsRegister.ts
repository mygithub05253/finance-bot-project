'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aiClient } from '@/lib/api';
import type { NewsItem } from '@/types';

interface RegisterNewsRequest {
  url: string;
}

/**
 * 수동 URL 등록 훅 (ai-service 호출)
 * 3초 이내 분류 완료 목표
 * 성공 시 news 쿼리 자동 무효화 (대시보드 새로고침)
 */
export function useNewsRegister() {
  const queryClient = useQueryClient();

  return useMutation<NewsItem, Error, RegisterNewsRequest>({
    mutationFn: async ({ url }) => {
      const { data } = await aiClient.post<{ success: boolean; data: NewsItem }>(
        '/api/news/register',
        { url }
      );
      return data.data;
    },
    onSuccess: () => {
      // 대시보드 뉴스 목록 무효화
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });
}
