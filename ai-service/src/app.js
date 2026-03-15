require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const config = require('./config');

const newsRoutes = require('./routes/news.routes');
const notifyRoutes = require('./routes/notify.routes');

const app = express();

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

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('예상치 못한 오류:', err);
  res.status(500).json({ success: false, message: '서버 내부 오류가 발생했습니다.' });
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`ai-service 실행 중: http://localhost:${PORT} (${config.nodeEnv})`);
});

module.exports = app;
