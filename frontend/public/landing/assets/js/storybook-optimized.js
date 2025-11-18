// Optimized Storybook Generator
// API와 백엔드로 연동하고, 진행도 표시, 사용자 친화적인 에러 메시지 출력

console.log('? storybook-optimized.js 로드됨');

// Progress tracking
let progressCallback = null;

function setProgressCallback(callback) {
  progressCallback = callback;
}

function updateProgress(message, percentage) {
  console.log(`? ${percentage}% - ${message}`);
  if (progressCallback) {
    progressCallback(message, percentage);
  }
}

// Form submission handler
document.addEventListener('DOMContentLoaded', function () {
  console.log('? DOM 로드 완료');

  const storyForm = document.getElementById('storyForm');

  if (storyForm) {
    console.log('?? 폼 찾음!');

    // Hard-stop native submission just in case
    try { storyForm.setAttribute("action", "javascript:void(0)"); storyForm.setAttribute("method", "post"); } catch (_) {}
    storyForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      console.log('?? 폼 제출됨');

      // Get form data
      const formData = {
        childName: document.getElementById('childName').value,
        childAge: document.getElementById('childAge').value,
        abuseType: document.getElementById('abuseType').value,
        childSituation: document.getElementById('childSituation').value,
        childInterests: document.getElementById('childInterests').value || '동물과 자연'
      };

      console.log('?? 폼 데이터:', formData);

      // Show loading message
      const loadingEl = document.getElementById('loadingMessage');
      loadingEl.style.display = 'block';
      loadingEl.innerHTML = `
        <p style="color: #ffffff; text-align: left;">
          <span class="icon solid fa-spinner fa-spin"></span>
          <span id="progress-text">${CONFIG.MESSAGES.LOADING}</span>
        </p>
        <div style="background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-top: 1em;">
          <div id="progress-bar" style="background: linear-gradient(90deg, #667eea, #764ba2); height: 20px; width: 0%; transition: width 0.3s;"></div>
        </div>
        <p id="progress-detail" style="color: #cccccc; text-align: left; margin-top: 0.5em; font-size: 0.9em;"></p>
      `;

      // Setup progress callback
      setProgressCallback((message, percentage) => {
        document.getElementById('progress-text').textContent = message;
        document.getElementById('progress-bar').style.width = percentage + '%';
      });

      try {
        updateProgress(CONFIG.MESSAGES.PROGRESS_STORY, 10);

        // Step 1: Generate story using backend API
        console.log('1?? 백엔드 API로 동화 생성 작업 시작...');
        const story = await generateStoryWithBackend(formData);
        console.log('?? 동화 생성 완료:', story);

        updateProgress(CONFIG.MESSAGES.PROGRESS_IMAGE, 30);

        // Step 2: Generate images for each scene using backend API
        console.log('2?? 백엔드 API로 이미지 생성 작업 시작...');
        const storybook = await generateStorybookImages(story, formData);
        console.log('??? 이미지 생성 완료:', storybook);

        updateProgress(CONFIG.MESSAGES.SUCCESS_GENERATED, 100);

        // Step 3: Store the storybook data in localStorage
        localStorage.setItem('currentStorybook', JSON.stringify(storybook));
        console.log('?? 로컬스토리지 저장 완료');

        // Step 4: Redirect to generic.html to display the storybook
        setTimeout(() => {
          console.log('?? 페이지 이동...');
          window.location.href = 'generic.html';
        }, 1000);

      } catch (error) {
        console.error('? 동화/이미지 생성 중 오류:', error);
        const friendlyMessage = getUserFriendlyError(error);

        loadingEl.innerHTML = `
          <p style="color: #ff6b6b; text-align: left;">
            <span class="icon solid fa-exclamation-triangle"></span>
            ${friendlyMessage}
          </p>
          <p style="text-align: left; margin-top: 1em;">
            <button onclick="location.reload()" class="button small">다시 시도하기</button>
          </p>
        `;
      }
    });
  } else {
    console.error('? 폼을 찾을 수 없습니다!');
        return false;
  }
});

// Function to generate story using backend API
async function generateStoryWithBackend(formData) {
  console.log('?? 백엔드 API 호출 중(동화)...');

  try {
    const response = await fetch(`${CONFIG.API.BASE_URL}/generate-story`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ formData })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API 오류:', errorData);
      throw new Error(errorData.error?.message || 'Story generation failed');
    }

    const data = await response.json();
    console.log('? 백엔드 응답 받음, 페이지 수:', data.pages.length);

    return data;

  } catch (error) {
    console.error('? 백엔드 API 호출 실패(동화):', error);
    throw error;
  }
}

// Function to generate images for each page using backend API
async function generateStorybookImages(story, formData) {
  console.log(`?? ${story.pages.length}개의 페이지 이미지 생성합니다`);
  const storybook = {
    title: `${formData.childName}의 마음 회복 동화책`,
    childName: formData.childName,
    pages: []
  };

  const totalPages = story.pages.length;

  // Generate an image for each page
  for (let i = 0; i < story.pages.length; i++) {
    const page = story.pages[i];
    const progressPercent = 30 + Math.round((i / totalPages) * 60); // 30% ~ 90%

    console.log(`\n[${i + 1}/${totalPages}] 페이지 ${page.page} 이미지 생성 중...`);

    updateProgress(
      `그림을 그리고 있어요... (${i + 1}/${totalPages})`,
      progressPercent
    );

    document.getElementById('progress-detail').textContent = `"${page.title}"`;

    try {
      const imageUrl = await generateImageWithBackend(page.image_prompt);

      storybook.pages.push({
        number: page.page,
        title: page.title,
        content: page.text,
        imageUrl: imageUrl || CONFIG.IMAGE.FALLBACK_IMAGE
      });

      if (imageUrl) {
        console.log(`? 페이지 ${page.page} 완료!`);
      } else {
        console.log(`?? 페이지 ${page.page} 실패, fallback 사용`);
      }

      // 마지막 페이지가 아니면 지연
      if (i < story.pages.length - 1) {
        console.log(`?? ${CONFIG.TIMING.DALLE_DELAY / 1000}초 대기...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.TIMING.DALLE_DELAY));
      }

    } catch (error) {
      console.error(`? 페이지 ${page.page} 오류:`, error);
      storybook.pages.push({
        number: page.page,
        title: page.title,
        content: page.text,
        imageUrl: CONFIG.IMAGE.FALLBACK_IMAGE
      });

      if (i < story.pages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.TIMING.DALLE_DELAY));
      }
    }
  }

  updateProgress('?? 동화책 구성 중...', 95);
  console.log(`\n?? 모든 페이지 생성 완료!`);
  return storybook;
}

// Function to generate image using backend API
async function generateImageWithBackend(prompt) {
  console.log('??? 백엔드 API로 이미지 생성 요청...');

  try {
    const response = await fetch(`${CONFIG.API.BASE_URL}/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('이미지 생성 오류:', errorData);
      return null;
    }

    const data = await response.json();

    if (data.imageUrl) {
      console.log('? 이미지 URL 받음');
      return data.imageUrl;
    }

    return null;

  } catch (error) {
    console.error('? 백엔드 API 호출 실패(이미지):', error);
    return null;
  }
}

console.log('? storybook-optimized.js 로드 완료!');

// Child free-text form: proceed identically to info form
document.addEventListener('DOMContentLoaded', function () {
  const childForm = document.getElementById('childStoryForm');
  if (!childForm) return;

  try { childForm.setAttribute('action', 'javascript:void(0)'); childForm.setAttribute('method', 'post'); } catch (_) {}

  childForm.addEventListener('submit', async function (e) {

    const textEl = document.getElementById('childFreeText');
    const freeText = (textEl && textEl.value ? textEl.value : '').trim();
    if (!freeText) {
      try { alert('?댁슜???낅젰??二쇱꽭??'); } catch (_) {}
      return false;
    }

    const formData = {
      childName: '자유서술',
      childAge: '',
      abuseType: '자유서술',
      childSituation: freeText,
      childInterests: '입력한 내용 기반 서술'
    };

    const loadingEl = document.getElementById('childLoadingMessage');
    if (loadingEl) {
      loadingEl.style.display = 'block';
      loadingEl.innerHTML = `
        <p style="color: #ffffff; text-align: left;">
          <span class="icon solid fa-spinner fa-spin"></span>
          <span id="progress-text">${CONFIG.MESSAGES.LOADING}</span>
        </p>
        <div style="background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-top: 1em;">
          <div id="progress-bar" style="background: linear-gradient(90deg, #667eea, #764ba2); height: 20px; width: 0%; transition: width 0.3s;"></div>
        </div>
        <p id="progress-detail" style="color: #cccccc; text-align: left; margin-top: 0.5em; font-size: 0.9em;"></p>
      `;
    }

    setProgressCallback((message, percentage) => {
      const t = document.getElementById('progress-text');
      const b = document.getElementById('progress-bar');
      if (t) t.textContent = message;
      if (b) b.style.width = percentage + '%';
    });

    try {
      updateProgress(CONFIG.MESSAGES.PROGRESS_STORY, 10);
      const story = await generateStoryWithBackend(formData);

      updateProgress(CONFIG.MESSAGES.PROGRESS_IMAGE, 30);
      const storybook = await generateStorybookImages(story, formData);

      updateProgress(CONFIG.MESSAGES.SUCCESS_GENERATED, 100);
      localStorage.setItem('currentStorybook', JSON.stringify(storybook));
      setTimeout(() => { window.location.href = 'generic.html'; }, 800);
    } catch (error) {
      const friendlyMessage = getUserFriendlyError(error);
      if (loadingEl) {
        loadingEl.innerHTML = `
          <p style="color: #ff6b6b; text-align: left;">
            <span class="icon solid fa-exclamation-triangle"></span>
            ${friendlyMessage}
          </p>
          <p style="text-align: left; margin-top: 1em;">
            <button onclick="location.reload()" class="button small">다시 입력하기</button>
          </p>
        `;
      }
    }
    return false;
  }, true);
});


