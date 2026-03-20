FROM node:20-alpine
WORKDIR /app

# 보안: non-root 사용자로 실행
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 의존성 캐싱 레이어
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 소스 복사
COPY src ./src

# 소유권 변경 후 사용자 전환
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3001

CMD ["node", "src/app.js"]
