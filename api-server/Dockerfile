# Stage 1: Build
FROM gradle:8.9-jdk21-alpine AS builder
WORKDIR /app

# 의존성 캐싱을 위해 gradle 파일 먼저 복사
COPY settings.gradle build.gradle ./
COPY gradle ./gradle
RUN gradle dependencies --no-daemon || true

# 소스 복사 후 빌드
COPY src ./src
RUN gradle build -x test --no-daemon

# Stage 2: Runtime (JRE only — 이미지 크기 최소화)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# 보안: non-root 사용자로 실행
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=prod", "app.jar"]
