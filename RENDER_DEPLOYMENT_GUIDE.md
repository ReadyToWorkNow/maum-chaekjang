# Render 배포 가이드

**배포 날짜**: 2025-11-19
**프로젝트**: 마음의_책장 (Story Palette Book)

---

## 📋 배포 전 체크리스트

- [x] 코드 리뷰 완료 (A- 등급)
- [x] Critical 이슈 전부 수정
- [x] GitHub Repository 준비
- [ ] Render 계정 준비
- [ ] 환경 변수 값 준비

---

##  1단계: GitHub 업로드

### 1-1. Git 초기화 및 커밋

```bash
cd "/Users/shinjuyong/Desktop/새싹 해커톤/마음의_책장"

# Git 초기화
git init

# 모든 파일 추가 (.gitignore가 .env 제외함)
git add .

# 초기 커밋
git commit -m "Initial commit: 마음의_책장 통합 프로젝트

- 두 프로젝트 통합 (story-palette-book + Make-Story-for-Child)
- 시니어 개발자 코드 리뷰 완료 (A- 등급)
- Critical 이슈 5개 전부 수정
- Warning 이슈 1개 수정
- 배포 준비도: 95%"
```

### 1-2. GitHub Repository 생성 및 푸시

```bash
# GitHub에서 새 Repository 생성 후 URL 복사
# 예: https://github.com/YOUR_USERNAME/story-palette-book-integrated.git

# Remote 추가
git remote add origin https://github.com/YOUR_USERNAME/story-palette-book-integrated.git

# 메인 브랜치로 변경
git branch -M main

# 푸시
git push -u origin main
```

### 1-3. .env 파일 제외 확인

```bash
# .env 파일이 Git에 추가되지 않았는지 확인
git status

# 출력 예시 (정상):
# On branch main
# nothing to commit, working tree clean

# .env 파일이 추적되고 있으면 안됨!
```

---

##  2단계: Render 배포

### 2-1. Render Dashboard 접속

1. [Render Dashboard](https://dashboard.render.com/) 접속
2. "New +" 버튼 클릭
3. **"Blueprint"** 선택

### 2-2. GitHub Repository 연결

1. GitHub 계정 연결 (처음 사용 시)
2. Repository 선택: `story-palette-book-integrated`
3. Branch 선택: `main`
4. **"Apply"** 클릭

Render가 `render.yaml`을 자동으로 읽고 2개 서비스를 생성합니다:
-  `story-backend` (Node.js 서버)
-  `story-frontend` (Static Site)

---

##  3단계: 환경 변수 설정

### 3-1. Backend 환경 변수 설정

1. Dashboard에서 **"story-backend"** 서비스 클릭
2. 좌측 메뉴에서 **"Environment"** 클릭
3. 다음 환경 변수 추가:

```bash
# 필수 변수
OPENAI_API_KEY=sk-YOUR_OPENAI_API_KEY_HERE
SUPERTONE_API_KEY=YOUR_SUPERTONE_API_KEY_HERE
FRONTEND_URL=https://story-frontend.onrender.com

# 선택적 변수 (MySQL 사용 시)
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
```

4. **"Save Changes"** 클릭 → 자동 재배포

### 3-2. Frontend 환경 변수 설정

1. Dashboard에서 **"story-frontend"** 서비스 클릭
2. 좌측 메뉴에서 **"Environment"** 클릭
3. 다음 환경 변수 추가:

```bash
# Supabase 설정
VITE_SUPABASE_PROJECT_ID=mxyvdmnvejcbkoglcyoi
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14eXZkbW52ZWpjYmtvZ2xjeW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3ODAwNDEsImV4cCI6MjA3NzM1NjA0MX0.V2SncjyRqek9uiIQSNzaGgdvId7JIIJLbNeugy921Ho
VITE_SUPABASE_URL=https://mxyvdmnvejcbkoglcyoi.supabase.co

# 백엔드 URL (자동 설정됨, 확인용)
VITE_BACKEND_URL=https://story-backend.onrender.com
```

4. **"Save Changes"** 클릭 → 자동 재배포

---

##  중요: Lovable vs Render 환경 변수 차이

### Lovable (기존)
-  **자동으로 Supabase 환경 변수 주입**
-  별도 설정 불필요
-  빌드/배포 시 자동 적용

### Render (신규)
-  **환경 변수를 수동으로 설정해야 함**
-  Dashboard에서 직접 입력
-  `.env` 파일은 Git에 업로드되지 않음 (보안 상 정상)

### 해결 방법
위의 "3단계: 환경 변수 설정"을 따라 **Render Dashboard에서 수동 입력**하면 문제없이 작동합니다.

---

##  4단계: 배포 확인

### 4-1. 배포 상태 확인

1. Dashboard에서 두 서비스 모두 **"Live"** 상태인지 확인
2. 배포 로그에서 에러 없는지 확인

### 4-2. 배포된 URL 확인

- **Frontend**: `https://story-frontend.onrender.com`
- **Backend**: `https://story-backend.onrender.com`

### 4-3. 동작 테스트

#### Frontend 테스트
```bash
# 브라우저에서 접속
https://story-frontend.onrender.com
```

**확인 사항**:
- [ ] React 앱이 정상적으로 로드됨
- [ ] `/auth` 페이지 접근 가능
- [ ] Supabase 연결 정상 (개발자 도구 콘솔 확인)

#### Backend 테스트
```bash
# 터미널에서 테스트 (또는 브라우저)
curl https://story-backend.onrender.com/index.html
```

**확인 사항**:
- [ ] Legacy HTML 페이지 정상 서빙
- [ ] API 엔드포인트 응답 확인

#### Legacy Pages 테스트
```bash
# 브라우저에서 접속
https://story-backend.onrender.com/index.html
https://story-backend.onrender.com/children.html
```

**확인 사항**:
- [ ] HTML 페이지 정상 로드
- [ ] "동화 만들러가기 (음성)" 버튼 보임
- [ ] 버튼 클릭 시 Frontend로 이동 (https://story-frontend.onrender.com/auth)

---

##  5단계: Legacy HTML 버튼 URL 업데이트

배포 완료 후, Legacy 페이지의 버튼 URL을 실제 배포된 URL로 업데이트해야 합니다.

### 5-1. index.html 수정

파일: `legacy-pages/index.html`

```html
<!-- 기존 -->
<a href="https://story-frontend.onrender.com/auth" class="button">동화 만들러가기 (음성)</a>

<!-- 실제 배포된 URL로 확인 후 그대로 두면 됨 -->
```

### 5-2. children.html 수정

파일: `legacy-pages/children.html`

```html
<!-- 기존 -->
<a href="https://story-frontend.onrender.com/auth" class="button">동화 만들러가기 (음성)</a>

<!-- 실제 배포된 URL로 확인 후 그대로 두면 됨 -->
```

**참고**: `render.yaml`에 이미 정확한 URL이 설정되어 있으므로, 실제 배포된 URL이 일치하는지만 확인하면 됩니다.

---

##  6단계: 전체 플로우 테스트

### 테스트 시나리오 1: 폼 기반 동화 생성 (Legacy)

1. `https://story-backend.onrender.com/index.html` 접속
2. 아동 정보 입력 (이름, 나이, 학대 유형 등)
3. "치유 동화 만들기" 버튼 클릭
4. 동화 생성 대기
5. 완성된 동화 확인

### 테스트 시나리오 2: 음성 기반 동화 생성 (React)

1. `https://story-backend.onrender.com/index.html` 접속
2. "동화 만들러가기 (음성)" 버튼 클릭 → Frontend로 이동
3. `/auth` 페이지에서 인증 코드 입력
4. `/create_input` 페이지에서 음성 녹음
5. `/create_loading` 페이지에서 동화책 생성 대기
6. `/create_show` 페이지에서 완성된 동화책 확인

### 테스트 체크리스트

- [ ] Legacy 페이지 접근 정상
- [ ] "동화 만들러가기 (음성)" 버튼 동작
- [ ] 인증 코드 검증 (n8n 웹훅 정상)
- [ ] 음성 녹음 및 전송 (n8n 웹훅 정상)
- [ ] 동화 생성 (OpenAI API 정상)
- [ ] 이미지 생성 (DALL-E 3 정상)
- [ ] 음성 변환 (Supertone TTS 정상)
- [ ] CORS 에러 없음
- [ ] 타임아웃 에러 처리 정상

---

## 🐛 트러블슈팅

### 문제 1: Supabase 연결 실패

**증상**: 프론트엔드 콘솔에 "Missing Supabase environment variables" 에러

**원인**: Frontend 환경 변수 미설정

**해결**:
1. Render Dashboard → story-frontend → Environment
2. `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 추가
3. Save Changes

---

### 문제 2: CORS 에러

**증상**: 브라우저 콘솔에 "CORS policy: Origin ... not allowed"

**원인**: Backend CORS 설정에 Frontend URL 미포함

**해결**:
1. `backend/server.js:34-39` 확인
2. `allowedOrigins` 배열에 Frontend URL 추가:
```javascript
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://story-frontend.onrender.com'  // ← 실제 URL 확인
].filter(Boolean);
```
3. Git commit & push → 자동 재배포

---

### 문제 3: n8n 웹훅 타임아웃

**증상**: "웹훅 응답 시간이 초과되었습니다" 에러

**원인**: n8n 워크플로우가 Active 상태가 아님

**해결**:
1. [n8n Dashboard](https://robotshin.app.n8n.cloud/) 접속
2. `voice_recording` 워크플로우 Active 확인
3. `check_real_code` 워크플로우 Active 확인

---

### 문제 4: OpenAI API 에러

**증상**: 동화 생성 실패, 500 에러

**원인**: OPENAI_API_KEY 미설정 또는 잘못됨

**해결**:
1. Render Dashboard → story-backend → Environment
2. `OPENAI_API_KEY` 값 확인 및 수정
3. Save Changes

---

##  배포 후 모니터링

### Render 로그 확인

1. Dashboard → 서비스 선택
2. 좌측 메뉴 "Logs" 클릭
3. 실시간 로그 확인

### 중요 로그 키워드

- `Supertone TTS 서버 http://...` - 서버 시작 성공
- `동화 생성 완료` - 동화 생성 성공
- `GPT API 오류` - OpenAI API 문제
- `CORS policy` - CORS 설정 문제

---

##  배포 완료!

모든 테스트가 통과하면 배포가 완료된 것입니다.

### 다음 단계

1. **예선 제출**: GitHub Repository URL 제출
2. **시연 준비**: 두 플로우 모두 시연 가능
3. **문서 정리**: README 업데이트, 스크린샷 추가

---

##  지원

- **코드 리뷰 보고서**: [CODE_REVIEW_REPORT.md](./CODE_REVIEW_REPORT.md)
- **수정 내역 요약**: [FIXES_SUMMARY.md](./FIXES_SUMMARY.md)
- **전체 진행 사항**: [../진행사항.md](../진행사항.md)

---

**배포 가이드 작성**: 2025-11-19
**최종 업데이트**: 2025-11-19
