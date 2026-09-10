import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// CONFIGURAÇÃO
// ============================================================

// Ordem de preferência dos modelos.
// O código só usará um modelo se ele realmente estiver
// disponível na sua API Key.
const MODEL_PRIORITY = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

// Cache dos modelos disponíveis.
// Isso evita chamar /models a cada requisição.
let cachedModels: string[] | null = null;
let cacheTimestamp = 0;

const MODEL_CACHE_TTL = 5 * 60 * 1000; // 5 minutos


// ============================================================
// BUSCA MODELOS DISPONÍVEIS
// ============================================================

async function getAvailableModels(apiKey: string): Promise<string[]> {
  const now = Date.now();

  // Usa o cache se ainda estiver válido
  if (
    cachedModels &&
    now - cacheTimestamp < MODEL_CACHE_TTL
  ) {
    return cachedModels;
  }

  console.log("Consultando modelos disponíveis do Gemini...");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "Erro ao consultar modelos disponíveis:",
      errorText
    );

    throw new Error(
      `Não foi possível consultar os modelos disponíveis do Gemini. Status: ${response.status}`
    );
  }

  const data = await response.json();

  const models = data?.models ?? [];

  // Filtra somente modelos que suportam generateContent
  const availableModels = models
    .filter((model: any) => {
      return model?.supportedGenerationMethods?.includes(
        "generateContent"
      );
    })
    .map((model: any) => {
      // Preferimos baseModelId quando disponível.
      // Caso contrário, removemos "models/" do name.
      return (
        model?.baseModelId ||
        model?.name?.replace(/^models\//, "")
      );
    })
    .filter(Boolean);

  // Remove duplicados
  const uniqueModels = [...new Set(availableModels)] as string[];

  // ----------------------------------------------------------
  // Primeiro colocamos os modelos conhecidos na ordem
  // de preferência.
  // ----------------------------------------------------------

  const preferredModels = MODEL_PRIORITY.filter((model) =>
    uniqueModels.includes(model)
  );

  // ----------------------------------------------------------
  // Depois adicionamos modelos Flash desconhecidos.
  //
  // Isso permite que, se o Google lançar um novo modelo Flash
  // que não esteja na nossa lista, ele ainda possa ser usado.
  // ----------------------------------------------------------

  const unknownFlashModels = uniqueModels.filter(
    (model) =>
      model.toLowerCase().includes("flash") &&
      !MODEL_PRIORITY.includes(model)
  );

  const finalModels = [
    ...preferredModels,
    ...unknownFlashModels,
  ];

  // Atualiza cache
  cachedModels = finalModels;
  cacheTimestamp = now;

  console.log(
    "Modelos disponíveis para uso:",
    finalModels
  );

  return finalModels;
}


// ============================================================
// CHAMADA AO GEMINI COM FALLBACK
// ============================================================

async function generateWithFallback(
  apiKey: string,
  requestBody: any
): Promise<{
  data: any;
  model: string;
}> {
  const models = await getAvailableModels(apiKey);

  if (models.length === 0) {
    throw new Error(
      "Nenhum modelo Gemini compatível com generateContent está disponível para esta API Key."
    );
  }

  let lastError = "";

  for (const model of models) {
    console.log(`Tentando modelo Gemini: ${model}`);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      // ------------------------------------------------------
      // Sucesso
      // ------------------------------------------------------

      if (response.ok) {
        const data = await response.json();

        console.log(
          `Modelo utilizado com sucesso: ${model}`
        );

        return {
          data,
          model,
        };
      }

      // ------------------------------------------------------
      // Erro
      // ------------------------------------------------------

      const errorText = await response.text();

      console.warn(
        `Modelo ${model} falhou. Status: ${response.status}`,
        errorText
      );

      lastError = `${model}: HTTP ${response.status}`;

      // Continua tentando o próximo modelo.
      //
      // Isso é útil principalmente para:
      // 404 = modelo indisponível
      // 429 = limite/rate limit
      // 500 = erro temporário
      // 503 = serviço indisponível
      //
      // Para outros erros também tentamos o próximo modelo,
      // pois o objetivo é manter o sistema funcionando.

    } catch (error) {
      console.warn(
        `Erro de conexão ao tentar o modelo ${model}:`,
        error
      );

      lastError = `${model}: erro de conexão`;

      // Continua para o próximo modelo.
    }
  }

  // Se chegou aqui, todos falharam.
  throw new Error(
    `Todos os modelos Gemini disponíveis falharam. Último erro: ${lastError}`
  );
}


// ============================================================
// SERVER
// ============================================================

serve(async (req: Request) => {
  // ----------------------------------------------------------
  // CORS
  // ----------------------------------------------------------

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // --------------------------------------------------------
    // Lê o body
    // --------------------------------------------------------

    const { topic } = await req.json();

    // --------------------------------------------------------
    // Validação
    // --------------------------------------------------------

    if (
      !topic ||
      typeof topic !== "string" ||
      topic.trim().length === 0
    ) {
      return new Response(
        JSON.stringify({
          error: "O tópico de estudo é obrigatório.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // --------------------------------------------------------
    // API KEY
    // --------------------------------------------------------

    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");

    if (!apiKey) {
      throw new Error(
        "GOOGLE_AI_API_KEY não configurada nas variáveis de ambiente/secrets do Supabase."
      );
    }

    // --------------------------------------------------------
    // PROMPT
    // --------------------------------------------------------

    const prompt = `Você é um mentor e especialista em educação personalizada e métodos acelerados de aprendizagem.

Crie um plano de estudos estruturado, prático e estimulante em português brasileiro para o seguinte tema:

"${topic.trim()}"

Retorne APENAS um objeto JSON válido.

Não utilize markdown.
Não utilize blocos de código.
Não coloque comentários fora do JSON.

O JSON deve seguir exatamente este esquema:

{
  "cronograma": [
    {
      "dia": 1,
      "topico": "Título do módulo/dia",
      "descricao": "Explicação detalhada dos conceitos a aprender e objetivos do dia"
    }
  ],
  "livros": [
    {
      "titulo": "Título do livro",
      "autor": "Nome do autor",
      "descricao": "Por que este livro é essencial para este tema"
    }
  ],
  "filmes": [
    {
      "titulo": "Título do filme/documentário",
      "plataforma": "Netflix | YouTube | HBO Max | etc",
      "sinopse": "Breve sinopse e relação com o estudo"
    }
  ],
  "recursos": [
    {
      "tipo": "Curso | Vídeo | Podcast | Artigo",
      "titulo": "Nome do recurso recomendado",
      "url": "https://link-sugerido-ou-busca",
      "descricao": "Como e quando utilizar esse recurso"
    }
  ],
  "tecnicas": [
    {
      "nome": "Nome da técnica (ex: Feynman, Pomodoro, Active Recall)",
      "como_aplicar": "Instrução prática e direta de aplicação para este conteúdo"
    }
  ]
}

Regras:

1. Retorne pelo menos 5 a 7 dias no cronograma.
2. Seja específico e didático.
3. Priorize recomendações com valor prático real.
4. Organize o conteúdo em uma progressão lógica, começando pelos fundamentos.
5. Inclua exercícios ou atividades práticas na descrição dos dias quando fizer sentido.
6. As recomendações devem ser relevantes para o tema informado.
7. O JSON precisa ser válido.
8. Não adicione nenhuma propriedade fora do esquema solicitado.`;

    // --------------------------------------------------------
    // BODY DA API GEMINI
    // --------------------------------------------------------

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],

      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    // --------------------------------------------------------
    // CHAMA GEMINI COM SELEÇÃO AUTOMÁTICA + FALLBACK
    // --------------------------------------------------------

    const result = await generateWithFallback(
      apiKey,
      requestBody
    );

    const data = result.data;
    const modelUsed = result.model;

    // --------------------------------------------------------
    // EXTRAI RESPOSTA
    // --------------------------------------------------------

    const planText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!planText) {
      console.error(
        "Resposta completa do Gemini:",
        JSON.stringify(data)
      );

      throw new Error(
        "A IA não retornou um conteúdo válido."
      );
    }

    // --------------------------------------------------------
    // CONVERTE JSON
    // --------------------------------------------------------

    let plan;

    try {
      plan = JSON.parse(planText);
    } catch (parseError) {
      console.error(
        "Erro ao converter resposta da IA para JSON:",
        parseError
      );

      console.error(
        "Resposta recebida:",
        planText
      );

      throw new Error(
        "A IA retornou um JSON inválido."
      );
    }

    // --------------------------------------------------------
    // SUPABASE
    // --------------------------------------------------------

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    if (
      supabaseUrl &&
      supabaseAnonKey
    ) {
      try {
        const supabase = createClient(
          supabaseUrl,
          supabaseAnonKey
        );

        const { error: dbError } =
          await supabase
            .from("study_plans")
            .insert({
              topic: topic.trim(),
              plan_data: plan,
            });

        if (dbError) {
          console.warn(
            "Erro ao salvar plano no Supabase:",
            dbError
          );
        }
      } catch (dbError) {
        console.warn(
          "Erro não-bloqueante ao salvar no Supabase:",
          dbError
        );
      }
    }

    // --------------------------------------------------------
    // RESPOSTA FINAL
    // --------------------------------------------------------

    return new Response(
      JSON.stringify({
        plan,
        model: modelUsed,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error(
      "Erro geral da Edge Function:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error?.message ||
          "Erro interno ao processar plano.",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
});