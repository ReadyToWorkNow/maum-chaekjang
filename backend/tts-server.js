/**
 * ⚠️ DEPRECATED - 이 파일은 사용하지 않습니다
 *
 * TTS 기능은 server.js에 통합되어 있습니다.
 * server.js를 실행하면 TTS API를 포함한 모든 기능을 사용할 수 있습니다.
 *
 * 이 파일은 레거시 참고용으로만 보관되며, 실제로는 사용되지 않습니다.
 * 배포 시 server.js만 실행하면 됩니다.
 */

// Supertone TTS API Backend Server (axios 버전)
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.TTS_PORT || 3000;

app.use(cors());
app.use(express.json());

const SUPERTONE_API_KEY = process.env.SUPERTONE_API_KEY; // ❗ .env에만 보관
const BASE_URL = 'https://supertoneapi.com';

// 출력 폴더
const OUTPUT_DIR = path.join(__dirname, 'audio_output');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
app.use('/audio', express.static(OUTPUT_DIR));

/** 공용: 에러 응답 안전 파싱 */
function safeError(e) {
  if (e.response) {
    const status = e.response.status;
    let data = e.response.data;
    try {
      if (Buffer.isBuffer(data)) data = JSON.parse(data.toString('utf8'));
    } catch { /* ignore */ }
    return { status, data: data || { error: 'Upstream error' } };
  }
  return { status: 500, data: { error: e.message } };
}

/** 1) 보이스 목록 */
app.get('/api/tts/voices', async (req, res) => {
  try {
    // Sora 우선 검색
    let soraVoice = null;
    try {
      const sora = await axios.get(`${BASE_URL}/v1/voices/search?name=Sora`, {
        headers: { 'x-sup-api-key': SUPERTONE_API_KEY },
      });
      const list = sora.data?.items || sora.data?.voices || sora.data || [];
      if (Array.isArray(list) && list.length) soraVoice = list[0];
    } catch { /* Sora 없으면 스킵 */ }

    // 한국어 보이스
    const r = await axios.get(`${BASE_URL}/v1/voices/search?language=ko`, {
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
    const { status, data } = safeError(e);
    res.status(status).json(data);
  }
});

/** 2) 단일 텍스트 → 오디오 파일 저장 후 URL 반환 */
app.post('/api/tts/convert', async (req, res) => {
  try {
    const { text, voice_id, language = 'ko', style = 'neutral', model = 'sona_speech_1' } = req.body;
    if (!text || !voice_id) return res.status(400).json({ error: 'text, voice_id 필요' });

    const r = await axios.post(
      `${BASE_URL}/v1/text-to-speech/${voice_id}`,
      { text, language, style, model },
      {
        headers: { 'x-sup-api-key': SUPERTONE_API_KEY, 'Content-Type': 'application/json' },
        responseType: 'arraybuffer',
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
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, Buffer.from(r.data));

    const audioLength = r.headers['x-audio-length'] || null;
    res.json({ audioUrl: `/audio/${filename}`, audioLength, filename });
  } catch (e) {
    const { status, data } = safeError(e);
    res.status(status).json(data);
  }
});

/** 3) 동화 페이지 배열 → 각 페이지 오디오 파일 저장 후 목록 반환 */
app.post('/api/tts/convert-storybook', async (req, res) => {
  try {
    const { pages, voice_id, language = 'ko', style = 'neutral' } = req.body;
    if (!Array.isArray(pages) || !pages.length) return res.status(400).json({ error: 'pages 배열 필요' });
    if (!voice_id) return res.status(400).json({ error: 'voice_id 필요' });

    const results = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] || {};
      const pageNum = page.number ?? (i + 1);
      const text = [page.title, page.content].filter(Boolean).join('. ');

      try {
        const r = await axios.post(
          `${BASE_URL}/v1/text-to-speech/${voice_id}`,
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
    const { status, data } = safeError(e);
    res.status(status).json(data);
  }
});

app.listen(PORT, () => {
  console.log(`Supertone TTS Server http://localhost:${PORT}`);
  console.log(`GET  /api/tts/voices`);
  console.log(`POST /api/tts/convert`);
  console.log(`POST /api/tts/convert-storybook`);
  console.log(`GET  /audio/*`);
});
