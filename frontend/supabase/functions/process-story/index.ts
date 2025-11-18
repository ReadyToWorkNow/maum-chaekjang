import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storyLines } = await req.json();
    console.log("process-story received data:", storyLines);
    console.log("Data type:", typeof storyLines, Array.isArray(storyLines));

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
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
    console.log("AI prompt:", userPrompt);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_storybook_pages",
              description: "동화책 페이지를 생성합니다",
              parameters: {
                type: "object",
                properties: {
                  pages: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        page: { type: "number" },
                        text: { type: "string" },
                        image_prompt: { type: "string" }
                      },
                      required: ["page", "text", "image_prompt"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["pages"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_storybook_pages" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI 크레딧이 부족합니다." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in response");
    }

    const pages = JSON.parse(toolCall.function.arguments).pages;
    console.log("Generated pages count:", pages.length);
    console.log("First page sample:", pages[0]);

    return new Response(
      JSON.stringify({ pages }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-story:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
