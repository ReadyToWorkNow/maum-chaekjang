import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// n8n 웹훅 URL
const N8N_WEBHOOK_URL = "https://robotshin.app.n8n.cloud/webhook/check_real_code";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      console.error('Method not allowed:', req.method);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { authKey } = await req.json();
    
    console.log('Received auth request, forwarding to n8n...');
    console.log('Auth key received:', authKey);
    console.log('Target URL:', N8N_WEBHOOK_URL);

    // n8n 웹훅으로 요청 전달
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authKey }),
    });

    console.log('n8n response status:', n8nResponse.status);
    console.log('n8n response headers:', Object.fromEntries(n8nResponse.headers.entries()));

    // 응답 본문을 먼저 텍스트로 읽어서 로깅
    const responseText = await n8nResponse.text();
    console.log('n8n response body:', responseText);

    if (!n8nResponse.ok) {
      console.error('n8n webhook error:', n8nResponse.status, n8nResponse.statusText);
      console.error('n8n error details:', responseText);
      return new Response(
        JSON.stringify({ 
          error: `n8n webhook error: ${n8nResponse.status}`,
          details: responseText,
          webhookUrl: N8N_WEBHOOK_URL
        }),
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 텍스트를 JSON으로 파싱 시도
    let isValid: boolean;
    try {
      isValid = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse n8n response as JSON:', e);
      // 응답이 "true" 또는 "false" 문자열일 수 있음
      isValid = responseText === 'true';
    }
    
    console.log('Auth validation result:', isValid);

    return new Response(
      JSON.stringify(isValid),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in auth-response-webhook:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Unknown error' }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500 
      }
    );
  }
});
