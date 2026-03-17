import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS 클래스를 조건부로 합치는 헬퍼
 * shadcn/ui 컴포넌트에서 사용
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
