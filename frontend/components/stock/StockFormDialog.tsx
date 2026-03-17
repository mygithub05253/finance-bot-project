'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateStock, useUpdateStock } from '@/hooks/useStocks';
import type { Stock } from '@/types';

const EXCHANGES = ['KOSPI', 'KOSDAQ', 'NASDAQ', 'NYSE'] as const;

// 폼 Zod 스키마
const stockSchema = z.object({
  ticker: z.string().min(1, '종목코드를 입력해주세요.').max(20),
  name: z.string().min(1, '종목명을 입력해주세요.').max(100),
  sector: z.string().max(50).optional(),
  exchange: z.enum(EXCHANGES).optional(),
});

type StockFormValues = z.infer<typeof stockSchema>;

interface StockFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTarget?: Stock | null; // null이면 신규 등록, Stock이면 수정
}

/**
 * 종목 등록/수정 다이얼로그
 * React Hook Form + Zod 검증
 */
export default function StockFormDialog({ open, onOpenChange, editTarget }: StockFormDialogProps) {
  const isEdit = !!editTarget;
  const createStock = useCreateStock();
  const updateStock = useUpdateStock();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockFormValues>({
    resolver: zodResolver(stockSchema),
  });

  // 수정 모드: 기존 값 채우기
  useEffect(() => {
    if (editTarget) {
      reset({
        ticker: editTarget.ticker,
        name: editTarget.name,
        sector: editTarget.sector ?? '',
        exchange: editTarget.exchange ?? undefined,
      });
    } else {
      reset({ ticker: '', name: '', sector: '', exchange: undefined });
    }
  }, [editTarget, reset]);

  const onSubmit = async (values: StockFormValues) => {
    try {
      if (isEdit && editTarget) {
        await updateStock.mutateAsync({
          id: editTarget.id,
          request: { name: values.name, sector: values.sector, exchange: values.exchange },
        });
      } else {
        await createStock.mutateAsync(values);
      }
      onOpenChange(false);
    } catch {
      // 에러는 mutation 에러 상태로 처리
    }
  };

  const mutationError = isEdit ? updateStock.error : createStock.error;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {isEdit ? '종목 수정' : '종목 등록'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="rounded-md p-1 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* 종목코드 (수정 시 비활성화) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종목코드 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="예: 005930 / NVDA"
                disabled={isEdit}
                {...register('ticker')}
              />
              {errors.ticker && (
                <p className="mt-1 text-xs text-red-500">{errors.ticker.message}</p>
              )}
            </div>

            {/* 종목명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종목명 <span className="text-red-500">*</span>
              </label>
              <Input placeholder="예: 삼성전자 / NVIDIA" {...register('name')} />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* 섹터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">섹터</label>
              <Input placeholder="예: 반도체 / IT" {...register('sector')} />
            </div>

            {/* 거래소 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">거래소</label>
              <Select
                value={watch('exchange') ?? ''}
                onValueChange={(v) => setValue('exchange', v as Stock['exchange'] ?? undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="선택 안함" />
                </SelectTrigger>
                <SelectContent>
                  {EXCHANGES.map((ex) => (
                    <SelectItem key={ex} value={ex}>{ex}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* API 에러 */}
            {mutationError && (
              <p className="text-sm text-red-500 bg-red-50 rounded p-2">
                {mutationError.message}
              </p>
            )}

            {/* 제출 */}
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">취소</Button>
              </Dialog.Close>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '저장 중…' : isEdit ? '수정' : '등록'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
