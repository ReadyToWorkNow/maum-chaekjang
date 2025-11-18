import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hardcoded forward target (n8n webhook)
const FORWARD_URL = "https://robotshin.app.n8n.cloud/webhook/voice_recording";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Expected multipart/form-data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const incomingForm = await req.formData();

    // Validate required fields
    const audio = incomingForm.get("audio");
    if (!(audio instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing 'audio' file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rebuild form for forwarding (avoid leaking extra fields accidentally)
    const forwardForm = new FormData();
    forwardForm.append("audio", audio, audio.name || "recording.webm");

    const timestamp = incomingForm.get("timestamp");
    const mimeType = incomingForm.get("mimeType");
    const size = incomingForm.get("size");
    if (typeof timestamp === "string") forwardForm.append("timestamp", timestamp);
    if (typeof mimeType === "string") forwardForm.append("mimeType", mimeType);
    if (typeof size === "string") forwardForm.append("size", size);

    // Forward to n8n
    const n8nRes = await fetch(FORWARD_URL, {
      method: "POST",
      body: forwardForm,
    });

    const n8nText = await n8nRes.text().catch(() => "");

    const payload = {
      ok: n8nRes.ok,
      status: n8nRes.status,
      statusText: n8nRes.statusText,
      n8nBody: n8nText,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: n8nRes.ok ? 200 : 502,
    });
  } catch (err) {
    console.error("audio-webhook-proxy error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});