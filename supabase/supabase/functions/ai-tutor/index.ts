import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL_PRIORITY = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, topic, prompt: userPrompt, text, context } = await req.json();

    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY não configurada no Supabase.");
    }

    let systemInstruction = "Você é o tutor pedagógico de IA do SapiensStudying. Seja didático, claro, acolhedor e focado em retenção profunda.";
    let finalPrompt = userPrompt || "";

    if (action === "feynman_eval") {
      systemInstruction = "Você é um avaliador pedagógico especialista no Método Feynman.";
      finalPrompt = `O estudante está resumindo com suas próprias palavras o tema "${topic || "o assunto"}".

Texto do estudante:
"${text}"

Analise a explicação em 3 passos:
1. Pontos fortes e clareza da explicação.
2. Possíveis lacunas conceituais ou imprecisões técnicas.
3. Uma analogia simples ou dica prática para fixar ainda melhor.
Seja encorajador e direto.`;
    } else if (action === "generate_quiz") {
      systemInstruction = "Você é um gerador de avaliações formativas do SapiensStudying. Retorne APENAS um JSON válido.";
      finalPrompt = `Crie 3 questões de múltipla escolha para testar a retenção do tema "${topic}".
JSON schema:
{
  "questions": [
    {
      "question": "Texto da pergunta",
      "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "correctIndex": 0,
      "explanation": "Por que esta é a resposta correta"
    }
  ]
}`;
    } else {
      // General Tutor Chat
      finalPrompt = `Contexto do tema de estudo: "${topic || "Geral"}". ${context ? `Detalhes adicionais: ${context}` : ""}

Pergunta do estudante:
"${userPrompt}"

Responda de forma didática, direta e forneça um exemplo intuitivo ou recomendação de estudo ativo.`;
    }

    const requestBody = {
      contents: [{ parts: [{ text: finalPrompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
    };

    let responseData = null;
    let usedModel = "";

    for (const model of MODEL_PRIORITY) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
          }
        );

        if (response.ok) {
          responseData = await response.json();
          usedModel = model;
          break;
        }
      } catch {
        // tenta proximo
      }
    }

    if (!responseData) {
      throw new Error("Não foi possível obter resposta dos modelos de IA.");
    }

    const answer = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

    return new Response(
      JSON.stringify({
        answer,
        model: usedModel,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Erro no tutor IA." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
