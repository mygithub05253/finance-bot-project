import { create } from 'zustand';
import type { NewsFilter } from '@/types';

/**
 * 뉴스 필터 상태 관리 (Zustand)
 * URL searchParams와 동기화하여 공유 가능한 URL 지원
 */
interface NewsFilterStore {
  filter: NewsFilter;
  setFilter: (filter: Partial<NewsFilter>) => void;
  resetFilter: () => void;
}

const DEFAULT_FILTER: NewsFilter = {
  page: 0,
  size: 20,
};

export const useNewsFilterStore = create<NewsFilterStore>((set) => ({
  filter: DEFAULT_FILTER,

  setFilter: (newFilter) =>
    set((state) => ({
      filter: { ...state.filter, ...newFilter, page: 0 }, // 필터 변경 시 첫 페이지로
    })),

  resetFilter: () => set({ filter: DEFAULT_FILTER }),
}));
