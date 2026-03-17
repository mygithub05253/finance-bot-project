import Link from 'next/link';
import { BarChart2 } from 'lucide-react';

/**
 * 사이트 헤더 컴포넌트
 * Server Component (링크 네비게이션, 정적 요소만 포함)
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="flex h-14 items-center gap-4 px-6">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <BarChart2 className="h-5 w-5 text-blue-600" />
          <span>금융 뉴스 봇</span>
        </Link>

        {/* 네비게이션 */}
        <nav className="ml-6 flex items-center gap-1">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            대시보드
          </Link>
          <Link
            href="/stocks"
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            종목 관리
          </Link>
          <Link
            href="/register"
            className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            URL 등록
          </Link>
        </nav>
      </div>
    </header>
  );
}
