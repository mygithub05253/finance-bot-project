require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const { connect: connectRedis, disconnect: disconnectRedis } = require('./config/redis');
const AppError = require('./errors/AppError');

const newsRoutes = require('./routes/news.routes');
const notifyRoutes = require('./routes/notify.routes');

const app = express();

// CORS — 프론트엔드(Next.js)에서 ai-service 직접 호출 허용
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Secret'],
}));

// 미들웨어
app.use(express.json());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-service', env: config.nodeEnv });
});

// API 라우터
app.use('/api/news', newsRoutes);
app.use('/api/notify', notifyRoutes);

// 404 처리
app.use((req, res) => {
  res.status(404).json({ success: false, message: '요청한 경로를 찾을 수 없습니다.' });
});

// 공통 에러 핸들러 (AppError + 일반 Error 모두 처리)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  // axios 에러 (api-server 호출 실패 등)
  if (err.response) {
    const status = err.response.status || 502;
    const message = err.response.data?.message || '내부 서비스 호출 실패';
    return res.status(status).json({ success: false, message });
  }

  console.error('[ERROR]', err);
  return res.status(500).json({ success: false, message: '서버 내부 오류가 발생했습니다.' });
});

const PORT = config.port;

// 서버 시작 시 Redis 연결 초기화 (실패해도 서버는 기동)
const server = app.listen(PORT, async () => {
  console.log(`ai-service 실행 중: http://localhost:${PORT} (${config.nodeEnv})`);
  await connectRedis();
});

// 정상 종료 처리
process.on('SIGTERM', async () => {
  console.log('SIGTERM 수신. 정상 종료 중...');
  await disconnectRedis();
  server.close();
});

module.exports = app;
