// Configuration and Constants
const CONFIG = {
    // API Configuration
    API: {
        // Backend API base (e.g., http://localhost:3000/api)
        // Override via window.APP_CONFIG.API_BASE_URL if needed
        BASE_URL: (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
            ? window.APP_CONFIG.API_BASE_URL
            : (typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api'),

        // TTS server API base (defaults to same-origin /api/tts)
        // Override via window.APP_CONFIG.TTS_BASE_URL if needed
        TTS_BASE_URL: (typeof window !== 'undefined' && window.APP_CONFIG && window.APP_CONFIG.TTS_BASE_URL)
            ? window.APP_CONFIG.TTS_BASE_URL
            : (typeof window !== 'undefined' ? `${window.location.origin}/api/tts` : '/api/tts'),
    },

    // Image Configuration
    IMAGE: {
        DALLE_SIZE: '1024x1024',
        DALLE_QUALITY: 'standard',
        DALLE_STYLE: 'natural',
        FALLBACK_IMAGE: 'images/pic01.jpg',
    },

    // Timing Configuration (ms)
    TIMING: {
        DALLE_DELAY: 5000,
        NAVIGATION_INIT_DELAY: 1000,
        TTS_INIT_DELAY: 500,
        TTS_AUTO_NEXT_DELAY: 1500,
        PAGE_TRANSITION_DELAY: 500,
    },

    // GPT Configuration
    GPT: {
        MODEL: 'gpt-4',
        TEMPERATURE: 0.8,
        MAX_TOKENS: 3000,
        PAGES_COUNT: 5,
    },

    // TTS Configuration
    TTS: {
        DEFAULT_RATE: 1.0,
        DEFAULT_PITCH: 1.0,
        DEFAULT_VOLUME: 1.0,
        DEFAULT_LANG: 'ko-KR',
        AUTO_NEXT_DEFAULT: true,
    },

    // UI Messages
    MESSAGES: {
        LOADING: '동화책을 만드는 중입니다... 잠시만 기다려주세요.',
        ERROR_GENERIC: '문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        ERROR_API_KEY: '서비스 연결에 문제가 있습니다. 관리자에게 문의해주세요.',
        ERROR_RATE_LIMIT: '요청이 많습니다. 잠시 후 다시 시도해주세요.',
        ERROR_TIMEOUT: '시간이 초과되었습니다. 다시 시도해주세요.',
        ERROR_NETWORK: '네트워크 연결을 확인해주세요.',
        ERROR_PARSE: '응답 처리 중 문제가 발생했습니다. 다시 시도해주세요.',
        SUCCESS_GENERATED: '동화 생성이 완료되었습니다!',
        PROGRESS_STORY: '동화 내용을 만드는 중...',
        PROGRESS_IMAGE: '그림을 그리는 중...',
    },
};

// User-friendly error message mapper
function getUserFriendlyError(error) {
    const errorMessage = error?.message || String(error || '');

    if (errorMessage.includes('API key') || errorMessage.includes('401')) {
        return CONFIG.MESSAGES.ERROR_API_KEY;
    }
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        return CONFIG.MESSAGES.ERROR_RATE_LIMIT;
    }
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        return CONFIG.MESSAGES.ERROR_TIMEOUT;
    }
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        return CONFIG.MESSAGES.ERROR_NETWORK;
    }
    if (errorMessage.includes('JSON') || errorMessage.includes('parse')) {
        return CONFIG.MESSAGES.ERROR_PARSE;
    }

    return CONFIG.MESSAGES.ERROR_GENERIC;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getUserFriendlyError };
}

console.log('🛠️ Config loaded');
