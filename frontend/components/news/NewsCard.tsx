import Link from 'next/link';
import { ExternalLink, Calendar, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { NewsItem, Sentiment } from '@/types';
import { SENTIMENT_LABEL } from '@/types';

interface NewsCardProps {
  news: NewsItem;
}

/** 감성 분석 → Badge variant 매핑 */
function getSentimentVariant(sentiment: Sentiment | null) {
  switch (sentiment) {
    case 'POSITIVE':
      return 'positive' as const;
    case 'NEGATIVE':
      return 'negative' as const;
    default:
      return 'neutral' as const;
  }
}

/** 날짜 문자열 → 한국어 형식으로 변환 */
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * 뉴스 카드 컴포넌트
 * 뉴스 제목, 종목, 카테고리, 감성, 요약, 날짜를 카드 형태로 표시
 */
export default function NewsCard({ news }: NewsCardProps) {
  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* 상단: 종목 + 카테고리 + 감성 */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {news.stockTicker && (
            <Badge variant="default" className="text-xs">
              {news.stockName} ({news.stockTicker})
            </Badge>
          )}
          {news.category && (
            <Badge variant="outline" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {news.category}
            </Badge>
          )}
          {news.sentiment && (
            <Badge variant={getSentimentVariant(news.sentiment)} className="text-xs">
              {SENTIMENT_LABEL[news.sentiment]}
            </Badge>
          )}
          <Badge
            variant={news.sourceType === 'AUTO' ? 'secondary' : 'outline'}
            className="text-xs ml-auto"
          >
            {news.sourceType === 'AUTO' ? '자동' : '수동'}
          </Badge>
        </div>

        {/* 제목 (클릭 → 상세 페이지) */}
        <Link href={`/news/${news.id}`}>
          <h3 className="font-semibold text-gray-900 leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
            {news.title}
          </h3>
        </Link>

        {/* AI 요약 */}
        {news.summary && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{news.summary}</p>
        )}

        {/* 키워드 태그 */}
        {news.keywords && news.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {news.keywords.slice(0, 4).map((keyword) => (
              <span
                key={keyword}
                className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5"
              >
                {keyword}
              </span>
            ))}
          </div>
        )}

        {/* 하단: 날짜 + 원문 링크 */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(news.createdAt)}
          </span>
          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            원문 보기
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
