// Supertone TTS Integration for Storybook
console.log('🎤 Supertone TTS 로드됨!');

class SupertoneTTS {
    constructor() {
        this.apiUrl = CONFIG.API.TTS_BASE_URL;
        try {
            const u = new URL(this.apiUrl, typeof window !== 'undefined' ? window.location.origin : undefined);
            this.ttsOrigin = `${u.protocol}//${u.host}`;
        } catch (e) {
            this.ttsOrigin = '';
        }
        this.voices = [];
        this.selectedVoice = null;
        this.audioElements = {}; // 페이지별 오디오 엘리먼트
        this.currentPageIndex = 0;
        this.isPlaying = false;
        this.autoNext = true;
    }

    // 사용 가능한 음성 목록 가져오기 (한국어만)
    async loadVoices() {
        try {
            const response = await fetch(`${this.apiUrl}/voices`);
            if (!response.ok) throw new Error('음성 목록을 불러올 수 없습니다.');

            const data = await response.json();
            // 한국어 음성만 로드
            this.voices = data.korean || [];

            console.log(`✅ 한국어 음성 ${this.voices.length}개 로드됨`);

            // 기본 음성 선택 (Sora 우선, 없으면 첫 번째 음성)
            if (this.voices.length > 0) {
                const soraVoice = this.voices.find(v => v.name && v.name.toLowerCase().includes('sora'));
                if (soraVoice) {
                    this.selectedVoice = soraVoice.voice_id;
                    console.log(`기본 음성: ${soraVoice.name} (${this.selectedVoice})`);
                } else {
                    this.selectedVoice = this.voices[0].voice_id;
                    console.log(`기본 음성: ${this.voices[0].name} (${this.selectedVoice})`);
                }
            } else {
                console.warn('⚠️ 한국어 음성을 찾을 수 없습니다.');
            }

            return this.voices;
        } catch (error) {
            console.error('❌ 음성 목록 로드 실패:', error);
            return [];
        }
    }

    // 단일 텍스트를 음성으로 변환
    async convertText(text, voiceId = null) {
        try {
            const response = await fetch(`${this.apiUrl}/convert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    voice_id: voiceId || this.selectedVoice,
                    language: 'ko',
                    style: 'neutral'
                })
            });

            if (!response.ok) throw new Error('TTS 변환 실패');

            const data = await response.json();
            console.log(`✅ TTS 변환 완료: ${data.filename}`);

            return `${this.ttsOrigin}${data.audioUrl}`;
        } catch (error) {
            console.error('❌ TTS 변환 실패:', error);
            return null;
        }
    }

    // 동화책 전체 페이지를 음성으로 변환
    async convertStorybook(pages) {
        try {
            console.log(`📚 동화책 ${pages.length}페이지 TTS 변환 시작...`);

            const response = await fetch(`${this.apiUrl}/convert-storybook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pages: pages,
                    voice_id: this.selectedVoice,
                    language: 'ko',
                    style: 'neutral'
                })
            });

            if (!response.ok) throw new Error('동화책 TTS 변환 실패');

            const data = await response.json();
            const results = data.results;

            console.log(`✅ 동화책 TTS 변환 완료: ${results.filter(r => r.success).length}/${pages.length}`);

            // 오디오 엘리먼트 생성
            results.forEach(result => {
                if (result.success) {
                    const audio = new Audio(`${this.ttsOrigin}${result.audioUrl}`);
                    audio.addEventListener('ended', () => this.onAudioEnded(result.page));
                    this.audioElements[result.page] = audio;
                }
            });

            return results;
        } catch (error) {
            console.error('❌ 동화책 TTS 변환 실패:', error);
            return null;
        }
    }

    // 특정 페이지 재생
    playPage(pageNumber) {
        // 모든 오디오 정지
        this.stopAll();

        const audio = this.audioElements[pageNumber];
        if (audio) {
            console.log(`▶️ 페이지 ${pageNumber} 재생`);
            audio.play();
            this.isPlaying = true;
            this.currentPageIndex = pageNumber - 1;

            // 페이지 네비게이션 동기화
            if (window.storybookNavigator) {
                window.storybookNavigator.goToPage(this.currentPageIndex);
            }
        } else {
            console.error(`페이지 ${pageNumber}의 오디오를 찾을 수 없습니다.`);
        }
    }

    // 전체 재생
    async playAll() {
        this.autoNext = true;

        // 동화책 페이지 정보 가져오기
        const storybookData = localStorage.getItem('currentStorybook');
        if (!storybookData) {
            console.error('❌ 동화책 데이터를 찾을 수 없습니다.');
            alert('동화책을 먼저 로드해주세요.');
            return;
        }

        const storybook = JSON.parse(storybookData);

        // 오디오가 아직 없으면 변환 먼저 수행
        if (Object.keys(this.audioElements).length === 0) {
            console.log('📚 동화책 TTS 변환 시작...');
            alert('동화책을 음성으로 변환하고 있습니다. 잠시만 기다려주세요...');
            await this.convertStorybook(storybook.pages);
            console.log('✅ TTS 변환 완료');
        }

        this.playPage(1);
    }

    // 일시정지
    pause() {
        Object.values(this.audioElements).forEach(audio => audio.pause());
        this.isPlaying = false;
        console.log('⏸️ 일시정지');
    }

    // 재개
    resume() {
        const currentPageNumber = this.currentPageIndex + 1;
        const audio = this.audioElements[currentPageNumber];
        if (audio) {
            audio.play();
            this.isPlaying = true;
            console.log('▶️ 재개');
        }
    }

    // 모든 오디오 정지
    stopAll() {
        Object.values(this.audioElements).forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
        this.isPlaying = false;
        console.log('⏹️ 정지');
    }

    // 오디오 종료 시 호출
    onAudioEnded(pageNumber) {
        console.log(`✅ 페이지 ${pageNumber} 재생 완료`);

        if (this.autoNext) {
            const nextPage = pageNumber + 1;
            if (this.audioElements[nextPage]) {
                setTimeout(() => {
                    this.playPage(nextPage);
                }, CONFIG.TIMING.TTS_AUTO_NEXT_DELAY);
            } else {
                console.log('📖 모든 페이지 재생 완료');
                this.isPlaying = false;
            }
        }
    }

    // 음성 변경
    setVoice(voiceId) {
        this.selectedVoice = voiceId;
        console.log(`음성 변경: ${voiceId}`);
    }
}

// 전역 인스턴스
let supertoneTTS = null;

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Supertone TTS 초기화 중...');
    supertoneTTS = new SupertoneTTS();

    // 음성 목록 로드
    await supertoneTTS.loadVoices();

    // UI 컨트롤 설정 (바로 설정)
    setupSupertoneTTSControls();

    // 동화책 로드 이벤트 리스닝 (이벤트가 발생하면 페이지 정보 업데이트)
    document.addEventListener('storybook-loaded', async function(e) {
        console.log('📖 동화책 로드됨');
        const storybook = e.detail.storybook;
        supertoneTTS.pages = storybook.pages;
    });
});

// UI 컨트롤 설정
function setupSupertoneTTSControls() {
    // 전체 읽기 버튼
    const playAllBtn = document.getElementById('tts-play-all');
    if (playAllBtn) {
        playAllBtn.addEventListener('click', () => {
            supertoneTTS.playAll();
        });
    }

    // 재생/일시정지 버튼
    const playPauseBtn = document.getElementById('tts-play-pause');
    const playPauseIcon = document.getElementById('tts-play-pause-icon');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (supertoneTTS.isPlaying) {
                supertoneTTS.pause();
                if (playPauseIcon) playPauseIcon.textContent = '재생';
            } else {
                supertoneTTS.resume();
                if (playPauseIcon) playPauseIcon.textContent = '일시정지';
            }
        });
    }

    // 정지 버튼
    const stopBtn = document.getElementById('tts-stop');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            supertoneTTS.stopAll();
            if (playPauseIcon) playPauseIcon.textContent = '재생';
        });
    }

    // 이전/다음 버튼
    const prevBtn = document.getElementById('tts-prev');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const prevPage = Math.max(1, supertoneTTS.currentPageIndex);
            supertoneTTS.playPage(prevPage);
        });
    }

    const nextBtn = document.getElementById('tts-next');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const nextPage = Math.min(Object.keys(supertoneTTS.audioElements).length, supertoneTTS.currentPageIndex + 2);
            supertoneTTS.playPage(nextPage);
        });
    }

    // 음성 선택 드롭다운
    const voiceSelect = document.getElementById('tts-voice');
    if (voiceSelect && supertoneTTS.voices.length > 0) {
        voiceSelect.innerHTML = '';
        supertoneTTS.voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.voice_id;
            option.textContent = `${voice.name} (${voice.gender}, ${voice.age})`;
            // Sora를 기본 선택
            if (voice.voice_id === supertoneTTS.selectedVoice) {
                option.selected = true;
            }
            voiceSelect.appendChild(option);
        });

        voiceSelect.addEventListener('change', (e) => {
            supertoneTTS.setVoice(e.target.value);
        });
    }

    console.log('✅ Supertone TTS 컨트롤 설정 완료');
}

console.log('✅ Supertone TTS 스크립트 로드 완료');
