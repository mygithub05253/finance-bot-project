# MCP 서버 활용 전략

## 설정 파일 경로
`%APPDATA%\Claude\claude_desktop_config.json`

## 사용할 MCP 서버 목록
| MCP 서버 | 패키지 | 용도 |
|----------|--------|------|
| `mcp-server-filesystem` | `@modelcontextprotocol/server-filesystem` | 로컬 파일 직접 읽기/쓰기 |
| `mcp-supabase` | `@supabase/mcp-server-supabase` | Supabase DB 직접 쿼리 (공식 지원) |
| `mcp-server-github` | `@modelcontextprotocol/server-github` | GitHub PR 리뷰, 이슈 관리 |
| Figma Dev MCP | `@figma/figma-developer-mcp` | Figma 디자인 컨텍스트 읽기 |
| n8n MCP | n8n의 MCP 노드 | n8n 워크플로우를 AI 도구로 호출 |

---

## ① mcp-server-filesystem

**활용 예시:**
```
@mcp-server-filesystem n8n 워크플로우 JSON 파일 읽어서 파이프라인 구조 설명해줘
@mcp-server-filesystem 크롤링 결과 CSV 파일 분석해서 데이터 품질 이상 없는지 확인해줘
@mcp-server-filesystem .env.example 파일 읽어서 현재 설정된 환경변수 목록 확인해줘
```

**설정:**
```json
"filesystem": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem",
           "C:/Users/kik32/workspace/finance-bot-project"]
}
```

---

## ② mcp-supabase (개발 중 DB 탐색 — 핵심 도구)

Supabase 공식 MCP 서버. `mcp-server-mysql` 대비 장점:
- Supabase 팀이 직접 유지 관리 → 안정적
- 테이블 조회, SQL 실행, 스키마 검사, 마이그레이션 관리 통합 지원
- 로컬 DB 없이도 클라우드 DB에 바로 연결
- Storage, Edge Functions 등 Supabase 전체 기능 접근 가능

**활용 예시:**
```
@mcp-supabase news_summary 테이블에서 오늘 수집된 뉴스 건수 조회해줘
@mcp-supabase stock 테이블 전체 조회해서 현재 등록된 종목 목록 보여줘
@mcp-supabase notification_log에서 최근 7일 발송 실패 건수 집계해줘
@mcp-supabase public 스키마의 테이블 목록과 컬럼 구조 확인해줘
```

**설정:**
```json
"supabase": {
  "command": "npx",
  "args": [
    "-y",
    "@supabase/mcp-server-supabase@latest",
    "--project-url", "https://{project-ref}.supabase.co",
    "--service-role-key", "{service-role-key}"
  ]
}
```

> `service-role-key`는 Supabase Dashboard > Settings > API > service_role 에서 확인
> **주의**: service-role-key는 RLS 우회 권한이므로 절대 클라이언트 코드에 노출 금지

---

## ③ mcp-server-github

**활용 예시:**
```
@mcp-github 현재 열린 PR 목록 확인하고 리뷰 포인트 제안해줘
@mcp-github feature/stock-crud 브랜치의 변경사항 요약해줘
@mcp-github Issue #12 내용 읽어서 구현 방법 제안해줘
```

**설정**: `GITHUB_PERSONAL_ACCESS_TOKEN` 환경변수 필요

---

## ④ Figma Dev MCP (UI 설계 컨텍스트)

**활용 예시:**
```
@figma-mcp 대시보드 홈 화면 Figma 디자인 읽어서 Next.js 컴포넌트 구조 잡아줘
@figma-mcp 뉴스 카드 컴포넌트 디자인 스펙 읽어서 Tailwind 클래스 작성해줘
```

- Figma Dev Mode MCP Server: Figma 파일의 컴포넌트 트리, 스타일, 레이아웃 정보를 Claude가 직접 읽음
- **설정**: Figma API Key 필요 (Figma > Preferences > Access tokens)

---

## ⑤ n8n에서 MCP 활용 (n8n이 MCP 클라이언트)

n8n 워크플로우 내에서 AI Agent 노드가 MCP 도구들을 직접 호출 (n8n v1.60+ 지원)

```
n8n 워크플로우 예시:
  Schedule Trigger (07:00 KST)
  → AI Agent (Claude 기반)
  → [MCP Tool: filesystem] 어제 뉴스 파일 확인
  → [MCP Tool: supabase] 이미 저장된 뉴스 URL 목록 조회
  → Perplexity API 호출 (중복 제외한 종목만)
  → 결과 저장 및 카카오톡 발송
```

---

## 개발 워크플로우에서 MCP 활용 흐름

```
코드 작성 시:
  @Skill.md 프로젝트 개요 확인
  @mcp-supabase 현재 DB 스키마 확인
  → Claude가 실제 DB 구조를 보면서 코드 생성

UI 개발 시:
  @figma-mcp 디자인 컴포넌트 읽기
  → Tailwind + shadcn/ui 코드 자동 생성

PR 리뷰 시:
  @mcp-github 변경사항 요약
  → 코드 품질 체크 + 리뷰 코멘트 작성

n8n 파이프라인 디버깅 시:
  @mcp-server-filesystem n8n 워크플로우 JSON 읽기
  → 파이프라인 로직 분석 + 오류 원인 파악

DB 데이터 확인 시:
  @mcp-supabase SQL 직접 실행
  → 로컬 DB 클라이언트 없이도 즉시 데이터 확인
```
