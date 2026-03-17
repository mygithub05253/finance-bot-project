'use client';

import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StockFormDialog from './StockFormDialog';
import { useStocks, useDeleteStock } from '@/hooks/useStocks';
import type { Stock } from '@/types';

/**
 * 종목 목록 테이블 컴포넌트
 * 등록/수정/비활성화(소프트 삭제) 기능 포함
 */
export default function StockTable() {
  const { data: stocks, isLoading, isError } = useStocks();
  const deleteStock = useDeleteStock();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Stock | null>(null);

  const handleAdd = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEdit = (stock: Stock) => {
    setEditTarget(stock);
    setDialogOpen(true);
  };

  const handleDelete = async (stock: Stock) => {
    if (!confirm(`'${stock.name}' 종목을 비활성화할까요?`)) return;
    await deleteStock.mutateAsync(stock.id);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-red-500">종목 목록을 불러오는 중 오류가 발생했습니다.</p>;
  }

  return (
    <div>
      {/* 헤더: 종목 수 + 등록 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          활성 종목 <span className="font-medium text-gray-900">{stocks?.length ?? 0}</span>개
        </p>
        <Button size="sm" onClick={handleAdd} className="gap-1">
          <Plus className="h-4 w-4" />
          종목 추가
        </Button>
      </div>

      {/* 테이블 */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">종목코드</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">종목명</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">섹터</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">거래소</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stocks?.map((stock) => (
              <tr key={stock.id} className="bg-white hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-gray-700">{stock.ticker}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{stock.name}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                  {stock.sector ?? '-'}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  {stock.exchange ? (
                    <Badge variant="secondary" className="text-xs">{stock.exchange}</Badge>
                  ) : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(stock)}
                      className="h-8 w-8 text-gray-400 hover:text-blue-600"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(stock)}
                      disabled={deleteStock.isPending}
                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(!stocks || stocks.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                  등록된 관심 종목이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 등록/수정 다이얼로그 */}
      <StockFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTarget={editTarget}
      />
    </div>
  );
}
