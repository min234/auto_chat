# Auto Chat — AI CS Chatbot for AirBeam Lab

> Knowledge Base 기반 자동 고객 상담 챗봇 (AirBeam Lab)

AirBeam Lab의 고객 지원을 위한 AI 챗봇 웹앱입니다. GPT-4o API와 커스텀 Knowledge Base를 활용하여 정확하고 일관된 고객 응대를 자동화합니다.

---

## 주요 기능

- **Knowledge Base 기반 응답** — 회사 데이터로 학습된 정확한 답변 생성
- **GPT-4o 통합** — 최신 OpenAI 모델로 자연스러운 대화
- **웹 앱 배포** — Netlify를 통한 프로덕션 배포
- **실시간 채팅 UI** — React + TypeScript 기반 인터랙티브 채팅 인터페이스

## 아키텍처

```
┌──────────┐         ┌───────────────────┐         ┌──────────┐
│   User   │ ──────→ │   React Frontend  │ ──────→ │  GPT-4o  │
│ (Browser)│         │   (TypeScript)    │         │   API    │
└──────────┘         └─────────┬─────────┘         └──────────┘
                               │
                               ▼
                     ┌───────────────────┐
                     │  Knowledge Base   │
                     │  (knowledge.json) │
                     └───────────────────┘
```

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React, TypeScript |
| Build | Vite |
| AI/LLM | GPT-4o API |
| Deployment | Netlify |
| Styling | CSS |

## 프로젝트 구조

```
auto_chat/
├── App.tsx              # 메인 앱 컴포넌트
├── index.tsx            # 엔트리 포인트
├── components/          # UI 컴포넌트
├── services/            # API 호출 로직
├── utils/               # 유틸리티 함수
├── knowledge.json       # Knowledge Base 데이터
├── constants.ts         # 설정 상수
├── types.ts             # TypeScript 타입 정의
├── vite.config.ts       # Vite 빌드 설정
├── netlify.toml         # Netlify 배포 설정
├── package.json
└── tsconfig.json
```

## 실행 방법

```bash
# 의존성 설치
npm install

# 환경변수 설정
# .env.local에 GPT40_API_KEY 설정

# 개발 서버 실행
npm run dev
```

## 핵심 설계 포인트

1. **Knowledge Base 설계** — `knowledge.json`에 회사 정보, FAQ, 정책 등을 구조화
2. **TypeScript 풀스택** — 타입 안정성으로 런타임 에러 최소화
3. **Netlify 배포** — CI/CD 자동화로 빠른 배포 사이클
