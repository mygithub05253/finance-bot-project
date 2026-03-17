import { TrendingUp } from 'lucide-react';
import StockTable from '@/components/stock/StockTable';

/**
 * 종목 관리 페이지
 * - 활성 종목 목록 + 등록/수정/비활성화
 */
export default function StocksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          관심 종목 관리
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          매일 아침 자동 수집 대상 종목을 관리합니다. 변경 사항은 다음 날부터 반영됩니다.
        </p>
      </div>

      <StockTable />
    </div>
  );
}
