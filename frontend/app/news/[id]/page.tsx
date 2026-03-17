'use client';

import { ArrowLeft, ExternalLink, Calendar, Tag } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNewsDetail } from '@/hooks/useNews';
import { SENTIMENT_LABEL } from '@/types';
import type { Sentiment } from '@/types';

function getSentimentVariant(sentiment: Sentiment | null) {
  switch (sentiment) {
    case 'POSITIVE': return 'positive' as const;
    case 'NEGATIVE': return 'negative' as const;
    default: return 'neutral' as const;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * 뉴스 상세 페이지
 * Client Component: useNewsDetail 훅으로 단건 조회
 */
export default function NewsDetailPage({ params }: { params: { id: string } }) {
  const { data: news, isLoading, isError } = useNewsDetail(Number(params.id));

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-6 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-3 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !news) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16 text-gray-400">
        <p>뉴스를 찾을 수 없습니다.</p>
        <Link href="/">
          <Button variant="outline" className="mt-4">대시보드로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 뒤로 가기 */}
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        대시보드로 돌아가기
      </Link>

      {/* 뉴스 원문 카드 */}
      <Card>
        <CardHeader className="pb-3">
          {/* 배지 */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {news.stockTicker && (
              <Badge variant="default">
                {news.stockName} ({news.stockTicker})
              </Badge>
            )}
            {news.category && (
              <Badge variant="outline">
                <Tag className="h-3 w-3 mr-1" />
                {news.category}
              </Badge>
            )}
            {news.sentiment && (
              <Badge variant={getSentimentVariant(news.sentiment)}>
                {SENTIMENT_LABEL[news.sentiment]}
              </Badge>
            )}
            <Badge variant={news.sourceType === 'AUTO' ? 'secondary' : 'outline'} className="ml-auto">
              {news.sourceType === 'AUTO' ? '자동 수집' : '수동 등록'}
            </Badge>
          </div>

          {/* 제목 */}
          <CardTitle className="text-xl leading-snug">{news.title}</CardTitle>

          {/* 날짜 */}
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
            <Calendar className="h-3 w-3" />
            {formatDate(news.createdAt)}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* AI 요약 */}
          {news.summary && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📝 AI 요약</h3>
              <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 rounded-lg p-4">
                {news.summary}
              </p>
            </div>
          )}

          {/* 키워드 */}
          {news.keywords && news.keywords.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">🔑 키워드</h3>
              <div className="flex flex-wrap gap-2">
                {news.keywords.map((kw) => (
                  <span key={kw} className="text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 원문 스니펫 */}
          {news.contentSnippet && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">📄 원문 발췌</h3>
              <p className="text-sm text-gray-600 leading-relaxed border-l-2 border-gray-200 pl-4">
                {news.contentSnippet}
              </p>
            </div>
          )}

          {/* 원문 링크 */}
          <div className="pt-2 border-t border-gray-100">
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-4 w-4" />
              원문 기사 보기
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
