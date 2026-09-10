import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

let cachedModels: string[] | null = null;
let cacheTimestamp = 0;
const MODEL_CACHE_TTL = 5 * 60 * 1000;

async function getAvailableModels(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedModels && now - cacheTimestamp < MODEL_CACHE_TTL) {
    return cachedModels;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Não foi possível consultar os modelos disponíveis do Gemini. Status: ${response.status}`
    );
  }

  const data = await response.json();
  const models = data?.models ?? [];

  const availableModels = models
    .filter((model: any) =>
      model?.supportedGenerationMethods?.includes("generateContent")
    )
    .map((model: any) =>
      model?.baseModelId || model?.name?.replace(/^models\//, "")
    )
    .filter(Boolean);

  const uniqueModels = [...new Set(availableModels)] as string[];
  const preferredModels = MODEL_PRIORITY.filter((model) =>
    uniqueModels.includes(model)
  );
  const unknownFlashModels = uniqueModels.filter(
    (model) =>
      model.toLowerCase().includes("flash") && !MODEL_PRIORITY.includes(model)
  );

  const finalModels = [...preferredModels, ...unknownFlashModels];
  cachedModels = finalModels;
  cacheTimestamp = now;
  return finalModels;
}

async function generateWithFallback(apiKey: string, requestBody: any) {
  const models = await getAvailableModels(apiKey);
  if (models.length === 0) {
    throw new Error(
      "Nenhum modelo Gemini compatível com generateContent está disponível para esta API Key."
    );
  }

  let lastError = "";
  for (const model of models) {
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
        const data = await response.json();
        return { data, model };
      }

      const errorText = await response.text();
      lastError = `${model}: HTTP ${response.status} - ${errorText.substring(0, 100)}`;
    } catch (error) {
      lastError = `${model}: erro de conexão`;
    }
  }

  throw new Error(
    `Todos os modelos Gemini disponíveis falharam. Último erro: ${lastError}`
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "O tópico de estudo é obrigatório." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      throw new Error(
        "GOOGLE_AI_API_KEY não configurada nas variáveis de ambiente/secrets do Supabase."
      );
    }

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const prefix = topic.trim().substring(0, 2).toUpperCase();

    const prompt = `Você é o motor pedagógico de IA do SapiensStudying, especialista em criação de trilhas estruturadas e metodologias ativas de aprendizagem.

Crie um plano de estudos profundo, prático e estimulante em português brasileiro para o tema:
"${topic.trim()}"

Retorne APENAS um objeto JSON com esta estrutura exata:
{
  "code": "TR-${randomNum}${prefix}",
  "title": "${topic.trim()}",
  "category": "Categoria do conhecimento",
  "badge": "🌱 Trilha Personalizada com IA",
  "durationWeeks": 4,
  "dailyHours": "1.5h / dia",
  "level": "Intermediário",
  "cronograma": [
    {
      "dia": 1,
      "topico": "Título claro do dia",
      "descricao": "Explicação dos conceitos e meta prática do dia"
    }
  ],
  "livros": [
    {
      "titulo": "Título do Livro",
      "autor": "Nome do Autor",
      "descricao": "Por que este livro é fundamental"
    }
  ],
  "filmes": [
    {
      "titulo": "Nome do Filme ou Documentário",
      "plataforma": "YouTube / Netflix / etc",
      "sinopse": "Breve sinopse e relação pedagógica"
    }
  ],
  "recursos": [
    {
      "tipo": "Curso | Artigo | Podcast | Repositório",
      "titulo": "Nome do recurso",
      "url": "https://link-util",
      "descricao": "Como utilizar"
    }
  ],
  "tecnicas": [
    {
      "nome": "Repetição Espaçada / Feynman / etc",
      "como_aplicar": "Instrução prática direta de aplicação"
    }
  ]
}

Regras:
1. Retorne pelo menos 15 a 20 dias no cronograma (organizados sequencialmente para cobrir 4 semanas de estudos).
2. Forneça títulos de livros, recursos e documentários reais e aclamados.
3. Garanta que o JSON retornado seja 100% válido.`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    };

    const result = await generateWithFallback(apiKey, requestBody);
    const data = result.data;
    const modelUsed = result.model;

    const planText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!planText) {
      throw new Error("A IA não retornou um conteúdo válido.");
    }

    const plan = JSON.parse(planText);

    // Persistência normalizada no Supabase (Nas tabelas relacionais dedicadas)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_ANON_KEY");

    let savedPlanId: string | null = null;
    let fullRelationalPlan: any = null;

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Salva via RPC atômico que distribui nas tabelas normalizadas
        const { data: rpcId, error: rpcError } = await supabase.rpc(
          "create_study_plan_from_ai",
          { p_payload: plan }
        );

        if (!rpcError && rpcId) {
          savedPlanId = rpcId;

          // Busca o plano completo montado diretamente a partir das tabelas relacionais
          const { data: fullPlanData, error: fullPlanErr } = await supabase.rpc(
            "get_full_study_plan",
            { p_plan_id: savedPlanId }
          );

          if (!fullPlanErr && fullPlanData) {
            fullRelationalPlan = fullPlanData;
          }
        } else {
          console.warn("RPC create_study_plan_from_ai falhou, executando inserção relacional direta:", rpcError);

          // 2. Inserção relacional direta tabela por tabela
          const code = plan.code || `TR-${Math.floor(1000 + Math.random() * 9000)}`;
          const title = plan.title || topic.trim();
          const category = plan.category || "Geral";
          const durationWeeks = plan.durationWeeks || 4;
          const dailyHours = plan.dailyHours || "1.5h / dia";
          const level = plan.level || "Intermediário";
          const estimatedEndDate = new Date(Date.now() + durationWeeks * 7 * 24 * 3600 * 1000).toLocaleDateString("pt-BR");

          // A) Insere em study_plans
          const { data: planRow, error: planErr } = await supabase
            .from("study_plans")
            .insert({
              code,
              title,
              category,
              badge: plan.badge || "🌱 Trilha Personalizada com IA",
              duration_weeks: durationWeeks,
              daily_hours: dailyHours,
              level,
              current_week: 1,
              progress_percent: 0,
              completed_tasks_count: 0,
              total_tasks_count: (plan.cronograma || []).length,
              estimated_end_date: estimatedEndDate,
              status: "em_andamento"
            })
            .select("id")
            .single();

          if (!planErr && planRow) {
            savedPlanId = planRow.id;

            // B) Insere semanas e tarefas
            const cronograma = plan.cronograma || [];
            const itemsPerWeek = 5;
            const numWeeks = Math.max(1, Math.ceil(cronograma.length / itemsPerWeek));

            for (let w = 0; w < numWeeks; w++) {
              const weekItems = cronograma.slice(w * itemsPerWeek, (w + 1) * itemsPerWeek);
              const weekTitle = `Semana ${w + 1}: ${weekItems[0]?.topico || `Módulo ${w + 1}`}`;
              const weekDesc = weekItems[0]?.descricao || "Desenvolvimento e aplicação prática dos conceitos.";

              const { data: weekRow } = await supabase
                .from("plan_weeks")
                .insert({
                  plan_id: savedPlanId,
                  week_number: w + 1,
                  title: weekTitle,
                  description: weekDesc,
                  progress_percent: 0
                })
                .select("id")
                .single();

              if (weekRow) {
                const weekId = weekRow.id;
                const tasksToInsert = weekItems.map((item: any, idx: number) => {
                  const globalIdx = w * itemsPerWeek + idx;
                  return {
                    plan_id: savedPlanId,
                    week_id: weekId,
                    day_number: item.dia || (globalIdx + 1),
                    title: `Dia ${item.dia || (globalIdx + 1)}: ${item.topico}`,
                    description: item.descricao,
                    type: idx % 4 === 0 ? "reading" : idx % 4 === 1 ? "code" : idx % 4 === 2 ? "video" : "quiz",
                    duration: "45-60 min",
                    completed: false,
                    is_today: globalIdx === 0
                  };
                });

                await supabase.from("plan_tasks").insert(tasksToInsert);
              }
            }

            // C) Insere recursos curados
            const resourcesToInsert: any[] = [];
            (plan.livros || []).forEach((l: any, i: number) => {
              resourcesToInsert.push({
                plan_id: savedPlanId,
                category: "livros",
                title: l.titulo,
                author_or_creator: l.autor,
                badge: i === 0 ? "Essencial IA" : "Referência Teórica",
                badge_color: i === 0 ? "primary" : "secondary",
                rating: 4.8 + (i % 2) * 0.1,
                rating_count: `${1000 + i * 200}`,
                description: l.descricao
              });
            });

            (plan.filmes || []).forEach((f: any) => {
              resourcesToInsert.push({
                plan_id: savedPlanId,
                category: "filmes",
                title: f.titulo,
                author_or_creator: f.plataforma || "Streaming",
                badge: "Multimídia",
                badge_color: "tertiary",
                rating: 4.7,
                rating_count: "850",
                description: f.sinopse
              });
            });

            (plan.recursos || []).forEach((r: any) => {
              resourcesToInsert.push({
                plan_id: savedPlanId,
                category: (r.tipo?.toLowerCase().includes("curso") ? "cursos" : "artigos"),
                title: r.titulo,
                author_or_creator: r.tipo || "Recurso Online",
                badge: r.tipo || "Recomendado",
                badge_color: "primary",
                url: r.url,
                rating: 4.9,
                rating_count: "1.5k",
                description: r.descricao
              });
            });

            if (resourcesToInsert.length > 0) {
              await supabase.from("plan_resources").insert(resourcesToInsert);
            }

            // D) Insere métodos ativos
            const practicesToInsert = [
              {
                plan_id: savedPlanId,
                method_type: "flashcards",
                tag: "Repetição Espaçada",
                title: "Flashcards do Tema",
                description: `Cartões inteligentes para consolidar os conceitos de ${title}.`,
                badge: "14 pendentes hoje",
                meta: "Repetição Ativa",
                action_text: "Praticar Flashcards"
              },
              {
                plan_id: savedPlanId,
                method_type: "quiz",
                tag: "Avaliação Formativa",
                title: "Quiz Dinâmico IA",
                description: `10 questões adaptativas sobre ${title}.`,
                badge: "~8 min de duração",
                meta: "Diagnóstico IA",
                action_text: "Iniciar Quiz"
              },
              {
                plan_id: savedPlanId,
                method_type: "feynman",
                tag: "Técnica Feynman",
                title: "Resumo Ativo",
                description: `Explique os conceitos de ${title} com suas próprias palavras e receba feedback.`,
                badge: "Template estruturado",
                meta: "Autoexplicação",
                action_text: "Abrir Template"
              },
              {
                plan_id: savedPlanId,
                method_type: "project",
                tag: "Mão na Massa",
                title: "Mini-Projeto Guiado",
                description: `Aplicação prática e desenvolvimento real sobre ${title}.`,
                badge: "Instruções Práticas",
                meta: "Aplicação Real",
                action_text: "Ver Instruções"
              }
            ];

            await supabase.from("plan_practices").insert(practicesToInsert);
          }
        }
      } catch (dbError) {
        console.error("Erro ao salvar dados relacionais no Supabase:", dbError);
      }
    }

    return new Response(
      JSON.stringify({
        plan: fullRelationalPlan || plan,
        model: modelUsed,
        savedPlanId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Erro geral Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno ao processar plano." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
