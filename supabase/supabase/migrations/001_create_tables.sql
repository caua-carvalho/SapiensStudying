-- Arquivo: supabase/migrations/001_create_tables.sql

-- Tabela única para armazenar os planos de estudo gerados
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index simples para busca por data de criação
CREATE INDEX IF NOT EXISTS idx_plans_created ON study_plans(created_at DESC);
