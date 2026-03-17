'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNewsRegister } from '@/hooks/useNewsRegister';
import type { NewsItem, Sentiment } from '@/types';
import { SENTIMENT_LABEL } from '@/types';

// URL 검증 스키마
const registerSchema = z.object({
  url: z.string().url('유효한 URL을 입력해주세요. (https://...)'),
});
type RegisterFormValues = z.infer<typeof registerSchema>;

function getSentimentVariant(s: Sentiment | null) {
  if (s === 'POSITIVE') return 'positive' as const;
  if (s === 'NEGATIVE') return 'negative' as const;
  return 'neutral' as const;
}

/**
 * 수동 URL 등록 페이지
 * - URL 입력 → ai-service 클로드 분류/요약 (3초 이내 목표)
 * - 결과 카드 즉시 표시
 */
export default function RegisterPage() {
  const [result, setResult] = useState<NewsItem | null>(null);
  const { mutateAsync: registerNews, isPending, error, reset: resetMutation } = useNewsRegister();

  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setResult(null);
    resetMutation();
    const news = await registerNews({ url: values.url });
    setResult(news);
  };

  const handleReset = () => {
    setResult(null);
    resetMutation();
    resetForm();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 페이지 헤더 */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Link2 className="h-6 w-6 text-blue-600" />
          뉴스 URL 등록
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          관심 있는 뉴스 URL을 붙여넣으면 Claude AI가 자동으로 분류·요약합니다. (3초 이내 목표)
        </p>
      </div>

      {/* URL 입력 폼 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">URL 입력</CardTitle>
          <CardDescription>네이버 뉴스, 한국경제, 매일경제 등 뉴스 기사 URL을 입력하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
            <div className="flex-1">
              <Input
                type="url"
                placeholder="https://news.example.com/article/..."
                disabled={isPending}
                className="w-full"
                {...register('url')}
              />
              {errors.url && (
                <p className="mt-1 text-xs text-red-500">{errors.url.message}</p>
              )}
            </div>
            <Button type="submit" disabled={isPending} className="shrink-0">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  분석 중…
                </>
              ) : (
                '분석 시작'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 분석 중 진행 상태 */}
      {isPending && (
        <div className="flex flex-col items-center py-10 text-gray-500 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm">Claude AI가 뉴스를 분석 중입니다…</p>
          <p className="text-xs text-gray-400">종목 분류 · 감성 분석 · 요약 생성</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && !isPending && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2 text-red-600">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">분석 실패</p>
                <p className="text-xs mt-0.5">{error.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 분석 결과 카드 */}
      {result && !isPending && (
        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">분석 완료 · 아카이브 저장됨</span>
            </div>
            {/* 배지 */}
            <div className="flex flex-wrap gap-2">
              {result.stockTicker && (
                <Badge variant="default">
                  {result.stockName} ({result.stockTicker})
                </Badge>
              )}
              {result.category && (
                <Badge variant="outline">{result.category}</Badge>
              )}
              {result.sentiment && (
                <Badge variant={getSentimentVariant(result.sentiment)}>
                  {SENTIMENT_LABEL[result.sentiment]}
                </Badge>
              )}
            </div>
            <CardTitle className="text-base mt-2">{result.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* AI 요약 */}
            {result.summary && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">AI 요약</p>
                <p className="text-sm text-gray-700 bg-blue-50 rounded p-3 leading-relaxed">
                  {result.summary}
                </p>
              </div>
            )}

            {/* 키워드 */}
            {result.keywords && result.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {result.keywords.map((kw) => (
                  <span key={kw} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5">
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {/* 액션 */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                원문 보기 →
              </a>
              <Button variant="outline" size="sm" onClick={handleReset}>
                다른 URL 등록
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
