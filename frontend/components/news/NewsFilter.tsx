'use client';

import { useQuery } from '@tanstack/react-query';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiClient } from '@/lib/api';
import { useNewsFilterStore } from '@/store/newsStore';
import type { ApiResponse, Stock } from '@/types';

const CATEGORIES = ['실적', '규제', 'M&A', '인사', '기타'];

/**
 * 뉴스 목록 필터 컴포넌트
 * - 종목 선택, 카테고리 선택, 필터 초기화
 * - Client Component (Zustand + react-query)
 */
export default function NewsFilter() {
  const { filter, setFilter, resetFilter } = useNewsFilterStore();

  // 활성 종목 목록 조회 (종목 드롭다운용)
  const { data: stocksData } = useQuery({
    queryKey: ['stocks'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Stock[]>>('/api/v1/stocks');
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });

  const stocks = stocksData ?? [];
  const hasFilter = filter.stockId || filter.category;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Filter className="h-4 w-4 text-gray-400" />

      {/* 종목 필터 */}
      <Select
        value={filter.stockId ? String(filter.stockId) : 'all'}
        onValueChange={(value) =>
          setFilter({ stockId: value === 'all' ? undefined : Number(value) })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="전체 종목" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 종목</SelectItem>
          {stocks.map((stock) => (
            <SelectItem key={stock.id} value={String(stock.id)}>
              {stock.name} ({stock.ticker})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 카테고리 필터 */}
      <Select
        value={filter.category ?? 'all'}
        onValueChange={(value) => setFilter({ category: value === 'all' ? undefined : value })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="전체 카테고리" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 필터 초기화 */}
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={resetFilter} className="text-gray-500">
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          초기화
        </Button>
      )}
    </div>
  );
}
