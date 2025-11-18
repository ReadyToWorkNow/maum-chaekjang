// Uses backend proxy; API keys come from server .env
// 한국어 문자열이 UTF-8로 저장되어 깨지지 않도록 정리했습니다.

console.log('storybook.js 로드됨');

// Form submission handler
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM 로드 완료');

  const storyForm = document.getElementById('storyForm');
  if (!storyForm) {
    console.error('폼을 찾을 수 없음!');
    return;
  }

  console.log('폼 찾음!');
  storyForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    console.log('폼 제출됨');

    const formData = {
      childName: document.getElementById('childName').value,
      childAge: document.getElementById('childAge').value,
      abuseType: document.getElementById('abuseType').value,
      childSituation: document.getElementById('childSituation').value,
      childInterests:
        document.getElementById('childInterests').value || '동물과 자연',
    };

    console.log('입력 데이터', formData);
    document.getElementById('loadingMessage').style.display = 'block';

    try {
      // 1) 동화 생성
      console.log('1️⃣ 백엔드 API로 동화 생성 시작...');
      const story = await generateStoryWithBackend(formData);
      console.log('동화 생성 완료:', story);

      // 2) 페이지별 이미지 생성
      console.log('2️⃣ 백엔드 API로 이미지 생성 시작...');
      const storybook = await generateStorybookImages(story, formData);
      console.log('이미지 생성 완료:', storybook);

      // 3) 저장 후 이동
      localStorage.setItem('currentStorybook', JSON.stringify(storybook));
      console.log('로컬스토리지 저장 완료');
      console.log('페이지 이동...');
      window.location.href = 'generic.html';
    } catch (error) {
      console.error('동화 생성 중 오류:', error);
      alert('동화 생성 중 오류가 발생했습니다: ' + error.message);
      document.getElementById('loadingMessage').style.display = 'none';
    }
  });
});

// Child-friendly free-text form handler
document.addEventListener('DOMContentLoaded', function () {
  const childForm = document.getElementById('childStoryForm');
  if (!childForm) return;

  childForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const textEl = document.getElementById('childFreeText');
    const text = (textEl?.value || '').trim();
    if (!text) {
      alert('내용을 입력해 주세요.');
      return;
    }

    const loading = document.getElementById('childLoadingMessage');
    if (loading) loading.style.display = 'block';

    const formData = {
      childName: '친구',
      childAge: '',
      abuseType: '자유서술',
      childSituation: text,
      childInterests: '동물과 자연',
    };

    try {
      console.log('1) 동화 생성(아이용) 시작...');
      const story = await generateStoryWithBackend(formData);

      console.log('2) 이미지 생성(아이용) 시작...');
      const storybook = await generateStorybookImages(story, formData);

      localStorage.setItem('currentStorybook', JSON.stringify(storybook));
      window.location.href = 'generic.html';
    } catch (err) {
      console.error('아이용 동화 생성 오류:', err);
      alert('동화 생성 중 오류가 발생했습니다.');
      if (loading) loading.style.display = 'none';
    }
  });
});

// Backend: generate story (returns {pages, childName})
async function generateStoryWithBackend(formData) {
  console.log('백엔드 GPT API 호출 중...');
  try {
    // 요청에 페이지 수 힌트를 포함(백엔드가 지원하는 경우 6페이지 생성)
    const response = await fetch(`${CONFIG.API.BASE_URL}/generate-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formData, pagesCount: 6 }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API 오류:', errorData);
      throw new Error(errorData.error?.message || 'Story generation failed');
    }

    const data = await response.json();
    console.log('백엔드 응답 받음, 페이지 수', data.pages?.length);
    return data;
  } catch (error) {
    console.error('백엔드 GPT 호출 실패:', error);
    throw error;
  }
}

// For each page, generate image via backend
async function generateStorybookImages(story, formData) {
  console.log(`총 ${story.pages.length}개의 이미지를 생성합니다`);

  const storybook = {
    title: `${formData.childName}를 위한 치유 동화책`,
    childName: formData.childName,
    pages: [],
  };

  const totalPages = story.pages.length;
  for (let i = 0; i < totalPages; i++) {
    const page = story.pages[i];
    console.log(`\n[${i + 1}/${totalPages}] 페이지 ${page.page} 이미지 생성 중...`);
    try {
      const imageUrl = await generateImageWithBackend(page.image_prompt);
      storybook.pages.push({
        number: page.page,
        title: page.title,
        content: page.text,
        imageUrl: imageUrl || 'images/pic01.jpg',
      });
      if (imageUrl) console.log(`페이지 ${page.page} 완료!`);
      else console.log(`페이지 ${page.page} 실패, fallback 사용`);

      if (i < totalPages - 1) {
        console.log('5초 대기 중...');
        await new Promise((r) => setTimeout(r, 5000));
      }
    } catch (error) {
      console.error(`페이지 ${page.page} 오류:`, error);
      storybook.pages.push({
        number: page.page,
        title: page.title,
        content: page.text,
        imageUrl: 'images/pic01.jpg',
      });
      if (i < totalPages - 1) await new Promise((r) => setTimeout(r, 5000));
    }
  }

  console.log('\n모든 이미지 생성 완료!');
  return storybook;
}

// Backend: generate single image
async function generateImageWithBackend(prompt) {
  console.log('백엔드 이미지 생성 호출...');
  try {
    const response = await fetch(`${CONFIG.API.BASE_URL}/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error('이미지 생성 오류:', errorData);
      return null;
    }
    const data = await response.json();
    if (data.imageUrl) {
      console.log('이미지 URL 받음');
      return data.imageUrl;
    }
    return null;
  } catch (error) {
    console.error('백엔드 이미지 호출 실패:', error);
    return null;
  }
}

console.log('storybook.js 로드 완료!');



