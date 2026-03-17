'use client';

import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NewsCard from './NewsCard';
import NewsCardSkeleton from './NewsCardSkeleton';
import { useNewsList } from '@/hooks/useNews';
import { useNewsFilterStore } from '@/store/newsStore';

/**
 * 뉴스 목록 컴포넌트
 * - 필터 상태 구독 → API 조회 → 카드 렌더링
 * - 페이지네이션 포함
 */
export default function NewsList() {
  const { filter, setFilter } = useNewsFilterStore();
  const { data, isLoading, isError } = useNewsList(filter);

  // 로딩 상태: 스켈레톤 6개 표시
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <NewsCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // 에러 상태
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Newspaper className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">뉴스를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  // 빈 결과
  if (!data || data.empty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Newspaper className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">
          {filter.stockId || filter.category ? '필터 조건에 맞는 뉴스가 없습니다.' : '아직 등록된 뉴스가 없습니다.'}
        </p>
      </div>
    );
  }

  const currentPage = data.number;
  const totalPages = data.totalPages;

  return (
    <div className="space-y-6">
      {/* 결과 요약 */}
      <p className="text-sm text-gray-500">
        총 <span className="font-medium text-gray-900">{data.totalElements}</span>건
        {totalPages > 1 && (
          <span>
            {' '}/ {currentPage + 1} 페이지
          </span>
        )}
      </p>

      {/* 뉴스 카드 그리드 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.content.map((news) => (
          <NewsCard key={news.id} news={news} />
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter({ page: currentPage - 1 })}
            disabled={data.first}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <span className="text-sm text-gray-600">
            {currentPage + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter({ page: currentPage + 1 })}
            disabled={data.last}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
