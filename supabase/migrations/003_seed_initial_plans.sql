-- Migration: 002_seed_initial_plans.sql
-- Descrição: Insere as trilhas iniciais completas no Supabase

DO $$
DECLARE
  v_plan_id UUID;
  v_w1 UUID;
  v_w2 UUID;
  v_w3 UUID;
  v_w4 UUID;
BEGIN
  -- Verifica se já existe a trilha de Machine Learning
  IF NOT EXISTS (SELECT 1 FROM study_plans WHERE code = 'TR-8924ML') THEN
    
    -- 1. Cria Trilha ML
    INSERT INTO study_plans (
      code, title, category, badge, duration_weeks, daily_hours, level,
      current_week, progress_percent, completed_tasks_count, total_tasks_count,
      estimated_end_date, status
    ) VALUES (
      'TR-8924ML',
      'Machine Learning & Deep Learning',
      'Inteligência Artificial',
      '🌱 Trilha Personalizada com IA',
      4,
      '2h / dia',
      'Intermediário',
      1,
      15,
      3,
      20,
      '05 de Outubro de 2026',
      'em_andamento'
    ) RETURNING id INTO v_plan_id;

    -- Semanas
    INSERT INTO plan_weeks (plan_id, week_number, title, description, progress_percent)
    VALUES (v_plan_id, 1, 'Semana 1: Fundamentos Matemáticos e Algoritmos Clássicos', 'Dominar regressão linear, logística e preparação de dados com NumPy e Pandas.', 60)
    RETURNING id INTO v_w1;

    INSERT INTO plan_weeks (plan_id, week_number, title, description, progress_percent)
    VALUES (v_plan_id, 2, 'Semana 2: Modelos Avançados e Engenharia de Features', 'Gradient Boosting, XGBoost, PCA e normalização avançada.', 0)
    RETURNING id INTO v_w2;

    INSERT INTO plan_weeks (plan_id, week_number, title, description, progress_percent)
    VALUES (v_plan_id, 3, 'Semana 3: Introdução a Redes Neurais e PyTorch', 'Perceptron, Backpropagation, Funções de perda e Tensores.', 0)
    RETURNING id INTO v_w3;

    INSERT INTO plan_weeks (plan_id, week_number, title, description, progress_percent)
    VALUES (v_plan_id, 4, 'Semana 4: Projeto Prático de Ponta a Ponta e Deploy', 'Construção de API com FastAPI, empacotamento com Docker e testes.', 0)
    RETURNING id INTO v_w4;

    -- Atividades Semana 1
    INSERT INTO plan_tasks (plan_id, week_id, day_number, title, type, duration, completed, is_today) VALUES
    (v_plan_id, v_w1, 1, 'Dia 1: Introdução e Álgebra Linear Essencial', 'reading', '45 min', true, false),
    (v_plan_id, v_w1, 2, 'Dia 2: Regressão Linear do Zero em Python', 'code', '60 min', true, false),
    (v_plan_id, v_w1, 3, 'Dia 3: Classificação com Regressão Logística', 'video', '50 min', true, false),
    (v_plan_id, v_w1, 4, 'Dia 4: Métricas de Avaliação: ROC-AUC, F1 e Matriz de Confusão', 'quiz', '45 min', false, true),
    (v_plan_id, v_w1, 5, 'Dia 5: Árvores de Decisão e Florestas Aleatórias', 'code', '60 min', false, false);

    -- Atividades Semana 2
    INSERT INTO plan_tasks (plan_id, week_id, day_number, title, type, duration, completed, is_today) VALUES
    (v_plan_id, v_w2, 6, 'Dia 6: Engenharia de Features & Tratamento de Nulos', 'code', '50 min', false, false),
    (v_plan_id, v_w2, 7, 'Dia 7: Ensembles & Random Forests Aprofundadas', 'reading', '45 min', false, false),
    (v_plan_id, v_w2, 8, 'Dia 8: Gradient Boosting e XGBoost Prático', 'code', '60 min', false, false),
    (v_plan_id, v_w2, 9, 'Dia 9: Redução de Dimensionalidade com PCA & t-SNE', 'video', '40 min', false, false),
    (v_plan_id, v_w2, 10, 'Dia 10: Otimização de Hiperparâmetros (Optuna & GridSearch)', 'project', '60 min', false, false);

    -- Atividades Semana 3
    INSERT INTO plan_tasks (plan_id, week_id, day_number, title, type, duration, completed, is_today) VALUES
    (v_plan_id, v_w3, 11, 'Dia 11: Biologia do Neurônio e Perceptron Multicamadas (MLP)', 'reading', '45 min', false, false),
    (v_plan_id, v_w3, 12, 'Dia 12: Gradiente Descendente e Backpropagation Matemático', 'video', '50 min', false, false),
    (v_plan_id, v_w3, 13, 'Dia 13: Introdução ao PyTorch: Tensores e Autograd', 'code', '60 min', false, false),
    (v_plan_id, v_w3, 14, 'Dia 14: Treinando sua primeira Rede Neural em PyTorch', 'code', '60 min', false, false),
    (v_plan_id, v_w3, 15, 'Dia 15: Evitando Overfitting: Dropout, BatchNorm e Early Stopping', 'quiz', '45 min', false, false);

    -- Atividades Semana 4
    INSERT INTO plan_tasks (plan_id, week_id, day_number, title, type, duration, completed, is_today) VALUES
    (v_plan_id, v_w4, 16, 'Dia 16: Concepção do Pipeline de Machine Learning', 'reading', '40 min', false, false),
    (v_plan_id, v_w4, 17, 'Dia 17: Serialização de Modelos com ONNX e Joblib', 'code', '50 min', false, false),
    (v_plan_id, v_w4, 18, 'Dia 18: Construção de Microsserviço de Inferência com FastAPI', 'code', '60 min', false, false),
    (v_plan_id, v_w4, 19, 'Dia 19: Containerização com Docker & Testes Unitários', 'code', '60 min', false, false),
    (v_plan_id, v_w4, 20, 'Dia 20: Apresentação Final e Revisão Geral da Trilha', 'project', '60 min', false, false);

    -- Recursos Curados
    INSERT INTO plan_resources (plan_id, category, title, author_or_creator, badge, badge_color, image_url, rating, rating_count, description) VALUES
    (v_plan_id, 'livros', 'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow', 'Aurélien Géron', 'Essencial IA', 'primary', 'https://lh3.googleusercontent.com/aida-public/AB6AXuABd2qJZyPJt_eN4kA2S9vCBOsqF9_5Zw6RqyvOOxBlyOPscMySC7Y0JhMtK1t64f49n93L5NxvUPsWEhiwJjcML4QhDehp6CBMND6wDfj89tAd8OfvZPH0KzIXEj3k0NF1FyB6fftraid5i1iCoAeI_uuHuZjZ9cyXjqAyc0Uj1DERZWtJ_kgX1eNQgSTje7GuBhOyJ7iVqhJdNZl008LvKaDGNT8TA-rIyz0ALCFdYda2HKbxL7ws', 4.9, '1.4k', 'Guia prático definitivo com exercícios passo a passo e códigos em Python.'),
    (v_plan_id, 'livros', 'Pattern Recognition and Machine Learning', 'Christopher M. Bishop', 'Referência Teórica', 'secondary', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCnXNgPQswaXKG6bSQ8kIaIG-vqGUHozaAzJxM5ndw34ClOXcErRsz5ypWuiv6IkjrsZDDfc6rPN6DBQhAxCUMGUEhWYL7nckPUOZSk0xsVTlGE2FXt6Gu-u_yNlXYDOKCxPiiso5qLxhZBcYVLQzB7_h6QznDrLBmdEmCmuk12UWMBSREwgQ_e9IQBluU74SeCP41MzXHBARs-Nw1DA0ZWdk7ATihHovBIwurmDJxeB9kByiKGZHq4', 4.8, '980', 'O clássico mundial de rigor matemático e probabilidade aplicada a ML.'),
    (v_plan_id, 'livros', 'The Hundred-Page Machine Learning Book', 'Andriy Burkov', 'Leitura Rápida', 'tertiary', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvzNSIe7J1F2FhHLnZEvlKplqsQvvEB95LFdlVbwmN_fjxnEOXcLfndkIJB0Pz3_LEPCjo_-QJVAHGly65YXo_A_XxGmF6MpRatwQhF5BDsZZ7aIgsy-rNVnP9bVk8EYYBpg3KZ-FTYVr87VuK26X7fBkQzSMZPzZybM50EbqvwJ2T3VABJI4uwtQe4vjI3rD25vEUd777hFmCWpt-vp63kW5TeH6L8P5ge8TggzOKNk17roR3bn2a', 4.7, '720', 'Visão sintetizada de todos os conceitos fundamentais em leitura concisa.'),
    (v_plan_id, 'filmes', 'AlphaGo - The Movie', 'DeepMind Documentary', 'Documentário', 'primary', NULL, 4.9, '3.2k', 'A histórica jornada de inteligência artificial que venceu o campeão mundial de Go.'),
    (v_plan_id, 'cursos', 'Machine Learning Specialization', 'Andrew Ng (Coursera)', 'Certificação Global', 'primary', NULL, 4.9, '150k', 'A especialização mais recomendada do mundo para formação sólida em IA.');

    -- Métodos Ativos
    INSERT INTO plan_practices (plan_id, method_type, tag, title, description, badge, meta, action_text) VALUES
    (v_plan_id, 'flashcards', 'Repetição Espaçada', 'Flashcards do Tema', '48 cartões inteligentes gerados a partir do cronograma da Semana 1.', '14 pendentes hoje', 'Repetição Ativa', 'Praticar Flashcards'),
    (v_plan_id, 'quiz', 'Avaliação Formativa', 'Quiz Dinâmico IA', '10 questões adaptativas sobre Álgebra Linear e Regressão.', '~8 min de duração', 'Diagnóstico IA', 'Iniciar Quiz'),
    (v_plan_id, 'feynman', 'Técnica Feynman', 'Resumo Ativo', 'Explique os conceitos com suas próprias palavras e receba feedback de lacunas.', 'Template estruturado', 'Autoexplicação', 'Abrir Template'),
    (v_plan_id, 'project', 'Mão na Massa', 'Mini-Projeto Guiado', 'Previsão de Preços imobiliários com Scikit-Learn e análise exploratória.', 'Jupyter Notebook', 'Aplicação Real', 'Ver Instruções');

  END IF;
END $$;
