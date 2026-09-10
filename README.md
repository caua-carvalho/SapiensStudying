# SapiensStudying - MVP Ultra Simples

Sistema pessoal para geração de planos de estudo acelerados e customizados com IA (Gemini 2.5 Flash), Supabase Edge Functions e frontend React + TypeScript + Tailwind CSS.

---

## 🛠️ Arquitetura

- **Frontend**: React 18+ com Vite, TypeScript e Tailwind CSS (seguindo rigorosamente a identidade visual e tipografia de `DESIGN.md`).
- **Backend**: Supabase Edge Functions (Deno + TypeScript).
- **Inteligência Artificial**: Google AI Studio API (Gemini 2.5 Flash com resposta estruturada em JSON).
- **Banco de Dados**: Supabase PostgreSQL (1 tabela `study_plans`).

---

## 🚀 Guia de Setup

### 1. Supabase (Banco e Secrets)

1. Crie um projeto em [Supabase](https://supabase.com).
2. Acesse o **SQL Editor** no painel do Supabase e execute a migration localizada em:
   ```sql
   supabase/migrations/001_create_tables.sql
   ```
3. Acesse **Edge Functions → Secrets** e configure as seguintes variáveis:
   - `GOOGLE_AI_API_KEY`: Sua chave de API do [Google AI Studio](https://aistudio.google.com/app/apikey).
   - `SUPABASE_URL`: URL do seu projeto Supabase (ex: `https://xyzcompany.supabase.co`).
   - `SUPABASE_ANON_KEY`: Sua chave anônima (anon public key) do Supabase.

---

### 2. Deploy da Edge Function

Certifique-se de ter o [Supabase CLI](https://supabase.com/docs/guides/cli) instalado:

```bash
# Login no Supabase
npx supabase login

# Vincule seu projeto (pegue o Reference ID no painel do Supabase)
npx supabase link --project-ref SEU_PROJECT_REF

# Realize o deploy da função generate-plan
npx supabase functions deploy generate-plan
```

---

### 3. Frontend

1. Entre na pasta `frontend`:
   ```bash
   cd frontend
   npm install
   ```

2. *(Opcional)* Crie um arquivo `.env` dentro de `frontend/` se quiser apontar para a Edge Function de produção:
   ```env
   VITE_SUPABASE_FUNCTION_URL=https://SEU_PROJECT_REF.supabase.co/functions/v1/generate-plan
   ```
   *Ou edite a constante default em `frontend/src/services/api.ts`.*

3. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse: `http://localhost:5173`

---

## 🧪 Estrutura de Arquivos

```
/home/caua/projetos/SapiensStudying/
├── DESIGN.md
├── README.md
├── .env.example
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── index.css
│       ├── main.tsx
│       └── services/
│           └── api.ts
└── supabase/
    ├── functions/
    │   └── generate-plan/
    │       └── index.ts
    └── migrations/
        └── 001_create_tables.sql
```
