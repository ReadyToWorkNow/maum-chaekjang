# 배포 가이드

## Render 배포 단계별 가이드

### 1단계: GitHub 레포지토리 생성

```bash
cd /Users/shinjuyong/Desktop/새싹\ 해커톤/integrated-project
git init
git add .
git commit -m "Initial commit: 통합 프로젝트"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 2단계: Render Blueprint 배포

1. Render Dashboard 접속: https://dashboard.render.com
2. "New" → "Blueprint" 클릭
3. GitHub 레포지토리 연결
4. `render.yaml` 자동 감지
5. "Apply" 클릭

### 3단계: 환경 변수 설정

#### Backend (story-backend)

Render Dashboard → story-backend → Environment

```bash
# 필수
OPENAI_API_KEY=sk-proj-...
SUPERTONE_API_KEY=...

# 자동 설정됨
PORT=(Render가 자동 할당)
FRONTEND_URL=https://story-frontend.onrender.com

# 선택사항 (MySQL 사용 시)
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
```

#### Frontend (story-frontend)

Render Dashboard → story-frontend → Environment

```bash
# 필수
VITE_SUPABASE_PROJECT_ID=mxyvdmnvejcbkoglcyoi
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://mxyvdmnvejcbkoglcyoi.supabase.co

# 자동 설정됨
VITE_BACKEND_URL=https://story-backend.onrender.com
```

### 4단계: 배포 확인

1. **백엔드 확인**
   - URL: `https://story-backend.onrender.com`
   - 테스트: `https://story-backend.onrender.com/index.html`
   - API 테스트: `https://story-backend.onrender.com/api/tts/voices`

2. **프론트엔드 확인**
   - URL: `https://story-frontend.onrender.com`
   - 테스트: `https://story-frontend.onrender.com/auth`

### 5단계: Legacy 페이지 URL 업데이트

배포 완료 후, 실제 Render URL로 업데이트:

```bash
# legacy-pages/index.html 수정
# legacy-pages/children.html 수정
```

현재 하드코딩된 URL:
```html
<a href="https://story-frontend.onrender.com/auth" ...>
```

실제 배포된 URL로 변경:
```html
<a href="https://YOUR-ACTUAL-FRONTEND-URL.onrender.com/auth" ...>
```

##  배포 후 체크리스트

### 기능 테스트

- [ ] **Legacy 페이지 접근**
  - [ ] `https://story-backend.onrender.com/index.html`
  - [ ] `https://story-backend.onrender.com/children.html`

- [ ] **"동화 만들러가기" 버튼**
  - [ ] 클릭 시 React App의 /auth로 이동하는지 확인

- [ ] **인증 플로우**
  - [ ] /auth 페이지 로딩
  - [ ] 인증 코드 입력 → n8n 웹훅 검증
  - [ ] 검증 성공 시 /create_input으로 이동

- [ ] **음성 녹음 플로우**
  - [ ] 마이크 권한 요청
  - [ ] 녹음 시작/정지
  - [ ] n8n 웹훅으로 전송
  - [ ] 응답 받아서 /create_loading으로 이동

- [ ] **동화책 생성**
  - [ ] Supabase Functions 호출
  - [ ] 이미지 생성
  - [ ] TTS 생성
  - [ ] /create_show에서 동화책 표시

### API 테스트

- [ ] **Backend API**
  - [ ] `GET /api/tts/voices`
  - [ ] `POST /api/generate-story`
  - [ ] `POST /api/generate-image`
  - [ ] `POST /api/tts/convert`

### CORS 테스트

- [ ] 프론트엔드에서 백엔드 API 호출 시 CORS 에러 없는지 확인
- [ ] n8n 웹훅 호출 시 CORS 에러 없는지 확인

##  트러블슈팅

### 문제 1: 환경 변수가 작동하지 않음

**증상**: API 키 관련 에러, Supabase 연결 실패

**해결**:
1. Render Dashboard → 해당 서비스 → Environment 탭 확인
2. 환경 변수가 올바르게 설정되었는지 확인
3. 변경 후 "Manual Deploy" → "Deploy latest commit"

### 문제 2: CORS 에러

**증상**:
```
Access to fetch at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

**해결**:
1. backend/server.js의 CORS 설정 확인
2. FRONTEND_URL 환경 변수가 올바른지 확인
3. 서버 재배포

### 문제 3: 정적 파일이 404

**증상**: `/index.html` 접근 시 404 에러

**해결**:
1. backend/server.js의 `express.static` 경로 확인
2. `legacy-pages/` 폴더가 올바르게 배포되었는지 확인
3. 빌드 로그에서 파일 복사 확인

### 문제 4: n8n 웹훅 연결 실패

**증상**: 인증 또는 음성 녹음이 작동하지 않음

**해결**:
1. n8n 워크플로우가 **Active** 상태인지 확인
2. 웹훅 URL이 올바른지 확인
3. n8n 실행 로그 확인

##  지원

문제가 발생하면:
1. Render 배포 로그 확인
2. 브라우저 개발자 도구 Console 확인
3. Network 탭에서 실패한 요청 확인
4. 진행사항.md에 이슈 기록
