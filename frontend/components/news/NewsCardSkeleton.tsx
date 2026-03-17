import { Card, CardContent } from '@/components/ui/card';

/**
 * 뉴스 카드 로딩 스켈레톤
 * 데이터 로딩 중 표시되는 placeholder
 */
export default function NewsCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        {/* 배지 스켈레톤 */}
        <div className="flex gap-2 mb-3">
          <div className="h-5 w-24 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-5 w-10 bg-gray-200 rounded-full animate-pulse ml-auto" />
        </div>
        {/* 제목 스켈레톤 */}
        <div className="space-y-2 mb-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        </div>
        {/* 요약 스켈레톤 */}
        <div className="space-y-1.5 mb-3">
          <div className="h-3 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-5/6 bg-gray-100 rounded animate-pulse" />
        </div>
        {/* 키워드 스켈레톤 */}
        <div className="flex gap-1 mb-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-5 w-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
        {/* 하단 스켈레톤 */}
        <div className="flex justify-between">
          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
          <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
