'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

/**
 * 클라이언트 사이드 Provider 래퍼
 * - TanStack Query: 서버 상태 관리
 * layout.tsx에서 children을 감싸기 위해 분리
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
