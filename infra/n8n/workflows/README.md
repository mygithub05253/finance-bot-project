# n8n 워크플로우

n8n Cloud에서 Import하여 사용하는 워크플로우 JSON 파일 모음입니다.

## 워크플로우 목록

### daily-news-collect.json (Week 2에 추가 예정)
- **트리거**: 매일 22:00 UTC (= 07:00 KST)
- **플로우**: Schedule → 종목 목록 조회 → Perplexity 뉴스 수집 → ai-service 저장 → 카카오톡 발송

## n8n Cloud 설정
- URL: https://n8n.cloud
- 자격증명: n8n 대시보드 > Credentials에서 설정
  - Perplexity API Key
  - INTERNAL_API_SECRET (api-server 및 ai-service와 동일값)
