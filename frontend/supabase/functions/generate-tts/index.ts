import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supertone Sora 모델 설정
const SUPERTONE_CONFIG = {
  BASE_URL: 'https://supertoneapi.com',
  MODEL: 'sona_speech_1',
  DEFAULT_VOICE_ID: 'f32a02422bd88da70fddb2',
  LANGUAGE: 'ko',
  STYLE: 'neutral',
  OUTPUT_FORMAT: 'mp3'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voiceId } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    const SUPERTONE_API_KEY = Deno.env.get('SUPERTONE_API_KEY');
    if (!SUPERTONE_API_KEY) {
      throw new Error('SUPERTONE_API_KEY is not configured');
    }

    const targetVoiceId = voiceId || SUPERTONE_CONFIG.DEFAULT_VOICE_ID;

    console.log('Sora TTS 생성 중...');
    console.log(`- 텍스트 길이: ${text.length}자`);
    console.log(`- 음성 ID: ${targetVoiceId}`);
    console.log(`- 모델: ${SUPERTONE_CONFIG.MODEL}`);

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
      console.error('Supertone API 오류:', response.status, errorText);
      throw new Error(`Supertone API error: ${response.status}`);
    }

    // 오디오 데이터를 base64로 인코딩 (chunk 방식으로 처리하여 스택 오버플로우 방지)
    const audioBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(audioBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Audio = btoa(binary);

    const audioLength = response.headers.get('x-audio-length');
    if (audioLength) {
      console.log(`✓ 오디오 생성 완료: ${audioLength}초`);
    }

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('TTS 생성 실패:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
