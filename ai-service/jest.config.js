/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // 테스트 파일 위치
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  // 커버리지 수집 대상
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',      // 서버 진입점 제외
    '!src/config/**',   // 설정 파일 제외
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  // 각 테스트 전에 모듈 초기화
  clearMocks: true,
  restoreMocks: true,
};
