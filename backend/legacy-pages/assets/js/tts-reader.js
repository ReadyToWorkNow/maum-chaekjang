// TTS Reader for Storybook
class TTSReader {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.currentPageIndex = 0;
        this.pages = [];
        this.isPlaying = false;
        this.isPaused = false;
        this.autoNext = CONFIG.TTS.AUTO_NEXT_DEFAULT;
        this.voices = [];
        this.selectedVoice = null;
        this.rate = CONFIG.TTS.DEFAULT_RATE;
        this.pitch = CONFIG.TTS.DEFAULT_PITCH;
        this.volume = CONFIG.TTS.DEFAULT_VOLUME;

        // Load voices
        this.loadVoices();

        // Voice loading might be async
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        this.voices = this.synth.getVoices();

        // 한국어 음성 우선 선택
        const koreanVoice = this.voices.find(voice => voice.lang.includes('ko'));
        if (koreanVoice) {
            this.selectedVoice = koreanVoice;
        } else if (this.voices.length > 0) {
            this.selectedVoice = this.voices[0];
        }

        console.log('Available voices:', this.voices.length);
        console.log('Selected voice:', this.selectedVoice?.name);
    }

    setPages(pages) {
        this.pages = pages;
        this.currentPageIndex = 0;
    }

    setVoice(voiceIndex) {
        if (voiceIndex >= 0 && voiceIndex < this.voices.length) {
            this.selectedVoice = this.voices[voiceIndex];
        }
    }

    setRate(rate) {
        this.rate = Math.max(0.5, Math.min(2.0, rate));
        if (this.utterance) {
            this.utterance.rate = this.rate;
        }
    }

    setPitch(pitch) {
        this.pitch = Math.max(0.5, Math.min(2.0, pitch));
        if (this.utterance) {
            this.utterance.pitch = this.pitch;
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.utterance) {
            this.utterance.volume = this.volume;
        }
    }

    readPage(pageIndex) {
        if (pageIndex < 0 || pageIndex >= this.pages.length) {
            console.error('Invalid page index:', pageIndex);
            return;
        }

        // Stop current reading but keep autoNext setting
        this.stop(false);

        this.currentPageIndex = pageIndex;
        const page = this.pages[pageIndex];

        // Sync with navigation (only if page is different)
        if (window.storybookNavigator && window.storybookNavigator.currentPageIndex !== pageIndex) {
            console.log('Syncing navigation to page', pageIndex + 1);
            window.storybookNavigator.goToPage(pageIndex);
        }

        console.log(`📖 Reading page ${pageIndex + 1}: ${page.title}`);

        // Create utterance
        this.utterance = new SpeechSynthesisUtterance();

        // Set text (title + content)
        const textToRead = `${page.title}. ${page.content}`;
        this.utterance.text = textToRead;

        // Set voice properties
        if (this.selectedVoice) {
            this.utterance.voice = this.selectedVoice;
        }
        this.utterance.rate = this.rate;
        this.utterance.pitch = this.pitch;
        this.utterance.volume = this.volume;
        this.utterance.lang = CONFIG.TTS.DEFAULT_LANG;

        // Event handlers
        this.utterance.onstart = () => {
            console.log('TTS started');
            this.isPlaying = true;
            this.isPaused = false;
            this.highlightPage(pageIndex);
            this.updateUI('playing');
        };

        this.utterance.onend = () => {
            console.log('TTS ended for page', pageIndex + 1);
            this.isPlaying = false;
            this.isPaused = false;
            this.removeHighlight(pageIndex);
            this.updateUI('stopped');

            // Auto-play next page
            if (this.autoNext && pageIndex < this.pages.length - 1) {
                console.log(`Will read next page (${pageIndex + 2}) in ${CONFIG.TIMING.TTS_AUTO_NEXT_DELAY}ms...`);
                setTimeout(() => {
                    const nextPageIndex = pageIndex + 1;

                    // Navigate to next page visually FIRST
                    if (window.storybookNavigator) {
                        console.log('Navigating to page', nextPageIndex + 1);
                        window.storybookNavigator.goToPage(nextPageIndex);
                    }

                    // Then read next page
                    setTimeout(() => {
                        console.log('Starting to read page', nextPageIndex + 1);
                        this.readPage(nextPageIndex);
                    }, CONFIG.TIMING.PAGE_TRANSITION_DELAY);
                }, CONFIG.TIMING.TTS_AUTO_NEXT_DELAY);
            } else if (pageIndex === this.pages.length - 1) {
                console.log('📖 Finished reading all pages');
            }
        };

        this.utterance.onerror = (event) => {
            console.error('TTS error:', event);
            this.isPlaying = false;
            this.isPaused = false;
            this.updateUI('error');
        };

        this.utterance.onpause = () => {
            console.log('TTS paused');
            this.isPaused = true;
            this.updateUI('paused');
        };

        this.utterance.onresume = () => {
            console.log('TTS resumed');
            this.isPaused = false;
            this.updateUI('playing');
        };

        // Boundary event for word highlighting (optional)
        this.utterance.onboundary = (event) => {
            // Can be used for word-by-word highlighting
            // console.log('Boundary:', event.charIndex);
        };

        // Speak
        this.synth.speak(this.utterance);
    }

    readAll() {
        this.autoNext = true;
        this.readPage(0);
    }

    pause() {
        if (this.isPlaying && !this.isPaused) {
            this.synth.pause();
        }
    }

    resume() {
        if (this.isPaused) {
            this.synth.resume();
        }
    }

    stop(resetAutoNext = true) {
        this.synth.cancel();
        this.isPlaying = false;
        this.isPaused = false;
        if (resetAutoNext) {
            this.autoNext = false;
        }
        this.removeHighlight(this.currentPageIndex);
        this.updateUI('stopped');
    }

    highlightPage(pageIndex) {
        const pageElement = document.querySelectorAll('.storybook-page')[pageIndex];
        if (pageElement) {
            pageElement.classList.add('tts-reading');
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    removeHighlight(pageIndex) {
        const pageElement = document.querySelectorAll('.storybook-page')[pageIndex];
        if (pageElement) {
            pageElement.classList.remove('tts-reading');
        }
    }

    updateUI(state) {
        // Emit custom event for UI update
        const event = new CustomEvent('tts-state-change', {
            detail: {
                state: state,
                currentPage: this.currentPageIndex,
                isPlaying: this.isPlaying,
                isPaused: this.isPaused
            }
        });
        document.dispatchEvent(event);
    }

    getVoiceList() {
        return this.voices.map((voice, index) => ({
            index: index,
            name: voice.name,
            lang: voice.lang,
            isKorean: voice.lang.includes('ko')
        }));
    }
}

// Global TTS instance
let ttsReader = null;

// Initialize TTS when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('TTS Reader initializing...');
    ttsReader = new TTSReader();

    // Listen for storybook loaded event
    document.addEventListener('storybook-loaded', function(e) {
        console.log('📖 Storybook loaded event received');
        setupTTSControls();
    });

    // Fallback: Setup TTS controls after delay if event not fired
    setTimeout(() => {
        if (!ttsReader.pages || ttsReader.pages.length === 0) {
            setupTTSControls();
        }
    }, CONFIG.TIMING.TTS_INIT_DELAY);
});

function setupTTSControls() {
    const storybookData = localStorage.getItem('currentStorybook');

    if (!storybookData) {
        console.log('No storybook data, TTS disabled');
        return;
    }

    const storybook = JSON.parse(storybookData);
    ttsReader.setPages(storybook.pages);

    console.log('TTS Ready with', storybook.pages.length, 'pages');

    // Setup event listeners
    setupTTSEventListeners();
    populateVoiceSelector();
}

function setupTTSEventListeners() {
    // Play All button
    const playAllBtn = document.getElementById('tts-play-all');
    if (playAllBtn) {
        playAllBtn.addEventListener('click', () => {
            ttsReader.readAll();
        });
    }

    // Play/Pause button
    const playPauseBtn = document.getElementById('tts-play-pause');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (ttsReader.isPlaying && !ttsReader.isPaused) {
                ttsReader.pause();
            } else if (ttsReader.isPaused) {
                ttsReader.resume();
            } else {
                ttsReader.readPage(ttsReader.currentPageIndex);
            }
        });
    }

    // Stop button
    const stopBtn = document.getElementById('tts-stop');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            ttsReader.stop();
        });
    }

    // Previous page button
    const prevBtn = document.getElementById('tts-prev');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            const prevIndex = Math.max(0, ttsReader.currentPageIndex - 1);
            ttsReader.readPage(prevIndex);
        });
    }

    // Next page button
    const nextBtn = document.getElementById('tts-next');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const nextIndex = Math.min(ttsReader.pages.length - 1, ttsReader.currentPageIndex + 1);
            ttsReader.readPage(nextIndex);
        });
    }

    // Rate slider
    const rateSlider = document.getElementById('tts-rate');
    const rateValue = document.getElementById('tts-rate-value');
    if (rateSlider) {
        rateSlider.addEventListener('input', (e) => {
            const rate = parseFloat(e.target.value);
            ttsReader.setRate(rate);
            if (rateValue) {
                rateValue.textContent = rate.toFixed(1) + 'x';
            }
        });
    }

    // Volume slider
    const volumeSlider = document.getElementById('tts-volume');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const volume = parseFloat(e.target.value);
            ttsReader.setVolume(volume);
        });
    }

    // Voice selector
    const voiceSelect = document.getElementById('tts-voice');
    if (voiceSelect) {
        voiceSelect.addEventListener('change', (e) => {
            const voiceIndex = parseInt(e.target.value);
            ttsReader.setVoice(voiceIndex);
        });
    }

    // Individual page read buttons
    document.querySelectorAll('.tts-read-page').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            ttsReader.readPage(index);
        });
    });

    // Listen to TTS state changes
    document.addEventListener('tts-state-change', (e) => {
        updateTTSUI(e.detail);
    });
}

function populateVoiceSelector() {
    const voiceSelect = document.getElementById('tts-voice');
    if (!voiceSelect) return;

    const voices = ttsReader.getVoiceList();
    voiceSelect.innerHTML = '';

    // Group Korean voices first
    const koreanVoices = voices.filter(v => v.isKorean);
    const otherVoices = voices.filter(v => !v.isKorean);

    if (koreanVoices.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '한국어';
        koreanVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.index;
            option.textContent = voice.name;
            optgroup.appendChild(option);
        });
        voiceSelect.appendChild(optgroup);
    }

    if (otherVoices.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = '기타';
        otherVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.index;
            option.textContent = `${voice.name} (${voice.lang})`;
            optgroup.appendChild(option);
        });
        voiceSelect.appendChild(optgroup);
    }
}

function updateTTSUI(detail) {
    const playPauseBtn = document.getElementById('tts-play-pause');
    const playPauseIcon = document.getElementById('tts-play-pause-icon');
    const currentPageDisplay = document.getElementById('tts-current-page');

    if (playPauseBtn && playPauseIcon) {
        if (detail.isPlaying && !detail.isPaused) {
            playPauseIcon.textContent = '⏸️';
            playPauseBtn.title = '일시정지';
        } else {
            playPauseIcon.textContent = '▶️';
            playPauseBtn.title = '재생';
        }
    }

    if (currentPageDisplay) {
        currentPageDisplay.textContent = `페이지 ${detail.currentPage + 1} / ${ttsReader.pages.length}`;
    }
}

console.log('✅ TTS Reader script loaded');
