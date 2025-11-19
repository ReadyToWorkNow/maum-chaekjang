/**
 * Simple Express Backend API Server (UTF-8 Fixed, Ready-to-Run)
 * - API를 안전하게 노출하고 프론트엔드 요청을 중계
 * - 인코딩(UTF-8) 강제, 한글 로그 정상화
 * - OpenAI: 동화 생성, 이미지 생성
 * - Supertone: TTS 단건/배치 변환
 */



const express = require('express');
const cors = require('cors');
const multer = require('multer');
const FormData = require('form-data');
let fetch = null;
try {
  // Node 18+ 는 글로벌 fetch 제공. 없을 경우 node-fetch 로 폴백
  fetch = global.fetch || require('node-fetch');
} catch (_) {
  fetch = require('node-fetch');
}
const fs = require('fs');
const { Readable, pipeline: _pipeline } = require('stream');
const { promisify } = require('util');
const pipeline = promisify(_pipeline);
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ------------------------------
 * Middleware
 * ------------------------------ */
// CORS 설정 (프론트엔드 URL 허용)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://maum-chaekjang-web.onrender.com',
  'https://story-frontend-ozbq.onrender.com'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: Origin ${origin} not allowed`));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '2mb', type: 'application/json' }));

// API 서버 헬스체크
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Maum Chaekjang Backend API Server',
    version: '1.0.0'
  });
});

// 공통 헤더 (예: 보안 헤더 일부)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

/* ------------------------------
 * OpenAI 설정
 * ------------------------------ */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('[ERROR] OPENAI_API_KEY is not configured.');
  console.log('[INFO] Add the following to your .env file:\nOPENAI_API_KEY=your-key-here');
}

// Helper: save fetch Response body (web stream or node stream) to file
async function saveResponseToFile(response, filepath) {
  if (response.body && typeof response.body.pipe === 'function') {
    await pipeline(response.body, fs.createWriteStream(filepath));
    return;
  }
  if (response.body && typeof response.body.getReader === 'function') {
    const nodeStream = Readable.fromWeb(response.body);
    await pipeline(nodeStream, fs.createWriteStream(filepath));
    return;
  }
  if (typeof response.arrayBuffer === 'function') {
    const buf = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(filepath, buf);
    return;
  }
  throw new Error('unsupported_response_body');
}

/* ------------------------------
 * Helpers
 * ------------------------------ */
function typeJson(res) {
  // 모든 JSON 응답에 UTF-8
  res.type('application/json; charset=utf-8');
  return res;
}

function safeParseStoryJson(raw) {
  // ```json ... ``` 코드블록 안 JSON 추출
  const fence = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1]);
    } catch (_) {}
  }
  // 코드블록이 없을 경우 첫 번째 대괄호 배열만 추출
  const arrMatch = raw.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch (_) {}
  }
  // 그대로 파싱 시도
  return JSON.parse(raw);
}

/* ------------------------------
 * API: 동화 생성 (Chat Completions)
 * ------------------------------ */
app.post('/api/generate-story', async (req, res) => {
  console.log('[INFO] Story generation request received');

  try {
    const { formData } = req.body || {};
    if (!formData) {
      return typeJson(res).status(400).json({ error: 'formData가 필요합니다.' });
    }

    const { childName, childAge, abuseType, childSituation, childInterests } = formData;
    console.log('[INFO] Input data:', { childName, childAge, abuseType });

    const systemPrompt =
      '당신은 아동 심리를 이해하는 전문 동화 작가이자 동물 삽화 기획자입니다. 학대를 경험한 아이들을 위해 치유 동화를 작성하는 것이 당신의 임무입니다, 첫 페이지에서 만들어진 주인공의 종족, 종, 성별은 모든 이미지 작성 프롬프트에 추가하세요';

    const userPrompt = `학대를 경험한 아이를 위한 치유 동화를 5페이지 분량의 동화책 형식으로 만들어주세요.

**아이 정보:**
- 이름: ${childName}
- 나이: ${childAge}세
- 겪은 학대 유형: ${abuseType}
- 상황: ${childSituation}
- 좋아하는 것: ${childInterests}

**중요 지침:**
!최우선! - 내 이야기하기에서 온 내용(아이정보 제외)은 최우선 프롬프트로만 작성해주세요, 각 페이지는 어린이가 읽기 쉬운 2-3문단으로 작성하세요, 희망적이고 긍정적인 메시지를 전달하세요, 아이가 이해하기 쉽게 따뜻하고 부드러운 어조로 작성하세요. 존댓말을 사용하세요.
0. 아이의 실제 이름("${childName}")은 **동화 본문에 쓰지 마세요.**
   - 제목/헌사/표지에만 쓰고, 본문에서는 사람 이름을 사용하지 않습니다.
1. 아이가 투영할 수 있는 동물 캐릭터를 주인공으로 사용하세요.
2. 아이가 이해하기 쉽게 따뜻하고 부드러운 어조로 작성하세요. 존댓말을 사용하세요.
3. 희망적이고 긍정적인 메시지를 전달하세요.
4. 아이가 겪은 상황을 직접적으로 언급하지 말고, 은유적으로 표현하세요.
5. 아이가 회복하고 성장할 수 있다는 메시지를 담아주세요.
6. 각 페이지는 어린이가 읽기 쉬운 2-3문단으로 작성하세요.

**출력 형식:**
반드시 다음 JSON 형식으로만 출력해주세요. 다른 텍스트는 포함하지 마세요.

\`\`\`json
[
  {
    "page": 1,
    "title": "페이지 제목",
    "text": "해당 페이지 본문(2-3문단)",
    "image_prompt": "A warm watercolor illustration for children's book, featuring ..."
  },
    {
    "page": 2,
    "text": "해당 페이지 본문(2-3문단)",
    "image_prompt": "A warm watercolor illustration for children's book, featuring ..."
  },
      {
    "page": 3,
    "text": "해당 페이지 본문(2-3문단)",
    "image_prompt": "A warm watercolor illustration for children's book, featuring ..."
  }
  // 총 5개 페이지
]
\`\`\`
`;

    console.log('[INFO] Calling GPT API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ GPT API 오류:', errorData);
      return typeJson(res).status(response.status).json({ error: errorData });
    }

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content || '';
    if (!content) {
      return typeJson(res).status(500).json({ error: 'OpenAI 응답이 비어 있습니다.' });
    }

    let storyPages = [];
    try {
      storyPages = safeParseStoryJson(content);
    } catch (e) {
      console.error('❌ JSON 파싱 실패:', e.message);
      return typeJson(res).status(500).json({ error: 'JSON 파싱 실패 (모델 출력 형식 확인 필요)' });
    }

    console.log('✅ 동화 생성 완료:', storyPages.length, '페이지');

    return typeJson(res).json({
      pages: storyPages,
      childName,
    });
  } catch (error) {
    console.error('❌ 동화 생성 처리 오류:', error);
    return typeJson(res).status(500).json({ error: error.message });
  }
});

/* ------------------------------
 * API: 이미지 생성 (DALL·E 3)
 * ------------------------------ */
app.post('/api/generate-image', async (req, res) => {
  console.log('[INFO] Image generation request received');
  try {
    const { prompt } = req.body || {};
    if (!prompt) return typeJson(res).status(400).json({ error: 'prompt가 필요합니다.' });

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'natural',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ DALL·E 오류:', errorData);
      return typeJson(res).status(response.status).json({ error: errorData });
    }

    const data = await response.json();
    const url = data?.data?.[0]?.url;
    if (!url) return typeJson(res).status(500).json({ error: '이미지 URL이 반환되지 않았습니다.' });

    console.log('✅ 이미지 생성 완료');
    return typeJson(res).json({ imageUrl: url });
  } catch (error) {
    console.error('❌ 이미지 생성 처리 오류:', error);
    return typeJson(res).status(500).json({ error: error.message });
  }
});


/* ------------------------------
 * Supertone TTS
 * ------------------------------ */


// Supertone TTS API Backend Server (axios 버전)

const axios = require('axios');
require('dotenv').config();

// (CORS와 JSON 미들웨어는 이미 위에서 설정됨 - 중복 제거)

// 환경설정
const SUPERTONE_API_KEY = process.env.SUPERTONE_API_KEY; // ← 하드코드 금지
const SUPERTONE_BASE_URL = 'https://supertoneapi.com';

// 오디오 출력 디렉토리 & 정적 서빙
const OUTPUT_DIR = path.join(__dirname, 'audio_output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
app.use('/audio', express.static(OUTPUT_DIR));

// 공용 에러 파서
function safeAxiosError(e) {
  if (e.response) {
    const status = e.response.status;
    let data = e.response.data;
    try {
      if (Buffer.isBuffer(data)) data = JSON.parse(data.toString('utf8'));
    } catch {}
    return { status, data: data || { error: 'Upstream error' } };
  }
  return { status: 500, data: { error: e.message } };
}

/* ------------------------------
 * 1) 가용 한국어 보이스 조회 (+Sora 우선)
 * ------------------------------ */
app.get('/api/tts/voices', async (req, res) => {
  try {
    if (!SUPERTONE_API_KEY) return res.status(400).json({ error: 'SUPERTONE_API_KEY가 필요합니다.' });

    let soraVoice = null;
    try {
      const sora = await axios.get(`${SUPERTONE_BASE_URL}/v1/voices/search?name=Sora`, {
        headers: { 'x-sup-api-key': SUPERTONE_API_KEY },
      });
      const list = sora.data?.items || sora.data?.voices || sora.data || [];
      if (Array.isArray(list) && list.length) soraVoice = list[0];
    } catch { /* Sora 없으면 패스 */ }

    const r = await axios.get(`${SUPERTONE_BASE_URL}/v1/voices/search?language=ko`, {
      headers: { 'x-sup-api-key': SUPERTONE_API_KEY },
    });
    let korean = r.data?.items || r.data?.voices || r.data || [];
    if (!Array.isArray(korean)) korean = [];

    if (soraVoice) {
      korean = korean.filter(v => v.voice_id !== soraVoice.voice_id);
      korean = [soraVoice, ...korean].slice(0, 20);
    } else {
      korean = korean.slice(0, 20);
    }

    res.json({ all: korean, korean });
  } catch (e) {
    const { status, data } = safeAxiosError(e);
    res.status(status).json(data);
  }
});

/* ------------------------------
 * 2) 단건 TTS 변환 → 파일 저장 후 URL 반환
 * ------------------------------ */
app.post('/api/tts/convert', async (req, res) => {
  try {
    const { text, voice_id, language = 'ko', style = 'neutral', model = 'sona_speech_1' } = req.body || {};
    if (!text || !voice_id) return res.status(400).json({ error: 'text와 voice_id가 필요합니다.' });
    if (!SUPERTONE_API_KEY) return res.status(400).json({ error: 'SUPERTONE_API_KEY가 필요합니다.' });

    const r = await axios.post(
      `${SUPERTONE_BASE_URL}/v1/text-to-speech/${voice_id}`,
      { text, language, style, model },
      {
        headers: { 'x-sup-api-key': SUPERTONE_API_KEY, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',      // Binary response
        validateStatus: () => true,
      }
    );

    if (r.status < 200 || r.status >= 300) {
      let errJson = null;
      try { errJson = JSON.parse(Buffer.from(r.data).toString('utf8')); } catch {}
      return res.status(r.status).json(errJson || { error: 'TTS 변환 실패' });
    }

    const ct = r.headers['content-type'] || 'audio/wav';
    const ext = ct.includes('mp3') ? 'mp3' : (ct.includes('mp4') ? 'mp4' : 'wav');
    const filename = `tts_${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), Buffer.from(r.data));

    res.json({
      audioUrl: `/audio/${filename}`,
      audioLength: r.headers['x-audio-length'] || null,
      filename,
    });
  } catch (e) {
    const { status, data } = safeAxiosError(e);
    res.status(status).json(data);
  }
});

/* ------------------------------
 * 3) 동화 페이지 배치 변환 → 각 파일 저장 후 목록 반환
 * ------------------------------ */
app.post('/api/tts/convert-storybook', async (req, res) => {
  try {
    const { pages, voice_id, language = 'ko', style = 'neutral' } = req.body || {};
    if (!Array.isArray(pages) || !pages.length) return res.status(400).json({ error: 'pages 배열이 필요합니다.' });
    if (!voice_id) return res.status(400).json({ error: 'voice_id가 필요합니다.' });
    if (!SUPERTONE_API_KEY) return res.status(400).json({ error: 'SUPERTONE_API_KEY가 필요합니다.' });

    const results = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] || {};
      const pageNum = page.number ?? (i + 1);
      const text = [page.title, page.content].filter(Boolean).join('. ');

      try {
        const r = await axios.post(
          `${SUPERTONE_BASE_URL}/v1/text-to-speech/${voice_id}`,
          { text, language, style, model: 'sona_speech_1' },
          {
            headers: { 'x-sup-api-key': SUPERTONE_API_KEY, 'Content-Type': 'application/json' },
            responseType: 'arraybuffer',
            validateStatus: () => true,
          }
        );

        if (r.status < 200 || r.status >= 300) {
          let errJson = null;
          try { errJson = JSON.parse(Buffer.from(r.data).toString('utf8')); } catch {}
          results.push({ page: pageNum, success: false, error: (errJson && errJson.error) || `TTS ${r.status}` });
          continue;
        }

        const ct = r.headers['content-type'] || 'audio/wav';
        const ext = ct.includes('mp3') ? 'mp3' : (ct.includes('mp4') ? 'mp4' : 'wav');
        const filename = `storybook_page${pageNum}_${Date.now()}.${ext}`;
        fs.writeFileSync(path.join(OUTPUT_DIR, filename), Buffer.from(r.data));

        results.push({
          page: pageNum,
          success: true,
          audioUrl: `/audio/${filename}`,
          audioLength: r.headers['x-audio-length'] || null,
          filename,
        });
      } catch (e) {
        results.push({ page: pageNum, success: false, error: e.message });
      }
    }

    res.json({ results, success: results.every(r => r.success) });
  } catch (e) {
    const { status, data } = safeAxiosError(e);
    res.status(status).json(data);
  }
});

/* ------------------------------
 * API: Process Story (동화책 페이지 생성)
 * ------------------------------ */
app.post('/api/process-story', async (req, res) => {
  console.log('[INFO] Process story request received');

  try {
    const { storyLines } = req.body;
    console.log('[INFO] process-story received data:', storyLines);
    console.log('[INFO] Data type:', typeof storyLines, Array.isArray(storyLines));

    if (!OPENAI_API_KEY) {
      return typeJson(res).status(500).json({ error: 'OPENAI_API_KEY is not configured' });
    }

    const systemPrompt = `당신은 아동용 동화에 들어갈 전문 삽화가 및 글 편집자입니다.
아이에게 유해한 내용을 배제하고 그림을 생성합니다.
제공된 이야기에 따라 순서대로 장면번호만큼의 삽화를 생성합니다.
[#장면]으로 표시된 내용은 삽화의 내용 및 글에 포함하지 않습니다.

제공된 스토리를 분석하여 각 장면마다 다음 형식의 JSON 배열을 생성하세요:
- 각 페이지는 2-3문단의 텍스트를 포함합니다
- 각 페이지는 따뜻한 수채화 스타일의 영문 이미지 프롬프트를 포함합니다
- 이미지 프롬프트는 "A warm watercolor illustration for children's book, featuring..."로 시작합니다
- 캐릭터의 일관성을 유지하도록 프롬프트를 작성합니다`;

    const userPrompt = `다음 스토리를 동화책 형식으로 변환해주세요:\n\n${storyLines.join('\n')}`;
    console.log('[INFO] AI prompt:', userPrompt);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_storybook_pages',
              description: '동화책 페이지를 생성합니다',
              parameters: {
                type: 'object',
                properties: {
                  pages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        page: { type: 'number' },
                        text: { type: 'string' },
                        image_prompt: { type: 'string' }
                      },
                      required: ['page', 'text', 'image_prompt'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['pages'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_storybook_pages' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return typeJson(res).status(429).json({ error: 'AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' });
      }
      if (response.status === 402) {
        return typeJson(res).status(402).json({ error: 'AI 크레딧이 부족합니다.' });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const pages = JSON.parse(toolCall.function.arguments).pages;
    console.log('[INFO] Generated pages count:', pages.length);
    console.log('[INFO] First page sample:', pages[0]);

    return typeJson(res).json({ pages });
  } catch (error) {
    console.error('[ERROR] Error in process-story:', error);
    return typeJson(res).status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/* ------------------------------
 * API: Generate Story Images (DALL-E 3)
 * ------------------------------ */
app.post('/api/generate-story-images', async (req, res) => {
  console.log('[INFO] Generate story images request received');

  try {
    const { imagePrompt } = req.body;

    if (!OPENAI_API_KEY) {
      return typeJson(res).status(500).json({ error: 'OPENAI_API_KEY is not configured' });
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard'
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return typeJson(res).status(429).json({ error: 'AI 요청 한도를 초과했습니다.' });
      }
      if (response.status === 402) {
        return typeJson(res).status(402).json({ error: 'AI 크레딧이 부족합니다.' });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image in response');
    }

    return typeJson(res).json({ imageUrl });
  } catch (error) {
    console.error('[ERROR] Error in generate-story-images:', error);
    return typeJson(res).status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/* ------------------------------
 * API: Generate TTS (Supertone)
 * ------------------------------ */
app.post('/api/generate-tts-supertone', async (req, res) => {
  console.log('[INFO] Generate TTS request received');

  try {
    const { text, voiceId } = req.body;

    if (!text) {
      return typeJson(res).status(400).json({ error: 'Text is required' });
    }

    const SUPERTONE_API_KEY = process.env.SUPERTONE_API_KEY;
    if (!SUPERTONE_API_KEY) {
      return typeJson(res).status(500).json({ error: 'SUPERTONE_API_KEY is not configured' });
    }

    const SUPERTONE_CONFIG = {
      BASE_URL: 'https://supertoneapi.com',
      MODEL: 'sona_speech_1',
      DEFAULT_VOICE_ID: 'f32a02422bd88da70fddb2',
      LANGUAGE: 'ko',
      STYLE: 'neutral',
      OUTPUT_FORMAT: 'mp3'
    };

    const targetVoiceId = voiceId || SUPERTONE_CONFIG.DEFAULT_VOICE_ID;

    console.log('[INFO] Sora TTS generating...');
    console.log(`[INFO] - Text length: ${text.length} characters`);
    console.log(`[INFO] - Voice ID: ${targetVoiceId}`);
    console.log(`[INFO] - Model: ${SUPERTONE_CONFIG.MODEL}`);

    const response = await fetch(
      `${SUPERTONE_CONFIG.BASE_URL}/v1/text-to-speech/${targetVoiceId}?output_format=${SUPERTONE_CONFIG.OUTPUT_FORMAT}`,
      {
        method: 'POST',
        headers: {
          'x-sup-api-key': SUPERTONE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          language: SUPERTONE_CONFIG.LANGUAGE,
          style: SUPERTONE_CONFIG.STYLE,
          model: SUPERTONE_CONFIG.MODEL,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ERROR] Supertone API error:', response.status, errorText);
      throw new Error(`Supertone API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const bytes = Buffer.from(audioBuffer);
    const base64Audio = bytes.toString('base64');

    const audioLength = response.headers.get('x-audio-length');
    if (audioLength) {
      console.log(`[INFO] Audio generation complete: ${audioLength} seconds`);
    }

    return typeJson(res).json({ audioContent: base64Audio });
  } catch (error) {
    console.error('[ERROR] TTS generation failed:', error);
    return typeJson(res).status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/* ------------------------------
 * 서버 시작
 * ------------------------------ */
app.listen(PORT, () => {
  console.log(`[INFO] Supertone TTS Server running at http://localhost:${PORT}`);
  console.log(`GET  /api/tts/voices`);
  console.log(`POST /api/tts/convert`);
  console.log(`POST /api/tts/convert-storybook`);
  console.log(`POST /api/process-story`);
  console.log(`POST /api/generate-story-images`);
  console.log(`POST /api/generate-tts-supertone`);
  console.log(`GET  /audio/*`);
});




/* ------------------------------
 * n8n 웹훅 프록시 (CORS 우회)
 * ------------------------------ */
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/proxy/voice-recording', upload.single('audio'), async (req, res) => {
  console.log('[INFO] Voice recording webhook proxy request received');

  try {
    const n8nWebhookUrl = 'https://robotshin.app.n8n.cloud/webhook/voice_recording';

    if (!req.file) {
      console.error('[ERROR] No audio file in request');
      return typeJson(res).status(400).json({ error: 'No audio file provided' });
    }

    console.log('[INFO] Audio file received:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // FormData 생성 및 오디오 파일 추가
    const formData = new FormData();
    formData.append('audio', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // 추가 메타데이터
    if (req.body.timestamp) formData.append('timestamp', req.body.timestamp);
    if (req.body.mimeType) formData.append('mimeType', req.body.mimeType);
    if (req.body.size) formData.append('size', req.body.size);

    // n8n 웹훅으로 FormData 전달
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ERROR] n8n webhook failed:', response.status, errorText);
      return typeJson(res).status(response.status).json({
        error: 'n8n webhook failed',
        details: errorText
      });
    }

    const data = await response.json();
    console.log('[SUCCESS] n8n webhook response received');

    return typeJson(res).json(data);
  } catch (error) {
    console.error('[ERROR] Webhook proxy error:', error);
    return typeJson(res).status(500).json({ error: error.message });
  }
});

/* ------------------------------
 * MySQL (children) configuration (optional)
 * ------------------------------ */
let mysql = null;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  console.warn('mysql2 모듈이 설치되어 있지 않아 DB 기능이 비활성화됩니다. npm install mysql2 로 설치하세요.');
}
const DB_HOST = process.env.DB_HOST || '';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || '';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || '';

let dbPool;
async function getDb() {
  if (!mysql) throw new Error('mysql2_not_installed');
  if (!dbPool) {
    dbPool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      namedPlaceholders: true,
    });
    await ensureChildrenTable();
  }
  return dbPool;
}

async function ensureChildrenTable() {
  const pool = await getDb();
  await pool.query(`CREATE TABLE IF NOT EXISTS children (
    child_id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    age INT,
    gender VARCHAR(1),
    guardian_status VARCHAR(32),
    abuse_type VARCHAR(32),
    discovered_at DATE,
    rescued_by VARCHAR(128),
    recovery_stage VARCHAR(32),
    note TEXT,
    created_at DATETIME,
    updated_at DATETIME
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
}

// DB health check
app.get('/api/db/health', async (req, res) => {
  try {
    const pool = await getDb();
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, result: rows[0] });
  } catch (err) {
    if (err.message === 'mysql2_not_installed') {
      return res.status(501).json({ ok: false, error: 'mysql2_not_installed' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ------------------------------
 * Children API routes
 * ------------------------------ */
app.get('/api/children', async (req, res) => {
  try {
    const pool = await getDb();
    const [rows] = await pool.query('SELECT * FROM children ORDER BY updated_at DESC, child_id DESC');
    res.json({ items: rows });
  } catch (err) {
    console.error('GET /api/children error:', err.message);
    if (err.message === 'mysql2_not_installed') return res.status(501).json({ error: 'mysql2_not_installed' });
    res.status(500).json({ error: 'DB 연결 실패' });
  }
});

app.get('/api/children/:id', async (req, res) => {
  try {
    const pool = await getDb();
    const [rows] = await pool.query('SELECT * FROM children WHERE child_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/children/:id error:', err.message);
    if (err.message === 'mysql2_not_installed') return res.status(501).json({ error: 'mysql2_not_installed' });
    res.status(500).json({ error: 'DB 연결 실패' });
  }
});

app.post('/api/children/bulk', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : (req.body.items || []);
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: '배열 형식의 데이터가 필요합니다' });
    }
    const pool = await getDb();
    const sql = `REPLACE INTO children
      (child_id, name, age, gender, guardian_status, abuse_type, discovered_at, rescued_by, recovery_stage, note, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    let ok = 0;
    for (const it of items) {
      try {
        await pool.query(sql, [
          it.child_id,
          it.name,
          it.age,
          it.gender,
          it.guardian_status,
          it.abuse_type,
          it.discovered_at,
          it.rescued_by,
          it.recovery_stage,
          it.note,
          it.created_at,
          it.updated_at,
        ]);
        ok++;
      } catch (e) {
        console.error('bulk item error', it.child_id, e.message);
      }
    }
    res.json({ inserted: ok, total: items.length });
  } catch (err) {
    console.error('POST /api/children/bulk error:', err.message);
    if (err.message === 'mysql2_not_installed') return res.status(501).json({ error: 'mysql2_not_installed' });
    res.status(500).json({ error: 'DB 저장 실패' });
  }
});

/* ------------------------------
 * Abused child API (existing table)
 * ------------------------------ */
app.get('/api/abused-child', async (req, res) => {
  try {
    const pool = await getDb();
    const [rows] = await pool.query('SELECT * FROM abused_child ORDER BY updated_at DESC, child_id DESC');
    res.json({ items: rows });
  } catch (err) {
    console.error('GET /api/abused-child error:', err.message);
    if (err.message === 'mysql2_not_installed') return res.status(501).json({ error: 'mysql2_not_installed' });
    res.status(500).json({ error: 'DB 연결 실패' });
  }
});

app.post('/api/abused-child', async (req, res) => {
  try {
    const b = req.body || {};
    // Basic validation
    const required = ['child_id','name','age','gender','abuse_type','discovered_at'];
    for (const k of required) {
      if (b[k] === undefined || b[k] === null || b[k] === '') {
        return res.status(400).json({ error: `필수 항목 누락: ${k}` });
      }
    }
    const pool = await getDb();
    const sql = `INSERT INTO abused_child
      (child_id, name, age, gender, guardian_status, abuse_type, discovered_at, rescued_by, recovery_stage, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name=VALUES(name), age=VALUES(age), gender=VALUES(gender), guardian_status=VALUES(guardian_status),
        abuse_type=VALUES(abuse_type), discovered_at=VALUES(discovered_at), rescued_by=VALUES(rescued_by),
        recovery_stage=VALUES(recovery_stage), note=VALUES(note)`;
    await pool.query(sql, [
      b.child_id,
      b.name,
      b.age,
      b.gender,
      b.guardian_status || 'none',
      b.abuse_type,
      b.discovered_at,
      b.rescued_by || null,
      b.recovery_stage || 'stable',
      b.note || null,
    ]);
    res.json({ ok: true, child_id: b.child_id });
  } catch (err) {
    console.error('POST /api/abused-child error:', err.message);
    if (err.message === 'mysql2_not_installed') return res.status(501).json({ error: 'mysql2_not_installed' });
    res.status(500).json({ error: 'DB 저장 실패' });
  }
});

app.get('/api/abused-child/:id', async (req, res) => {
  try {
    const pool = await getDb();
    const [rows] = await pool.query('SELECT * FROM abused_child WHERE child_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'not_found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/abused-child/:id error:', err.message);
    if (err.message === 'mysql2_not_installed') return res.status(501).json({ error: 'mysql2_not_installed' });
    res.status(500).json({ error: 'DB 연결 실패' });
  }
});

