// Configuração da URL da Edge Function do Supabase
// Em produção, defina VITE_SUPABASE_FUNCTION_URL no .env do frontend ou substitua diretamente aqui
const API_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL;

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
  cronograma: ScheduleItem[];
  livros: BookItem[];
  filmes: MovieItem[];
  recursos: ResourceItem[];
  tecnicas: TechniqueItem[];
}

export interface GeneratePlanResponse {
  plan: StudyPlan;
  error?: string;
}

export async function generatePlan(topic: string): Promise<GeneratePlanResponse> {
  console.log('Chamando Edge Function:', API_URL);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic }),
  });

  const rawResponse = await res.text();

  console.log('Status:', res.status);
  console.log('Resposta:', rawResponse);

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
