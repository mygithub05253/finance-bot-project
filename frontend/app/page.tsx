import { Suspense } from 'react';
import { Newspaper, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import NewsFilter from '@/components/news/NewsFilter';
import NewsList from '@/components/news/NewsList';
import NewsCardSkeleton from '@/components/news/NewsCardSkeleton';

/**
 * 메인 대시보드 페이지 (뉴스 카드 목록)
 * - Server Component (SEO 목적)
 * - 필터/목록은 Client Component (Zustand + react-query)
 */
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Newspaper className="h-6 w-6 text-blue-600" />
            뉴스 대시보드
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            AI가 수집·분류한 금융 뉴스를 한눈에 확인하세요
          </p>
        </div>
        <Link href="/register">
          <Button size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            URL 등록
          </Button>
        </Link>
      </div>

      {/* 필터 영역 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <NewsFilter />
      </div>

      {/* 뉴스 목록 */}
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <NewsCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <NewsList />
      </Suspense>
    </div>
  );
}
