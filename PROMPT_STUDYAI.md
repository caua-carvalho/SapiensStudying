# SapiensStudying - MVP Ultra Simples

## Contexto
Quero desenvolver um MVP **ultra simples** de um sistema pessoal para estudos. O usuário digita o tema que quer estudar e uma IA gera um plano completo de estudos.

## Stack Tecnolóĺģıco

### Frontend
- **Framework**: React 18+ com Vite
- **Linguagem**: TypeScript
- **Estilizaçģıo**: Tailwind CSS
- **Estado**: useState do React (nada de Context, Redux, Zustand)

### Backend
- **Runtime**: Supabase Edge Functions (Deno + TypeScript)
- **Banco de Dados**: Supabase PostgreSQL (1 tabela apenas)
- **IA**: Google AI Studio API (Gemini 2.5 Flash)

### Infra
- **Deploy Frontend**: Vercel
- **Deploy Backend**: Supabase Edge Functions (já´´e serverless)

---

## Requisitos Funcionais

### 1. Tela Única (Home)
- Input de texto: "O que você quer estudar?"
- Botāo: "Gerar Plano"
- Loading state enquanto processa
- Exibe o plano completo na mesma tela (abaixo do input)

### 2. O Plano Mostra
- Cronograma (lista de dias com tóĺģıcos)
- Livros recomendados
- Filmes/documentáĺģ  rios
- Outros recursos (cursos, podcasts, etc)
- Téĺģcnicas de fixaçģıo

### 3. Sem Features Desnecessáĺģrias
- ❌ Sem autenticaçģıo
- ❌ Sem salvar planos (pode usar localStorage se quiser)
- ❌ Sem múltiplas telas
- ❌ Sem exportar PDF
- ✅ Apenas: input → IA → resultado na tela

---

## Arquitetura Simplificada

```
projeto/
├── DESIGN.md (arquivo de design - JÁ´ EXISTE, SIGA RIGOROSAMENTE)
├── frontend/
│   ├── src/
│   │   ├── App.tsx (toda a lógica aqui, 1 arquivo só)
│   │   ├── services/
│   │   │   └── api.ts (chama a Edge Function)
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── supabase/
│   ├── functions/
│   │   └── generate-plan/
│   │       └── index.ts (Edge Function)
│   └── migrations/
│       └── 001_create_tables.sql
│
├── .env.example
└── README.md
```

---

## Schema do Banco (1 Tabela Simples)

```sql
-- Arquivo: supabase/migrations/001_create_tables.sql

-- Tabela única, sem auth, sem RLS
CREATE TABLE study_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index simples
CREATE INDEX idx_plans_created ON study_plans(created_at DESC);
```

---

## Código da Edge Function (Míĺģnimo)

```typescript
// Arquivo: supabase/functions/generate-plan/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { topic } = await req.json();

    // Chama Google AI Studio
    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GOOGLE_AI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Você´´e um especialista em educação. Crie um plano de estudos para: "${topic}"

Retorne APENAS JSON vá́lido:
{
  "cronograma": [{"dia": 1, "topico": "...", "descricao": "..."}],
  "livros": [{"titulo": "...", "autor": "...", "descricao": "..."}],
  "filmes": [{"titulo": "...", "plataforma": "...", "sinopse": "..."}],
  "recursos": [{"tipo": "...", "titulo": "...", "url": "..."}],
  "tecnicas": [{"nome": "...", "como_aplicar": "..."}]
}

Regras: português brasileiro, seja especíĺģfico, priorize recursos gráĺģtuitos.`
            }]
          }]
        }),
      }
    );

    const data = await aiResponse.json();
    const planText = data.candidates[0].content.parts[0].text;
    const plan = JSON.parse(planText);

    // Salva no Supabase (opcional, pode remover se quiser só́ localStorage)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    await supabase.from('study_plans').insert({
      topic,
      plan_data: plan,
    });

    return new Response(JSON.stringify({ plan }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
```

---

## Frontend (App.tsx Único)

```typescript
// Arquivo: frontend/src/App.tsx

import { useState } from 'react';
import { generatePlan } from './services/api';

function App() {
  const [topic, setTopic] = useState('');
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await generatePlan(topic);
      setPlan(result.plan);
    } catch (err) {
      alert('Erro ao gerar plano');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">SapiensStudying</h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="O que você quer estudar?"
            className="w-full p-4 border rounded-lg mb-4"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-4 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Gerando...' : 'Gerar Plano'}
          </button>
        </form>

        {plan && (
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-bold mb-4">📅 Cronograma</h2>
              <div className="space-y-2">
                {plan.cronograma.map((item: any, i: number) => (
                  <div key={i} className="p-4 bg-white rounded-lg shadow">
                    <p className="font-semibold">Dia {item.dia}: {item.topico}</p>
                    <p className="text-gray-600">{item.descricao}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">📚 Livros</h2>
              <ul className="list-disc list-inside space-y-2">
                {plan.livros.map((livro: any, i: number) => (
                  <li key={i}>
                    <span className="font-semibold">{livro.titulo}</span> por {livro.autor}
                    <p className="text-gray-600">{livro.descricao}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">🎬 Filmes</h2>
              <ul className="list-disc list-inside space-y-2">
                {plan.filmes.map((filme: any, i: number) => (
                  <li key={i}>
                    <span className="font-semibold">{filme.titulo}</span> ({filme.plataforma})
                    <p className="text-gray-600">{filme.sinopse}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">🔗 Recursos</h2>
              <ul className="list-disc list-inside space-y-2">
                {plan.recursos.map((rec: any, i: number) => (
                  <li key={i}>
                    <span className="font-semibold">{rec.titulo}</span>
                    {rec.url && <a href={rec.url} className="text-blue-600 ml-2">Link</a>}
                    <p className="text-gray-600">{rec.descricao}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4">💡 Têĺģcnicas de Fixaçģıo</h2>
              <ul className="list-disc list-inside space-y-2">
                {plan.tecnicas.map((tec: any, i: number) => (
                  <li key={i}>
                    <span className="font-semibold">{tec.nome}</span>
                    <p className="text-gray-600">{tec.como_aplicar}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
```

---

## Serviço API (frontend/src/services/api.ts)

```typescript
// Arquivo: frontend/src/services/api.ts

const API_URL = 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/generate-plan';

export async function generatePlan(topic: string) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });

  if (!res.ok) throw new Error('Erro na API');
  return await res.json();
}
```

---

## Variáĺģveis de Ambiente

### Frontend (.env)
```env
# Nāo precisa de nada no frontend!
# A Edge Function já́ tem as chaves do Supabase e Google AI
```

### Backend (Supabase Dashboard → Edge Functions → Secrets)
```env
GOOGLE_AI_API_KEY=sua_api_key_aqui
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

---

## Design e UX

**IMPORTANTE**: Existe um arquivo `DESIGN.md` na raiz do projeto com as regras de design, UI e UX.

**SIGA RIGOROSAMENTE** esse arquivo para:
- Paleta de cores
- Tipografia
- Componentes e padrōes de interaçģıo
- Layout e espaçģıo
- Responsividade
- Estados (hover, focus, loading, error)

Se algo nāo estiver claro no arquivo de design, **PERGUNTE** antes de implementar.

O código acima usa classes genéĺģricas do Tailwind (bg-gray-50, bg-white, text-blue-600, etc) como **exemplo**. Substitua pelas cores, fontes e componentes especificados no `DESIGN.md`.

---

## Instruçģıes de Setup (README.md)

```md
# SapiensStudying - MVP Ultra Simples

## Setup

### 1. Supabase
1. Crie um projeto em https://supabase.com
2. Vá´´ em SQL Editor e rode o migration (001_create_tables.sql)
3. Vá´´ em Edge Functions → Secrets e adicione:
   - GOOGLE_AI_API_KEY (pegue em https://aistudio.google.com/app/apikey)
   - SUPABASE_URL
   - SUPABASE_ANON_KEY

### 2. Deploy da Edge Function
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase functions deploy generate-plan
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Atualize a URL da API
Em `frontend/src/services/api.ts`, troque `YOUR_PROJECT_ID` pelo seu projeto.

### 5. Design
Leia o arquivo `DESIGN.md` na raiz e ajuste o código para seguir as regras de design especificadas.

## Pronto!
Acesse http://localhost:5173 e use.
```

---

## Prioridades do MVP

1. ✅ Frontend React + TypeScript funcionando
2. ✅ Edge Function do Supabase chamando Google AI Studio
3. ✅ UI limpa e responsiva seguindo o `DESIGN.md`
4. ⚪ Salvar no Supabase (opcional - pode ser só́ localStorage)
5. ⚪ Exportar PDF (deixar para v2)
6. ⚪ Autenticaçģıo (deixar para v2)

---

## Observaçģıes Finais

- Mantenha o código **simples e legíĺģvel**
- Use TypeScript (mas pode usar `any` no plano, é́ MVP)
- Comente partes complexas do código
- Teste a integraçģıo com a API do Google AI Studio antes de entregar
- Garanta que funcione bem em mobile e desktop
- **SIGA O DESIGN.md** - isso é́ importante

---

## Entrega Esperada

1. Código completo do frontend (React + TS + Vite + Tailwind)
2. Código completo da Edge Function (TypeScript/Deno)
3. Schema SQL do Supabase (migrations)
4. README com instruçģıes de setup e deploy
5. **UI seguindo o DESIGN.md**

---

Comece me confirmando que entendeu os requisitos e que vai seguir o `DESIGN.md` rigorosamente. Em seguida, me mostre:
1. A estrutura de arquivos completa que vai criar
2. O schema SQL que vai rodar no Supabase
3. O código da Edge Function

Só´´´ depois de aprovado, comece a codar o frontend.
