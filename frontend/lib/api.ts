import axios from 'axios';

/**
 * api-server axios 인스턴스
 * 공통 baseURL, 타임아웃, 에러 인터셉터 설정
 */
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_SERVER_URL || 'http://localhost:8080',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 응답 인터셉터: API 에러를 일관된 형태로 변환
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || '서버 오류가 발생했습니다.';
    return Promise.reject(new Error(message));
  }
);

/**
 * ai-service axios 인스턴스 (수동 URL 등록용)
 * 3초 이내 응답 목표 → 타임아웃 8초
 */
const aiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:3001',
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

aiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'AI 서비스 오류가 발생했습니다.';
    return Promise.reject(new Error(message));
  }
);

export { apiClient, aiClient };
