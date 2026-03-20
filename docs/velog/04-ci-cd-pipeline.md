# [금융 뉴스 큐레이터 #4] GitHub Actions CI 구축 삽질기 — 멀티모듈 빌드 + Gradle Wrapper + Flyway

> **시리즈**: [금융 뉴스 큐레이터] n8n + AI로 나만의 투자 뉴스 아카이브 만들기
> **GitHub**: https://github.com/mygithub05253/finance-bot-project

---

## 들어가며

Week 1에서 코드를 작성하고 GitHub에 처음 Push하는 순간, CI가 바로 실패했다. 단순히 "빌드가 안 된다"가 아니라 **세 가지 다른 이유로 세 번** 실패했다.

이번 편에서는 그 삽질기를 기록한다. 모노레포(멀티모듈) 프로젝트에서 GitHub Actions를 처음 설정할 때 겪는 문제들인데, 구글링해도 명쾌하게 나오지 않아서 시간을 많이 잡아먹었다.

---

## 1. CI 설계 — 멀티모듈 레포에서 독립 빌드 구조

이 프로젝트는 단일 레포 안에 세 개의 독립적인 서비스가 존재한다:

```
finance-bot-project/
├── api-server/     (Java 17 + Spring Boot + Gradle)
├── ai-service/     (Node.js 20 + Express + Jest)
├── frontend/       (Node.js 20 + Next.js 15)
└── infra/          (Docker Compose)
```

각 서비스마다 런타임이 다르기 때문에 **하나의 job**에서 모두 처리하면 설정이 복잡해진다. GitHub Actions의 `jobs` 병렬 실행 기능을 활용해서 세 개의 job을 독립적으로 설계했다.

```yaml
jobs:
  api-server:   # Java 17 + Gradle
  ai-service:   # Node.js 20 + Jest
  frontend:     # Node.js 20 + Next.js build
```

각 job에 `defaults.run.working-directory`를 설정해서 `cd api-server` 없이도 해당 디렉토리에서 명령이 실행되도록 했다:

```yaml
jobs:
  api-server:
    defaults:
      run:
        working-directory: api-server  # 이후 모든 run: 명령은 api-server/ 기준
    steps:
      - run: ./gradlew build  # == cd api-server && ./gradlew build
```

---

## 2. 첫 번째 삽질: `gradle-wrapper.jar` 누락

### 문제

```
Error: Could not find or load main class org.gradle.wrapper.GradleWrapperMain
Caused by: java.lang.ClassNotFoundException: org.gradle.wrapper.GradleWrapperMain
```

`./gradlew build`를 실행하면 `gradlew` 스크립트가 `gradle/wrapper/gradle-wrapper.jar`를 찾는데, 이 파일이 레포에 없었다.

### 원인

`.gitignore`에 `*.jar` 패턴이 있었다:

```gitignore
# 기존 .gitignore
*.jar
*.war
*.nar
```

`gradle-wrapper.jar`도 `.jar` 확장자를 가지므로 Git 추적에서 제외된 것이다. 빌드 산출물(artifact) jar 파일은 추적하면 안 되지만, `gradle-wrapper.jar`는 **빌드를 실행하기 위한 도구**이므로 예외적으로 추적해야 한다.

### 해결

`.gitignore`에 예외 패턴을 추가했다:

```gitignore
# Build artifacts는 제외하되, Gradle Wrapper는 포함
*.jar
*.war
*.nar

# 예외: Gradle Wrapper jar (빌드 도구, 버전 관리 필요)
!gradle/wrapper/gradle-wrapper.jar
!**/gradle/wrapper/gradle-wrapper.jar
```

그 다음 `gradle wrapper --gradle-version 8.9`로 `gradle-wrapper.jar`를 재생성하고 커밋했다.

```bash
cd api-server
gradle wrapper --gradle-version 8.9
git add gradle/wrapper/gradle-wrapper.jar
git commit -m "fix: gradle-wrapper.jar 추가 (.gitignore 예외 처리)"
```

---

## 3. 두 번째 삽질: `flyway-database-postgresql` 버전 미지정

### 문제

`gradle-wrapper.jar` 문제를 해결했더니 이번엔 빌드 단계에서 의존성 해석 오류가 났다:

```
Could not resolve io.github.mhagnumdw:flyway-database-postgresql:
  Could not get resource 'https://repo.maven.apache.org/maven2/...'
  Could not find flyway-database-postgresql.pom
```

### 원인

`build.gradle`에서 Flyway 관련 의존성을 이렇게 선언했다:

```groovy
// 문제가 된 코드
dependencies {
  implementation 'org.flywaydb:flyway-core'
  runtimeOnly 'org.flywaydb:flyway-database-postgresql'  // 버전 없음
}
```

Spring Boot의 Dependency BOM(Bill of Materials)은 `flyway-core`의 버전은 관리하지만, `flyway-database-postgresql`은 관리하지 않는다. BOM에 없는 의존성은 반드시 버전을 명시해야 한다.

> **BOM이란?** Spring Boot는 의존성 관리를 위해 `spring-boot-dependencies` BOM을 제공한다. 이 BOM에 목록이 있는 의존성은 버전 없이 선언해도 Spring Boot 버전에 맞춰 자동으로 버전이 결정된다. BOM에 없는 의존성은 버전 충돌 방지를 위해 개발자가 직접 명시해야 한다.

### 해결

`flyway-database-postgresql`의 버전을 명시했다:

```groovy
dependencies {
  implementation 'org.flywaydb:flyway-core'
  runtimeOnly 'org.flywaydb:flyway-database-postgresql:10.11.0'  // 버전 명시
}
```

버전은 Spring Boot 3.x(당시 3.4.x)와 호환되는 Flyway 10.x 최신 stable 버전을 확인해서 선택했다.

---

## 4. 세 번째 삽질: Node.js `npm` 캐시 경로 오류

### 문제

ai-service job에서 `npm ci`가 실패했다:

```
Error: The path 'ai-service/package-lock.json' does not exist.
```

### 원인

GitHub Actions의 `setup-node` 액션에서 캐시를 설정할 때 `cache-dependency-path`를 지정하지 않으면 레포 루트의 `package-lock.json`을 찾는다. 그런데 이 프로젝트는 루트에 `package-lock.json`이 없고 `ai-service/package-lock.json`에 있다.

```yaml
# 문제가 된 설정
- name: Node.js 20 설정
  uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: npm
    # cache-dependency-path 누락!
```

### 해결

`cache-dependency-path`를 명시적으로 지정했다:

```yaml
- name: Node.js 20 설정
  uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: npm
    cache-dependency-path: ai-service/package-lock.json  # 추가
```

frontend job도 동일하게 `frontend/package-lock.json`으로 설정했다.

---

## 5. 최종 CI 구성

세 번의 수정 끝에 완성된 CI 파일이다:

```yaml
name: CI

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop]

jobs:
  api-server:
    name: api-server (Java 17 + Gradle)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: api-server
    steps:
      - uses: actions/checkout@v4
      - name: Java 17 설정
        uses: actions/setup-java@v4
        with:
          java-version: "17"
          distribution: "temurin"
          cache: gradle
      - name: Gradle 빌드 권한 부여
        run: chmod +x gradlew
      - name: Gradle 빌드 및 테스트
        run: ./gradlew build --no-daemon
        env:
          SPRING_PROFILES_ACTIVE: test

  ai-service:
    name: ai-service (Node.js 20)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ai-service
    steps:
      - uses: actions/checkout@v4
      - name: Node.js 20 설정
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: ai-service/package-lock.json
      - name: 의존성 설치
        run: npm ci
      - name: 테스트 실행
        run: npm test

  frontend:
    name: frontend (Next.js 15)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - name: Node.js 20 설정
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - name: 의존성 설치
        run: npm ci
      - name: Next.js 빌드 검증
        run: npm run build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8080
          NEXT_PUBLIC_AI_SERVICE_URL: http://localhost:3000
```

세 개의 job이 **병렬**로 실행되므로 전체 CI 시간이 단축된다. 각 job이 독립적으로 실패/성공하므로 어느 서비스에서 문제가 생겼는지 바로 파악할 수 있다.

---

## 6. 배운 점

### gradle-wrapper.jar는 반드시 커밋해야 한다

`*.jar`를 `.gitignore`에 추가하는 건 맞지만, `gradle-wrapper.jar`는 예외다. 이 파일이 없으면 CI에서 Gradle 자체를 실행할 수 없다. 프로젝트 초기화 때 예외 패턴을 먼저 추가해 두는 게 좋다.

### Spring Boot BOM에 없는 의존성은 버전을 반드시 명시한다

`spring-boot-starter-*` 패밀리 외부의 의존성은 BOM 관리 여부를 확인해야 한다. 특히 Flyway의 DB 드라이버 의존성처럼 플러그인 형태인 경우 대부분 BOM 미포함이다.

### CI 먼저 통과시키고 기능 개발을 시작한다

코드 몇 줄 짜고 바로 Push했다가 CI가 실패하면 작업 흐름이 끊긴다. 이후로는 첫 커밋 전에 CI 파일을 먼저 작성하고, 빈 빌드로 한 번 통과시킨 다음 기능 개발을 시작하는 방식을 택했다.

---

## 마치며

이번 편에서 다룬 이슈들은 모노레포 + Spring Boot + Node.js 혼합 프로젝트를 GitHub Actions로 관리할 때 한 번씩은 마주치는 문제들이다. 특히 `gradle-wrapper.jar` 누락과 BOM 외부 의존성 버전 미지정은 구글링으로도 바로 답이 나오지 않아서 시간이 걸렸다.

다음 편(Week 3)에서는 **카카오톡 나에게 보내기 API 버그 수정**과 **Next.js 15 대시보드 구현**을 다룬다.

> 전체 코드: https://github.com/mygithub05253/finance-bot-project

---

**태그:** `#GitHubActions` `#CI` `#GradleWrapper` `#Flyway` `#멀티모듈` `#SpringBoot` `#모노레포`
