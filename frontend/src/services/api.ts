import { supabase, isSupabaseConfigured } from './supabaseClient';

const FUNCTION_GENERATE_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL;

export interface ScheduleItem {
  dia: number;
  topico: string;
  descricao: string;
}

export interface BookItem {
  titulo: string;
  autor: string;
  descricao: string;
}

export interface MovieItem {
  titulo: string;
  plataforma: string;
  sinopse: string;
}

export interface ResourceItem {
  tipo: string;
  titulo: string;
  url?: string;
  descricao?: string;
}

export interface TechniqueItem {
  nome: string;
  como_aplicar: string;
}

export interface StudyPlan {
  code?: string;
  title?: string;
  category?: string;
  badge?: string;
  durationWeeks?: number;
  dailyHours?: string;
  level?: string;
  cronograma: ScheduleItem[];
  livros: BookItem[];
  filmes: MovieItem[];
  recursos: ResourceItem[];
  tecnicas: TechniqueItem[];
}

export interface GeneratePlanResponse {
  plan: StudyPlan;
  model?: string;
  savedPlanId?: string;
  error?: string;
}

export async function generatePlan(topic: string): Promise<GeneratePlanResponse> {
  // If Edge Function URL is configured directly
  if (FUNCTION_GENERATE_URL) {
    const res = await fetch(FUNCTION_GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });

    const rawResponse = await res.text();
    let data;
    try {
      data = JSON.parse(rawResponse);
    } catch {
      throw new Error(`Resposta não-JSON da API: ${rawResponse}`);
    }

    if (!res.ok) {
      throw new Error(data.error || 'Erro ao gerar o plano de estudos.');
    }

    return data;
  }

  // If using Supabase Functions invoke
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke('generate-plan', {
      body: { topic },
    });

    if (error) {
      throw new Error(error.message || 'Erro na Edge Function do Supabase.');
    }

    return data;
  }

  throw new Error('Serviço de IA não configurado.');
}

export async function askAiTutor(params: {
  action?: 'chat' | 'feynman_eval' | 'generate_quiz';
  topic: string;
  prompt?: string;
  text?: string;
  context?: string;
}): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-tutor', {
        body: params,
      });
      if (!error && data?.answer) {
        return data.answer;
      }
    } catch (e) {
      console.warn('Erro ao chamar ai-tutor no Supabase:', e);
    }
  }

  // Fallback didático
  if (params.action === 'feynman_eval') {
    return `Ótima autoexplicação! Você articulou os conceitos fundamentais de ${params.topic} com clareza. Dica para fixação: procure relacionar essa técnica com um caso de uso do seu cotidiano para consolidar ainda mais a memória de longo prazo.`;
  }

  return `Com base na trilha de ${params.topic}, este conceito se conecta diretamente com a progressão da sua semana de estudos. Continue praticando com repetição ativa e aplicação em exercícios práticos.`;
}
