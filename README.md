# 마음의 책장 (THE PAGES OF MY HEART)

> 아이들의 마음을 치유하는 AI 동화 생성 플랫폼

---

## 프로젝트 소개

**마음의 책장**은 학대 피해 아동의 심리 치유를 돕기 위한 맞춤형 동화 생성 서비스입니다.

404 NOT FOUND LAB 팀은 아동학대 사례가 지속적으로 증가하는 현실 속에서 (2022년 44,531건 → 2024년 47,096건), 아이들이 자신의 감정을 표현하고 회복할 수 있도록 돕는 기술적 솔루션을 개발했습니다.

---

## 왜 동화인가

동화는 단순한 이야기가 아닙니다. 심리치료 연구에 따르면:

- **감정 통합**: 아이들은 동화 속 캐릭터를 통해 자신의 감정을 안전하게 투영하고 이해할 수 있습니다
- **회복탄력성 구축**: 이야기를 통한 대리 경험은 아이들에게 희망과 극복의 메시지를 전달합니다
- **비침습적 접근**: 직접적인 상담보다 부담이 적어 아이들이 편안하게 접근할 수 있습니다

마음의 책장은 AI 기술과 심리치료 원리를 결합하여, 각 아동의 상황에 맞는 치유 동화를 자동으로 생성합니다.

---

## 주요 기능

### 1. 프롬프트 최적화
- 아동의 나이, 학대 유형, 상황을 분석하여 맞춤형 동화 생성
- 전문적인 동화 작가의 작법을 학습한 AI 모델 활용

### 2. PTSD 단어 배제
- 트라우마를 유발할 수 있는 직접적인 표현 자동 필터링
- 은유와 상징을 통한 부드러운 접근

### 3. 사용자 음성 기반 입력 (STT)
- 아이가 직접 자신의 이야기를 음성으로 녹음
- n8n 워크플로우를 통한 자동 음성-텍스트 변환
- 음성 데이터 기반 맞춤형 동화 생성

### 4. 다중 입력 방식
- **폼 기반**: 보호자가 아동 정보를 입력하여 동화 생성
- **음성 기반**: 아동이 직접 음성으로 자신의 이야기를 전달

---

## 기술 스택

### AI/API
- **OpenAI**: GPT-5 (동화 생성), DALL-E 3 (이미지 생성)
- **Google Gemini**: 보조 언어 모델
- **Supertone TTS**: 자연스러운 한국어 음성 변환

### 자동화
- **n8n**: 워크플로우 자동화, 음성 처리, 인증 관리

### Web
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express
- **Database**: Supabase, MySQL (선택사항)

### 인프라
- **호스팅**: Render
- **BaaS**: Supabase (Edge Functions)

---

## 프로젝트 구조

```
마음의_책장/
├── frontend/              # React + TypeScript (Vite)
│   ├── src/
│   │   ├── pages/        # 페이지 컴포넌트
│   │   ├── components/   # UI 컴포넌트
│   │   └── utils/        # 유틸리티
│   ├── supabase/         # Supabase Edge Functions
│   └── .env.example
│
├── backend/              # Node.js + Express
│   ├── server.js         # API 서버
│   ├── audio_output/     # TTS 오디오 파일
│   └── .env.example
│
├── legacy-pages/         # HTML 페이지 (폼 기반 입력)
│   ├── index.html        # 메인 페이지
│   └── children.html     # 아동 정보 등록
│
└── render.yaml           # Render 배포 설정
```

---

## 사용자 플로우

### 플로우 1: 폼 기반 동화 생성
1. 보호자가 아동 정보 입력 (이름, 나이, 학대 유형, 상황, 관심사)
2. "치유 동화 만들기" 버튼 클릭
3. OpenAI GPT-4로 5페이지 분량의 맞춤형 동화 생성
4. DALL-E 3로 각 페이지별 수채화 스타일 이미지 생성
5. Supertone TTS로 동화 전체를 음성으로 변환
6. 완성된 동화책 제공 (텍스트 + 이미지 + 오디오)

### 플로우 2: 음성 기반 동화 생성
1. "동화 만들러가기 (음성)" 버튼 클릭
2. 인증 코드 입력 (권한 확인)
3. 아동이 자신의 이야기를 음성으로 녹음
4. n8n 워크플로우가 음성을 텍스트로 변환 (STT)
5. 변환된 텍스트를 기반으로 동화 생성
6. 동화책 뷰어에서 확인

---

## 로컬 개발 환경 설정

### 사전 요구사항
- Node.js 18 이상
- npm 또는 yarn

### 1. 백엔드 실행

```bash
cd backend
npm install
cp .env.example .env
# .env 파일에 API 키 설정 필요
npm start
```

백엔드 서버: `http://localhost:3000`

### 2. 프론트엔드 실행

```bash
cd frontend
npm install
cp .env.example .env
# .env 파일에 Supabase 정보 설정 필요
npm run dev
```

프론트엔드 서버: `http://localhost:8080`

### 3. Legacy 페이지 접근

백엔드 서버 실행 후 접근:
- 메인 페이지: `http://localhost:3000/index.html`
- 아동 정보 등록: `http://localhost:3000/children.html`

---

## 환경 변수 설정

### Backend (.env)

```bash
# Server
PORT=3000
FRONTEND_URL=https://your-frontend-url.com

# OpenAI API
OPENAI_API_KEY=sk-...

# Supertone TTS API
SUPERTONE_API_KEY=...

# Database (선택사항)
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
```

### Frontend (.env)

```bash
# Supabase
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_URL=https://....supabase.co
```

---

## 배포 및 데모

프로젝트는 Render를 통해 배포되어 실제 서비스 중입니다.

**데모 사이트**: https://story-backend-51cl.onrender.com

### 테스트 방법

**플로우 1: 폼 기반 동화 생성**
1. [데모 사이트](https://story-backend-51cl.onrender.com) 접속
2. 아동 정보 입력 (이름, 나이, 학대 유형 등)
3. "치유 동화 만들기" 버튼 클릭

**플로우 2: 음성 기반 동화 생성**
1. [데모 사이트](https://story-backend-51cl.onrender.com) 접속
2. "동화 만들러가기 (음성)" 버튼 클릭
3. 인증 코드 입력 (다음 중 하나 사용)
   - `storytest`
   - `maum2025`
   - `404notfound`
4. 음성 녹음으로 동화 생성 체험

---

## 외부 서비스 연동

### n8n 워크플로우
- 인증 코드 검증 자동화
- 음성 데이터 처리 및 STT 변환
- 동화 생성 파이프라인 관리

### Supabase Edge Functions
- 스토리 라인 최적화 및 변환
- DALL-E 3 이미지 생성 API 연동
- Supertone TTS 음성 변환 처리
- 오디오/인증 웹훅 프록시

---

## 팀 소개

**404 NOT FOUND LAB**

2025 새싹 해커톤 참가팀

**팀원:**
- 신주용 (팀장)
- 전관우
- 김현웅
- 정제균

---

## 프로젝트 의의

아동학대는 개인의 문제가 아닌 사회적 과제입니다. 마음의 책장은 기술이 사회문제 해결에 기여할 수 있음을 보여주는 프로젝트입니다.

동화를 통해 아이들이 자신의 감정을 이해하고 표현하며, 궁극적으로 치유의 첫걸음을 내딛을 수 있도록 돕습니다. 이것이 마음의 책장이 존재하는 이유입니다.

---

## 라이선스

이 프로젝트는 2025 새싹 해커톤 제출용으로 제작되었습니다.

---

## 문의

프로젝트에 대한 문의사항은 GitHub 이슈로 등록해주세요.
