import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query 클라이언트 설정
 * - staleTime: 30초 (30초 이내 재요청 시 캐시 반환)
 * - retry: 1회 재시도
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30초
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
