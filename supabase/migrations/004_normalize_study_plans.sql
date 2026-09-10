-- Migration: 003_normalize_study_plans.sql
-- Descrição: Estruturação relacional normalizada para o SapiensStudying
-- Remove a dependência de plan_data JSON e armazena todas as informações em tabelas relacionais dedicadas.

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABELA PRINCIPAL: STUDY_PLANS (Metadados do Plano)
-- ============================================================
CREATE TABLE IF NOT EXISTS study_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Geral',
  badge TEXT NOT NULL DEFAULT '🌱 Trilha Personalizada com IA',
  duration_weeks INT NOT NULL DEFAULT 4,
  daily_hours TEXT NOT NULL DEFAULT '1.5h / dia',
  level TEXT NOT NULL DEFAULT 'Intermediário',
  current_week INT NOT NULL DEFAULT 1,
  progress_percent INT NOT NULL DEFAULT 0,
  completed_tasks_count INT NOT NULL DEFAULT 0,
  total_tasks_count INT NOT NULL DEFAULT 0,
  estimated_end_date TEXT,
  status TEXT NOT NULL DEFAULT 'em_andamento', -- em_andamento, revisao, concluido, arquivado
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Caso a tabela já exista com plan_data, mantemos a coluna como opcional ou migramos
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Geral';
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT '🌱 Trilha Personalizada com IA';
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS duration_weeks INT DEFAULT 4;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS daily_hours TEXT DEFAULT '1.5h / dia';
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Intermediário';
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS current_week INT DEFAULT 1;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS progress_percent INT DEFAULT 0;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS completed_tasks_count INT DEFAULT 0;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS total_tasks_count INT DEFAULT 0;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS estimated_end_date TEXT;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'em_andamento';
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================
-- 2. TABELA DE MÓDULOS SEMANAIS (PLAN_WEEKS)
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_weeks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  progress_percent INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TABELA DE ATIVIDADES / TAREFAS DIÁRIAS (PLAN_TASKS)
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  week_id UUID NOT NULL REFERENCES plan_weeks(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'reading', -- reading, code, video, quiz, project, review
  duration TEXT NOT NULL DEFAULT '45 min',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  is_today BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. TABELA DE RECURSOS CURADOS (PLAN_RESOURCES)
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- livros, filmes, cursos, podcasts, artigos
  title TEXT NOT NULL,
  author_or_creator TEXT,
  badge TEXT,
  badge_color TEXT DEFAULT 'primary',
  image_url TEXT,
  rating NUMERIC(3, 1) DEFAULT 4.8,
  rating_count TEXT DEFAULT '1.2k',
  url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. TABELA DE MÉTODOS ATIVOS (PLAN_PRACTICES)
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_practices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL, -- flashcards, quiz, feynman, project
  tag TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  badge TEXT,
  meta TEXT,
  action_text TEXT NOT NULL,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. TABELA DE MENSAGENS DO TUTOR IA (AI_TUTOR_MESSAGES)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_tutor_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user, assistant, system
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. TABELA DE STREAK & HÁBITOS (LEARNING_STREAKS)
-- ============================================================
CREATE TABLE IF NOT EXISTS learning_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 1,
  longest_streak INT DEFAULT 1,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  total_minutes INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_study_plans_created ON study_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_plans_status ON study_plans(status);
CREATE INDEX IF NOT EXISTS idx_study_plans_user ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_weeks_plan ON plan_weeks(plan_id, week_number ASC);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_week ON plan_tasks(week_id, day_number ASC);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan ON plan_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_resources_plan ON plan_resources(plan_id, category);
CREATE INDEX IF NOT EXISTS idx_plan_practices_plan ON plan_practices(plan_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_plan ON ai_tutor_messages(plan_id, created_at ASC);

-- ============================================================
-- TRIGGER: RECALCULAR PROGRESSO AUTOMÁTICO EM CASCATA
-- ============================================================
CREATE OR REPLACE FUNCTION update_plan_and_week_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_plan_id UUID;
  v_week_id UUID;
  v_week_total INT;
  v_week_completed INT;
  v_plan_total INT;
  v_plan_completed INT;
  v_week_percent INT;
  v_plan_percent INT;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_plan_id := OLD.plan_id;
    v_week_id := OLD.week_id;
  ELSE
    v_plan_id := NEW.plan_id;
    v_week_id := NEW.week_id;
  END IF;

  -- 1. Progresso da semana
  SELECT COUNT(*), COUNT(*) FILTER (WHERE completed = TRUE)
  INTO v_week_total, v_week_completed
  FROM plan_tasks
  WHERE week_id = v_week_id;

  IF v_week_total > 0 THEN
    v_week_percent := ROUND((v_week_completed::NUMERIC / v_week_total::NUMERIC) * 100);
  ELSE
    v_week_percent := 0;
  END IF;

  UPDATE plan_weeks
  SET progress_percent = v_week_percent
  WHERE id = v_week_id;

  -- 2. Progresso geral do plano
  SELECT COUNT(*), COUNT(*) FILTER (WHERE completed = TRUE)
  INTO v_plan_total, v_plan_completed
  FROM plan_tasks
  WHERE plan_id = v_plan_id;

  IF v_plan_total > 0 THEN
    v_plan_percent := ROUND((v_plan_completed::NUMERIC / v_plan_total::NUMERIC) * 100);
  ELSE
    v_plan_percent := 0;
  END IF;

  UPDATE study_plans
  SET
    progress_percent = v_plan_percent,
    completed_tasks_count = v_plan_completed,
    total_tasks_count = v_plan_total,
    updated_at = NOW(),
    status = CASE
      WHEN v_plan_percent = 100 THEN 'concluido'
      ELSE status
    END
  WHERE id = v_plan_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_plan_progress ON plan_tasks;
CREATE TRIGGER trg_update_plan_progress
AFTER INSERT OR UPDATE OF completed, week_id, plan_id OR DELETE ON plan_tasks
FOR EACH ROW
EXECUTE FUNCTION update_plan_and_week_progress();


-- ============================================================
-- RPC: TOGGLE TASK COMPLETION
-- ============================================================
CREATE OR REPLACE FUNCTION toggle_task_completion(p_task_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_task RECORD;
  v_plan RECORD;
  v_new_status BOOLEAN;
BEGIN
  SELECT * INTO v_task FROM plan_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atividade não encontrada com ID %', p_task_id;
  END IF;

  v_new_status := NOT v_task.completed;

  UPDATE plan_tasks
  SET
    completed = v_new_status,
    completed_at = CASE WHEN v_new_status = TRUE THEN NOW() ELSE NULL END
  WHERE id = p_task_id
  RETURNING * INTO v_task;

  SELECT * INTO v_plan FROM study_plans WHERE id = v_task.plan_id;

  RETURN jsonb_build_object(
    'success', true,
    'task', row_to_json(v_task),
    'plan_progress_percent', v_plan.progress_percent,
    'completed_tasks_count', v_plan.completed_tasks_count,
    'total_tasks_count', v_plan.total_tasks_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- RPC: CRIAR PLANO E DISTRIBUIR NAS TABELAS RELACIONAIS
-- Suporta tanto payload no formato AI (cronograma, livros, filmes, recursos, tecnicas)
-- quanto payload no formato estruturado (weeks, resources, methods)
-- ============================================================
CREATE OR REPLACE FUNCTION create_study_plan_from_ai(p_payload JSONB)
RETURNS UUID AS $$
DECLARE
  v_plan_id UUID;
  v_code TEXT;
  v_title TEXT;
  v_category TEXT;
  v_badge TEXT;
  v_duration_weeks INT;
  v_daily_hours TEXT;
  v_level TEXT;
  v_estimated_end_date TEXT;
  
  -- Cronograma / Semanas
  v_cronograma JSONB;
  v_c_item JSONB;
  v_total_items INT;
  v_items_per_week INT := 5;
  v_num_weeks INT;
  v_w_idx INT;
  v_week_id UUID;
  v_week_title TEXT;
  v_week_desc TEXT;
  v_day_num INT;
  v_task_type TEXT;
  v_is_today BOOLEAN;
  
  -- Formato estruturado semanas
  v_weeks JSONB;
  v_week JSONB;
  v_activities JSONB;
  v_act JSONB;
  
  -- Recursos
  v_livros JSONB;
  v_filmes JSONB;
  v_recursos JSONB;
  v_res_arr JSONB;
  v_res_item JSONB;
  v_r_idx INT;
  
  -- Métodos
  v_tecnicas JSONB;
  v_methods JSONB;
  v_m_item JSONB;
  v_m_idx INT;
  
  v_total_tasks INT := 0;
BEGIN
  -- 1. Extração dos metadados
  v_title := COALESCE(p_payload->>'title', p_payload->>'topic', 'Plano de Estudos');
  v_code := COALESCE(p_payload->>'code', 'TR-' || floor(1000 + random() * 9000)::text || UPPER(substring(v_title from 1 for 2)));
  v_category := COALESCE(p_payload->>'category', 'Estudo Personalizado');
  v_badge := COALESCE(p_payload->>'badge', '🌱 Trilha Personalizada com IA');
  v_duration_weeks := COALESCE((p_payload->>'durationWeeks')::INT, 4);
  v_daily_hours := COALESCE(p_payload->>'dailyHours', '1.5h / dia');
  v_level := COALESCE(p_payload->>'level', 'Intermediário');
  v_estimated_end_date := COALESCE(
    p_payload->>'estimatedEndDate',
    to_char(NOW() + (v_duration_weeks || ' weeks')::interval, 'DD "de" TMMonth "de" YYYY')
  );

  -- 2. Insere na tabela principal: study_plans
  INSERT INTO study_plans (
    code,
    title,
    category,
    badge,
    duration_weeks,
    daily_hours,
    level,
    current_week,
    progress_percent,
    completed_tasks_count,
    total_tasks_count,
    estimated_end_date,
    status
  ) VALUES (
    v_code,
    v_title,
    v_category,
    v_badge,
    v_duration_weeks,
    v_daily_hours,
    v_level,
    1,
    0,
    0,
    0,
    v_estimated_end_date,
    'em_andamento'
  ) RETURNING id INTO v_plan_id;

  -- 3. Inserção de Semanas e Atividades
  -- Caso venha como "weeks" (formato estruturado)
  v_weeks := p_payload->'weeks';
  IF v_weeks IS NOT NULL AND jsonb_array_length(v_weeks) > 0 THEN
    FOR v_week IN SELECT * FROM jsonb_array_elements(v_weeks)
    LOOP
      INSERT INTO plan_weeks (
        plan_id,
        week_number,
        title,
        description,
        progress_percent
      ) VALUES (
        v_plan_id,
        COALESCE((v_week->>'weekNumber')::INT, 1),
        v_week->>'title',
        v_week->>'description',
        0
      ) RETURNING id INTO v_week_id;

      v_activities := v_week->'activities';
      IF v_activities IS NOT NULL AND jsonb_array_length(v_activities) > 0 THEN
        FOR v_act IN SELECT * FROM jsonb_array_elements(v_activities)
        LOOP
          v_total_tasks := v_total_tasks + 1;
          INSERT INTO plan_tasks (
            plan_id,
            week_id,
            day_number,
            title,
            description,
            type,
            duration,
            completed,
            is_today
          ) VALUES (
            v_plan_id,
            v_week_id,
            COALESCE((v_act->>'dayNumber')::INT, v_total_tasks),
            v_act->>'title',
            v_act->>'description',
            COALESCE(v_act->>'type', 'reading'),
            COALESCE(v_act->>'duration', '45 min'),
            COALESCE((v_act->>'completed')::BOOLEAN, false),
            COALESCE((v_act->>'isToday')::BOOLEAN, (v_total_tasks = 1))
          );
        END LOOP;
      END IF;
    END LOOP;

  -- Caso venha como "cronograma" (formato padrão do Gemini)
  ELSIF (p_payload->'cronograma') IS NOT NULL AND jsonb_array_length(p_payload->'cronograma') > 0 THEN
    v_cronograma := p_payload->'cronograma';
    v_total_items := jsonb_array_length(v_cronograma);
    v_num_weeks := GREATEST(1, CEIL(v_total_items::NUMERIC / v_items_per_week::NUMERIC));

    FOR v_w_idx IN 0..(v_num_weeks - 1)
    LOOP
      -- Primeiro item da semana para título do módulo
      v_c_item := v_cronograma->(v_w_idx * v_items_per_week);
      v_week_title := 'Semana ' || (v_w_idx + 1) || ': ' || COALESCE(v_c_item->>'topico', 'Módulo ' || (v_w_idx + 1));
      v_week_desc := COALESCE(v_c_item->>'descricao', 'Desenvolvimento de competências essenciais e aplicação prática.');

      INSERT INTO plan_weeks (
        plan_id,
        week_number,
        title,
        description,
        progress_percent
      ) VALUES (
        v_plan_id,
        v_w_idx + 1,
        v_week_title,
        v_week_desc,
        0
      ) RETURNING id INTO v_week_id;

      -- Atividades dessa semana (até 5 dias)
      FOR v_day_num IN 1..v_items_per_week
      LOOP
        DECLARE
          v_global_idx INT := (v_w_idx * v_items_per_week) + (v_day_num - 1);
        BEGIN
          IF v_global_idx < v_total_items THEN
            v_c_item := v_cronograma->v_global_idx;
            v_total_tasks := v_total_tasks + 1;
            
            -- Tipo de atividade alternado para riqueza pedagógica
            v_task_type := CASE
              WHEN v_global_idx % 4 = 0 THEN 'reading'
              WHEN v_global_idx % 4 = 1 THEN 'code'
              WHEN v_global_idx % 4 = 2 THEN 'video'
              ELSE 'quiz'
            END;

            v_is_today := (v_global_idx = 0);

            INSERT INTO plan_tasks (
              plan_id,
              week_id,
              day_number,
              title,
              description,
              type,
              duration,
              completed,
              is_today
            ) VALUES (
              v_plan_id,
              v_week_id,
              COALESCE((v_c_item->>'dia')::INT, v_global_idx + 1),
              'Dia ' || (v_global_idx + 1) || ': ' || (v_c_item->>'topico'),
              v_c_item->>'descricao',
              v_task_type,
              '45-60 min',
              false,
              v_is_today
            );
          END IF;
        END;
      END LOOP;
    END LOOP;
  END IF;

  -- 4. Inserção de Recursos Curados (Livros, Filmes, Cursos, Podcasts, Artigos)
  -- Formato "resources" (estruturado)
  v_res_arr := p_payload->'resources';
  IF v_res_arr IS NOT NULL AND jsonb_array_length(v_res_arr) > 0 THEN
    FOR v_res_item IN SELECT * FROM jsonb_array_elements(v_res_arr)
    LOOP
      INSERT INTO plan_resources (
        plan_id,
        category,
        title,
        author_or_creator,
        badge,
        badge_color,
        image_url,
        rating,
        rating_count,
        url,
        description
      ) VALUES (
        v_plan_id,
        COALESCE(v_res_item->>'category', 'livros'),
        v_res_item->>'title',
        v_res_item->>'authorOrCreator',
        v_res_item->>'badge',
        COALESCE(v_res_item->>'badgeColor', 'primary'),
        v_res_item->>'imageUrl',
        COALESCE((v_res_item->>'rating')::NUMERIC, 4.8),
        COALESCE(v_res_item->>'ratingCount', '1.2k'),
        v_res_item->>'url',
        v_res_item->>'description'
      );
    END LOOP;
  ELSE
    -- Formato Gemini: livros
    v_livros := p_payload->'livros';
    IF v_livros IS NOT NULL AND jsonb_array_length(v_livros) > 0 THEN
      v_r_idx := 0;
      FOR v_res_item IN SELECT * FROM jsonb_array_elements(v_livros)
      LOOP
        v_r_idx := v_r_idx + 1;
        INSERT INTO plan_resources (
          plan_id, category, title, author_or_creator, badge, badge_color, rating, rating_count, description
        ) VALUES (
          v_plan_id,
          'livros',
          v_res_item->>'titulo',
          v_res_item->>'autor',
          CASE WHEN v_r_idx = 1 THEN 'Essencial IA' ELSE 'Referência Teórica' END,
          CASE WHEN v_r_idx = 1 THEN 'primary' ELSE 'secondary' END,
          4.8 + (v_r_idx % 2) * 0.1,
          (1000 + v_r_idx * 200)::text,
          v_res_item->>'descricao'
        );
      END LOOP;
    END IF;

    -- Formato Gemini: filmes
    v_filmes := p_payload->'filmes';
    IF v_filmes IS NOT NULL AND jsonb_array_length(v_filmes) > 0 THEN
      FOR v_res_item IN SELECT * FROM jsonb_array_elements(v_filmes)
      LOOP
        INSERT INTO plan_resources (
          plan_id, category, title, author_or_creator, badge, badge_color, rating, rating_count, description
        ) VALUES (
          v_plan_id,
          'filmes',
          v_res_item->>'titulo',
          COALESCE(v_res_item->>'plataforma', 'Documentário / Streaming'),
          'Multimídia',
          'tertiary',
          4.7,
          '850',
          v_res_item->>'sinopse'
        );
      END LOOP;
    END IF;

    -- Formato Gemini: recursos adicionais
    v_recursos := p_payload->'recursos';
    IF v_recursos IS NOT NULL AND jsonb_array_length(v_recursos) > 0 THEN
      FOR v_res_item IN SELECT * FROM jsonb_array_elements(v_recursos)
      LOOP
        INSERT INTO plan_resources (
          plan_id, category, title, author_or_creator, badge, badge_color, rating, rating_count, url, description
        ) VALUES (
          v_plan_id,
          CASE
            WHEN LOWER(COALESCE(v_res_item->>'tipo', '')) LIKE '%curso%' THEN 'cursos'
            WHEN LOWER(COALESCE(v_res_item->>'tipo', '')) LIKE '%podcast%' THEN 'podcasts'
            WHEN LOWER(COALESCE(v_res_item->>'tipo', '')) LIKE '%artigo%' OR LOWER(COALESCE(v_res_item->>'tipo', '')) LIKE '%paper%' THEN 'artigos'
            ELSE 'cursos'
          END,
          v_res_item->>'titulo',
          COALESCE(v_res_item->>'tipo', 'Recurso Online'),
          COALESCE(v_res_item->>'tipo', 'Recomendação'),
          'primary',
          4.9,
          '1.5k',
          v_res_item->>'url',
          v_res_item->>'descricao'
        );
      END LOOP;
    END IF;
  END IF;

  -- 5. Inserção de Métodos Ativos (Flashcards, Quiz, Feynman, Mini-Projeto)
  v_methods := p_payload->'methods';
  IF v_methods IS NOT NULL AND jsonb_array_length(v_methods) > 0 THEN
    FOR v_m_item IN SELECT * FROM jsonb_array_elements(v_methods)
    LOOP
      INSERT INTO plan_practices (
        plan_id,
        method_type,
        tag,
        title,
        description,
        badge,
        meta,
        action_text
      ) VALUES (
        v_plan_id,
        COALESCE(v_m_item->>'methodType', 'flashcards'),
        COALESCE(v_m_item->>'tag', 'Repetição Ativa'),
        v_m_item->>'title',
        v_m_item->>'description',
        v_m_item->>'badge',
        v_m_item->>'meta',
        COALESCE(v_m_item->>'actionText', 'Iniciar')
      );
    END LOOP;
  ELSE
    -- Padrão pedagógico Sapiens dos 4 métodos ativos
    INSERT INTO plan_practices (plan_id, method_type, tag, title, description, badge, meta, action_text) VALUES
    (
      v_plan_id,
      'flashcards',
      'Repetição Espaçada',
      'Flashcards do Tema',
      'Cartões inteligentes gerados com perguntas e respostas essenciais sobre ' || v_title || '.',
      '14 pendentes hoje',
      'Repetição Ativa',
      'Praticar Flashcards'
    ),
    (
      v_plan_id,
      'quiz',
      'Avaliação Formativa',
      'Quiz Dinâmico IA',
      'Questões adaptativas para diagnóstico e consolidação rápida sobre ' || v_title || '.',
      '~8 min de duração',
      'Diagnóstico IA',
      'Iniciar Quiz'
    ),
    (
      v_plan_id,
      'feynman',
      'Técnica Feynman',
      'Resumo Ativo',
      'Explique os conceitos de ' || v_title || ' com suas próprias palavras e receba feedback de lacunas.',
      'Template estruturado',
      'Autoexplicação',
      'Abrir Template'
    ),
    (
      v_plan_id,
      'project',
      'Mão na Massa',
      'Mini-Projeto Guiado',
      'Construção prática e aplicação real dos conceitos de ' || v_title || '.',
      'Instruções Práticas',
      'Aplicação Real',
      'Ver Instruções'
    );
  END IF;

  -- 6. Atualiza contagem total de tarefas no plano
  UPDATE study_plans
  SET total_tasks_count = v_total_tasks
  WHERE id = v_plan_id;

  RETURN v_plan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- RPC: RETORNAR PLANO COMPLETO ANINHADO A PARTIR DAS TABELAS
-- ============================================================
CREATE OR REPLACE FUNCTION get_full_study_plan(p_plan_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', sp.id,
    'code', sp.code,
    'title', sp.title,
    'category', sp.category,
    'badge', sp.badge,
    'createdAt', to_char(sp.created_at, 'DD/MM/YYYY'),
    'durationWeeks', sp.duration_weeks,
    'dailyHours', sp.daily_hours,
    'level', sp.level,
    'currentWeek', sp.current_week,
    'progressPercent', sp.progress_percent,
    'completedTasksCount', sp.completed_tasks_count,
    'totalTasksCount', sp.total_tasks_count,
    'estimatedEndDate', sp.estimated_end_date,
    'status', sp.status,
    'todayTask', (
      SELECT jsonb_build_object(
        'id', pt.id,
        'dayText', 'Dia ' || pt.day_number || ' / ' || GREATEST(1, sp.total_tasks_count),
        'title', pt.title,
        'duration', pt.duration,
        'typeText', CASE
          WHEN pt.type = 'reading' THEN 'Leitura'
          WHEN pt.type = 'code' THEN 'Exercício Prático'
          WHEN pt.type = 'video' THEN 'Videoaula'
          WHEN pt.type = 'quiz' THEN 'Exercício Aplicado'
          ELSE 'Estudo Ativo'
        END,
        'completed', pt.completed
      )
      FROM plan_tasks pt
      WHERE pt.plan_id = sp.id AND (pt.is_today = true OR pt.completed = false)
      ORDER BY pt.day_number ASC
      LIMIT 1
    ),
    'weeks', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'weekNumber', pw.week_number,
          'title', pw.title,
          'description', pw.description,
          'progressPercent', pw.progress_percent,
          'activities', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', pt.id,
                'dayNumber', pt.day_number,
                'title', pt.title,
                'description', pt.description,
                'type', pt.type,
                'duration', pt.duration,
                'completed', pt.completed,
                'isToday', pt.is_today
              ) ORDER BY pt.day_number ASC
            )
            FROM plan_tasks pt
            WHERE pt.week_id = pw.id
          ), '[]'::jsonb)
        ) ORDER BY pw.week_number ASC
      )
      FROM plan_weeks pw
      WHERE pw.plan_id = sp.id
    ), '[]'::jsonb),
    'resources', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'category', pr.category,
          'title', pr.title,
          'authorOrCreator', pr.author_or_creator,
          'badge', pr.badge,
          'badgeColor', pr.badge_color,
          'imageUrl', pr.image_url,
          'rating', pr.rating,
          'ratingCount', pr.rating_count,
          'url', pr.url,
          'description', pr.description
        ) ORDER BY pr.created_at ASC
      )
      FROM plan_resources pr
      WHERE pr.plan_id = sp.id
    ), '[]'::jsonb),
    'methods', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pp.id,
          'methodType', pp.method_type,
          'tag', pp.tag,
          'title', pp.title,
          'description', pp.description,
          'badge', pp.badge,
          'meta', pp.meta,
          'actionText', pp.action_text
        ) ORDER BY pp.created_at ASC
      )
      FROM plan_practices pp
      WHERE pp.plan_id = sp.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM study_plans sp
  WHERE sp.id = p_plan_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- RPC: LISTAR TODOS OS PLANOS NORMALIZADOS COM PROGRESSO
-- ============================================================
CREATE OR REPLACE FUNCTION list_all_study_plans()
RETURNS JSONB AS $$
BEGIN
  RETURN COALESCE((
    SELECT jsonb_agg(
      get_full_study_plan(sp.id) ORDER BY sp.created_at DESC
    )
    FROM study_plans sp
  ), '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- POLÍTICAS RLS (Row Level Security)
-- ============================================================
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_tutor_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_streaks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public & Auth access for study_plans" ON study_plans;
  DROP POLICY IF EXISTS "Public & Auth access for plan_weeks" ON plan_weeks;
  DROP POLICY IF EXISTS "Public & Auth access for plan_tasks" ON plan_tasks;
  DROP POLICY IF EXISTS "Public & Auth access for plan_resources" ON plan_resources;
  DROP POLICY IF EXISTS "Public & Auth access for plan_practices" ON plan_practices;
  DROP POLICY IF EXISTS "Public & Auth access for ai_tutor_messages" ON ai_tutor_messages;
  DROP POLICY IF EXISTS "Public & Auth access for learning_streaks" ON learning_streaks;

  CREATE POLICY "Public & Auth access for study_plans" ON study_plans FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public & Auth access for plan_weeks" ON plan_weeks FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public & Auth access for plan_tasks" ON plan_tasks FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public & Auth access for plan_resources" ON plan_resources FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public & Auth access for plan_practices" ON plan_practices FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public & Auth access for ai_tutor_messages" ON ai_tutor_messages FOR ALL USING (true) WITH CHECK (true);
  CREATE POLICY "Public & Auth access for learning_streaks" ON learning_streaks FOR ALL USING (true) WITH CHECK (true);
END $$;
