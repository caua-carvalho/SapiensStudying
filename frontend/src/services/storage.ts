import { FullStudyPlan, TaskActivity, WeekPlan, CuratedResource, PracticeMethod } from '../types';
import { StudyPlan } from './api';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'sapiens_db_plans_cache';

// Converte registro relacional do PostgreSQL em objeto FullStudyPlan tipado
export function mapRelationalDbToPlan(row: any): FullStudyPlan {
  // 1. Módulos semanais e tarefas
  const rawWeeks = row.weeks || row.plan_weeks || [];
  const weeks: WeekPlan[] = rawWeeks
    .sort((a: any, b: any) => (a.week_number || a.weekNumber || 0) - (b.week_number || b.weekNumber || 0))
    .map((w: any) => {
      const rawTasks = w.activities || w.plan_tasks || [];
      const activities: TaskActivity[] = rawTasks
        .sort((a: any, b: any) => (a.day_number || a.dayNumber || 0) - (b.day_number || b.dayNumber || 0))
        .map((t: any) => ({
          id: t.id,
          dayNumber: t.day_number || t.dayNumber || 1,
          title: t.title,
          description: t.description,
          type: t.type || 'reading',
          duration: t.duration || '45 min',
          completed: Boolean(t.completed),
          isToday: Boolean(t.is_today || t.isToday),
        }));

      return {
        weekNumber: w.week_number || w.weekNumber || 1,
        title: w.title,
        description: w.description || '',
        progressPercent: w.progress_percent || w.progressPercent || 0,
        activities,
      };
    });

  // 2. Recursos curados
  const rawResources = row.resources || row.plan_resources || [];
  const resources: CuratedResource[] = rawResources.map((r: any) => ({
    id: r.id,
    category: r.category || 'livros',
    title: r.title,
    authorOrCreator: r.author_or_creator || r.authorOrCreator || '',
    badge: r.badge,
    badgeColor: r.badge_color || r.badgeColor || 'primary',
    imageUrl: r.image_url || r.imageUrl,
    rating: Number(r.rating) || 4.8,
    ratingCount: r.rating_count || r.ratingCount || '1k',
    url: r.url,
    description: r.description,
  }));

  // 3. Métodos de prática ativa
  const rawMethods = row.methods || row.plan_practices || [];
  const methods: PracticeMethod[] = rawMethods.map((m: any) => ({
    id: m.id,
    methodType: m.method_type || m.methodType || 'flashcards',
    tag: m.tag || 'Método Ativo',
    title: m.title,
    description: m.description || '',
    badge: m.badge || '',
    meta: m.meta || '',
    actionText: m.action_text || m.actionText || 'Iniciar',
  }));

  // Localiza tarefa do dia ou próxima pendente
  const allActivities = weeks.flatMap((w) => w.activities);
  const todayAct = allActivities.find((a) => a.isToday && !a.completed) || allActivities.find((a) => !a.completed);

  return {
    id: row.id,
    code: row.code || `TR-${row.id.substring(0, 4).toUpperCase()}`,
    title: row.title || 'Plano de Estudos',
    category: row.category || 'Geral',
    badge: row.badge || '🌱 Trilha Personalizada com IA',
    createdAt: row.created_at
      ? new Date(row.created_at).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR'),
    durationWeeks: row.duration_weeks || row.durationWeeks || Math.max(1, weeks.length),
    dailyHours: row.daily_hours || row.dailyHours || '1.5h / dia',
    level: row.level || 'Intermediário',
    currentWeek: row.current_week || row.currentWeek || 1,
    progressPercent: row.progress_percent !== undefined ? row.progress_percent : 0,
    completedTasksCount: row.completed_tasks_count !== undefined ? row.completed_tasks_count : allActivities.filter(a => a.completed).length,
    totalTasksCount: row.total_tasks_count !== undefined ? row.total_tasks_count : allActivities.length,
    estimatedEndDate: row.estimated_end_date || row.estimatedEndDate || 'Em andamento',
    status: row.status || 'em_andamento',
    todayTask: todayAct
      ? {
          id: todayAct.id,
          dayText: `Dia ${todayAct.dayNumber} / ${allActivities.length || 20}`,
          title: todayAct.title,
          duration: todayAct.duration,
          typeText: todayAct.type === 'reading' ? 'Leitura' : todayAct.type === 'code' ? 'Exercício Prático' : 'Estudo Ativo',
          completed: todayAct.completed,
        }
      : undefined,
    weeks,
    resources,
    methods,
  };
}

// 1. Busca todos os planos consultando as tabelas relacionais do banco
export async function fetchAllPlansFromDB(): Promise<FullStudyPlan[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Tenta RPC list_all_study_plans
      const { data: rpcData, error: rpcError } = await supabase.rpc('list_all_study_plans');
      if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
        const plans = rpcData.map(mapRelationalDbToPlan);
        try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plans)); } catch {}
        return plans;
      }

      // 2. Consulta relacional com JOINs nas tabelas normalizadas
      const { data, error } = await supabase
        .from('study_plans')
        .select(`
          *,
          weeks:plan_weeks(
            *,
            activities:plan_tasks(*)
          ),
          resources:plan_resources(*),
          methods:plan_practices(*)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const plans = data.map(mapRelationalDbToPlan);
        try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(plans)); } catch {}
        return plans;
      }
    } catch (err) {
      console.error('Erro na consulta relacional do Supabase:', err);
    }
  }

  // Cache local de segurança
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  return [];
}

// 2. Busca plano completo pelo ID a partir das tabelas relacionais
export async function fetchPlanByIdFromDB(planId: string): Promise<FullStudyPlan | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      // 1. RPC get_full_study_plan
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_full_study_plan', {
        p_plan_id: planId,
      });

      if (!rpcError && rpcData && rpcData.id) {
        return mapRelationalDbToPlan(rpcData);
      }

      // 2. Query relacional direta
      const { data, error } = await supabase
        .from('study_plans')
        .select(`
          *,
          weeks:plan_weeks(
            *,
            activities:plan_tasks(*)
          ),
          resources:plan_resources(*),
          methods:plan_practices(*)
        `)
        .eq('id', planId)
        .single();

      if (!error && data) {
        return mapRelationalDbToPlan(data);
      }
    } catch (err) {
      console.error('Erro ao buscar plano relacional no Supabase:', err);
    }
  }

  // Cache
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const list: FullStudyPlan[] = JSON.parse(cached);
      return list.find((p) => p.id === planId) || null;
    }
  } catch {}

  return null;
}

// 3. Alterna a tarefa na tabela relacional plan_tasks e aciona o trigger de progresso
export async function toggleTaskInDB(
  planId: string,
  taskId: string,
  currentPlan: FullStudyPlan
): Promise<FullStudyPlan> {
  let totalTasks = 0;
  let completedTasks = 0;

  const updatedWeeks = currentPlan.weeks.map((week) => {
    let weekCompleted = 0;
    const updatedActivities = week.activities.map((act) => {
      const isTarget = act.id === taskId;
      const completed = isTarget ? !act.completed : act.completed;
      if (completed) {
        weekCompleted++;
      }
      return { ...act, completed };
    });

    totalTasks += updatedActivities.length;
    completedTasks += weekCompleted;

    const progressPercent = updatedActivities.length > 0
      ? Math.round((weekCompleted / updatedActivities.length) * 100)
      : 0;

    return {
      ...week,
      progressPercent,
      activities: updatedActivities,
    };
  });

  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  let updatedTodayTask = currentPlan.todayTask;
  if (updatedTodayTask && updatedTodayTask.id === taskId) {
    updatedTodayTask = {
      ...updatedTodayTask,
      completed: !updatedTodayTask.completed,
    };
  } else if (updatedTodayTask) {
    const found = updatedWeeks.flatMap((w) => w.activities).find((a) => a.id === updatedTodayTask?.id);
    if (found) {
      updatedTodayTask = { ...updatedTodayTask, completed: found.completed };
    }
  }

  const updatedPlan: FullStudyPlan = {
    ...currentPlan,
    weeks: updatedWeeks,
    completedTasksCount: completedTasks,
    totalTasksCount: totalTasks,
    progressPercent: overallProgress,
    todayTask: updatedTodayTask,
  };

  // Atualiza cache local
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const list: FullStudyPlan[] = JSON.parse(cached);
      const idx = list.findIndex((p) => p.id === planId);
      if (idx !== -1) {
        list[idx] = updatedPlan;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
      }
    }
  } catch {}

  // Atualiza diretamente na tabela relacional plan_tasks / RPC
  if (isSupabaseConfigured && supabase) {
    const client = supabase;
    try {
      // 1. RPC toggle_task_completion
      client.rpc('toggle_task_completion', { p_task_id: taskId }).then((res) => {
        if (res.error) {
          // 2. Atualização direta na tabela plan_tasks
          const targetTask = updatedWeeks.flatMap(w => w.activities).find(a => a.id === taskId);
          if (targetTask) {
            client
              .from('plan_tasks')
              .update({
                completed: targetTask.completed,
                completed_at: targetTask.completed ? new Date().toISOString() : null,
              })
              .eq('id', taskId)
              .then();
          }
        }
      });
    } catch (e) {
      console.warn('Erro ao atualizar status da tarefa no Supabase:', e);
    }
  }

  return updatedPlan;
}

// 4. Salva novo plano de estudo distribuindo os dados em cada tabela relacional
export async function saveGeneratedPlanToDB(
  topic: string,
  rawPlan: StudyPlan,
  dbSavedId?: string
): Promise<FullStudyPlan> {
  // Se o backend/Edge function já salvou e retornou a estrutura ou ID
  if (dbSavedId && isSupabaseConfigured && supabase) {
    const saved = await fetchPlanByIdFromDB(dbSavedId);
    if (saved) return saved;
  }

  const code = rawPlan.code || `TR-${Math.floor(1000 + Math.random() * 9000)}${topic.substring(0, 2).toUpperCase()}`;
  const title = rawPlan.title || topic;
  const category = rawPlan.category || 'Estudo Personalizado';
  const durationWeeks = rawPlan.durationWeeks || 4;
  const dailyHours = rawPlan.dailyHours || '1.5h / dia';
  const level = (rawPlan.level || 'Intermediário') as any;
  const estimatedEndDate = new Date(Date.now() + durationWeeks * 7 * 24 * 3600 * 1000).toLocaleDateString('pt-BR');

  let planId = dbSavedId || ('plan-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6));

  // 1. Inserção Relacional no Supabase
  if (isSupabaseConfigured && supabase) {
    const client = supabase;
    try {
      // A) Insere registro principal em study_plans
      const { data: planRow, error: planErr } = await client
        .from('study_plans')
        .insert({
          code,
          title,
          category,
          badge: rawPlan.badge || '🌱 Trilha Personalizada com IA',
          duration_weeks: durationWeeks,
          daily_hours: dailyHours,
          level,
          current_week: 1,
          progress_percent: 0,
          completed_tasks_count: 0,
          total_tasks_count: (rawPlan.cronograma || []).length,
          estimated_end_date: estimatedEndDate,
          status: 'em_andamento',
        })
        .select('id')
        .single();

      if (!planErr && planRow) {
        planId = planRow.id;

        // B) Insere semanas e tarefas
        const cronograma = rawPlan.cronograma || [];
        const itemsPerWeek = 5;
        const numWeeks = Math.max(1, Math.ceil(cronograma.length / itemsPerWeek));

        for (let w = 0; w < numWeeks; w++) {
          const weekItems = cronograma.slice(w * itemsPerWeek, (w + 1) * itemsPerWeek);
          const weekTitle = `Semana ${w + 1}: ${weekItems[0]?.topico || `Módulo ${w + 1}`}`;
          const weekDesc = weekItems[0]?.descricao || 'Desenvolvimento metódico dos conceitos e exercícios.';

          const { data: weekRow } = await client
            .from('plan_weeks')
            .insert({
              plan_id: planId,
              week_number: w + 1,
              title: weekTitle,
              description: weekDesc,
              progress_percent: 0,
            })
            .select('id')
            .single();

          if (weekRow) {
            const weekId = weekRow.id;
            const tasksToInsert = weekItems.map((item, idx) => {
              const globalIdx = w * itemsPerWeek + idx;
              return {
                plan_id: planId,
                week_id: weekId,
                day_number: item.dia || (globalIdx + 1),
                title: `Dia ${item.dia || (globalIdx + 1)}: ${item.topico}`,
                description: item.descricao,
                type: idx % 4 === 0 ? 'reading' : idx % 4 === 1 ? 'code' : idx % 4 === 2 ? 'video' : 'quiz',
                duration: '45-60 min',
                completed: false,
                is_today: globalIdx === 0,
              };
            });

            await client.from('plan_tasks').insert(tasksToInsert);
          }
        }

        // C) Insere recursos curados
        const resourcesToInsert: any[] = [];
        (rawPlan.livros || []).forEach((l, i) => {
          resourcesToInsert.push({
            plan_id: planId,
            category: 'livros',
            title: l.titulo,
            author_or_creator: l.autor,
            badge: i === 0 ? 'Essencial IA' : 'Referência Teórica',
            badge_color: i === 0 ? 'primary' : 'secondary',
            rating: 4.8 + (i % 2) * 0.1,
            rating_count: `${1000 + i * 200}`,
            description: l.descricao,
          });
        });

        (rawPlan.filmes || []).forEach((f) => {
          resourcesToInsert.push({
            plan_id: planId,
            category: 'filmes',
            title: f.titulo,
            author_or_creator: f.plataforma || 'Streaming',
            badge: 'Multimídia',
            badge_color: 'tertiary',
            rating: 4.7,
            rating_count: '850',
            description: f.sinopse,
          });
        });

        (rawPlan.recursos || []).forEach((r) => {
          resourcesToInsert.push({
            plan_id: planId,
            category: (r.tipo?.toLowerCase().includes('curso') ? 'cursos' : 'artigos'),
            title: r.titulo,
            author_or_creator: r.tipo || 'Recurso Online',
            badge: r.tipo || 'Recomendado',
            badge_color: 'primary',
            url: r.url,
            rating: 4.9,
            rating_count: '1.5k',
            description: r.descricao,
          });
        });

        if (resourcesToInsert.length > 0) {
          await client.from('plan_resources').insert(resourcesToInsert);
        }

        // D) Insere métodos de fixação
        const practicesToInsert = [
          {
            plan_id: planId,
            method_type: 'flashcards',
            tag: 'Repetição Espaçada',
            title: 'Flashcards do Tema',
            description: `Cartões inteligentes para consolidar os conceitos de ${title}.`,
            badge: '14 pendentes hoje',
            meta: 'Repetição Ativa',
            action_text: 'Praticar Flashcards',
          },
          {
            plan_id: planId,
            method_type: 'quiz',
            tag: 'Avaliação Formativa',
            title: 'Quiz Dinâmico IA',
            description: `10 questões adaptativas sobre ${title}.`,
            badge: '~8 min de duração',
            meta: 'Diagnóstico IA',
            action_text: 'Iniciar Quiz',
          },
          {
            plan_id: planId,
            method_type: 'feynman',
            tag: 'Técnica Feynman',
            title: 'Resumo Ativo',
            description: `Explique os conceitos de ${title} com suas próprias palavras e receba feedback.`,
            badge: 'Template estruturado',
            meta: 'Autoexplicação',
            action_text: 'Abrir Template',
          },
          {
            plan_id: planId,
            method_type: 'project',
            tag: 'Mão na Massa',
            title: 'Mini-Projeto Guiado',
            description: `Aplicação prática e desenvolvimento real sobre ${title}.`,
            badge: 'Instruções Práticas',
            meta: 'Aplicação Real',
            action_text: 'Ver Instruções',
          },
        ];

        await client.from('plan_practices').insert(practicesToInsert);

        // Retorna o plano montado a partir do banco
        const full = await fetchPlanByIdFromDB(planId);
        if (full) return full;
      }
    } catch (err) {
      console.error('Erro ao salvar no banco relacional Supabase:', err);
    }
  }

  // Fallback construção em memória e cache
  const cronograma = rawPlan.cronograma || [];
  const itemsPerWeek = 5;
  const numWeeks = Math.max(1, Math.ceil(cronograma.length / itemsPerWeek));
  let totalTasks = 0;
  let firstPending: TaskActivity | undefined;

  const weeks: WeekPlan[] = [];
  for (let w = 0; w < numWeeks; w++) {
    const weekItems = cronograma.slice(w * itemsPerWeek, (w + 1) * itemsPerWeek);
    const activities: TaskActivity[] = weekItems.map((item, index) => {
      const dayNum = item.dia || (w * itemsPerWeek + index + 1);
      const isToday = w === 0 && index === 0;
      const act: TaskActivity = {
        id: `${planId}-w${w + 1}-d${dayNum}`,
        dayNumber: dayNum,
        title: `Dia ${dayNum}: ${item.topico}`,
        description: item.descricao,
        type: index % 4 === 0 ? 'reading' : index % 4 === 1 ? 'code' : index % 4 === 2 ? 'video' : 'quiz',
        duration: '45-60 min',
        completed: false,
        isToday,
      };
      if (!firstPending) firstPending = act;
      return act;
    });

    totalTasks += activities.length;
    weeks.push({
      weekNumber: w + 1,
      title: `Semana ${w + 1}: ${weekItems[0]?.topico || `Módulo ${w + 1}`}`,
      description: weekItems.map((item) => item.topico).join(' • ').substring(0, 140) + '...',
      progressPercent: 0,
      activities,
    });
  }

  const fallbackPlan: FullStudyPlan = {
    id: planId,
    code,
    title,
    category,
    badge: '🌱 Trilha Personalizada com IA',
    createdAt: new Date().toLocaleDateString('pt-BR'),
    durationWeeks: numWeeks,
    dailyHours,
    level,
    currentWeek: 1,
    progressPercent: 0,
    completedTasksCount: 0,
    totalTasksCount: totalTasks,
    estimatedEndDate,
    status: 'em_andamento',
    todayTask: firstPending
      ? {
          id: firstPending.id,
          dayText: `Dia 1 / ${totalTasks}`,
          title: firstPending.title,
          duration: firstPending.duration,
          typeText: 'Estudo Ativo',
          completed: false,
        }
      : undefined,
    weeks,
    resources: (rawPlan.livros || []).map((l, i) => ({
      id: `${planId}-book-${i}`,
      category: 'livros',
      title: l.titulo,
      authorOrCreator: l.autor,
      badge: i === 0 ? 'Essencial IA' : 'Referência Teórica',
      badgeColor: i === 0 ? 'primary' : 'secondary',
      rating: 4.8,
      ratingCount: '1k',
      description: l.descricao,
    })),
    methods: [
      {
        id: `${planId}-m-0`,
        methodType: 'flashcards',
        tag: 'Repetição Espaçada',
        title: 'Flashcards do Tema',
        description: `Cartões inteligentes para consolidar os conceitos de ${title}.`,
        badge: '14 pendentes hoje',
        meta: 'Repetição Ativa',
        actionText: 'Praticar Flashcards',
      },
      {
        id: `${planId}-m-1`,
        methodType: 'quiz',
        tag: 'Avaliação Formativa',
        title: 'Quiz Dinâmico IA',
        description: `10 questões adaptativas sobre ${title}.`,
        badge: '~8 min de duração',
        meta: 'Diagnóstico IA',
        actionText: 'Iniciar Quiz',
      },
      {
        id: `${planId}-m-2`,
        methodType: 'feynman',
        tag: 'Técnica Feynman',
        title: 'Resumo Ativo',
        description: `Explique os conceitos de ${title} com suas próprias palavras e receba feedback.`,
        badge: 'Template estruturado',
        meta: 'Autoexplicação',
        actionText: 'Abrir Template',
      },
      {
        id: `${planId}-m-3`,
        methodType: 'project',
        tag: 'Mão na Massa',
        title: 'Mini-Projeto Guiado',
        description: `Aplicação prática e desenvolvimento real sobre ${title}.`,
        badge: 'Instruções Práticas',
        meta: 'Aplicação Real',
        actionText: 'Ver Instruções',
      },
    ],
  };

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    const list: FullStudyPlan[] = cached ? JSON.parse(cached) : [];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([fallbackPlan, ...list]));
  } catch {}

  return fallbackPlan;
}

// 5. Arquiva um plano na tabela study_plans
export async function archivePlanInDB(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from('study_plans')
        .update({ status: 'arquivado', updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (e) {
      console.error('Erro ao arquivar plano no Supabase:', e);
    }
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const list: FullStudyPlan[] = JSON.parse(cached);
      const updated = list.map((p) => (p.id === id ? { ...p, status: 'arquivado' as const } : p));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}
}

// 6. Exclui um plano em cascata nas tabelas relacionais
export async function deletePlanFromDB(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('study_plans').delete().eq('id', id);
    } catch (e) {
      console.error('Erro ao excluir plano no Supabase:', e);
    }
  }

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      const list: FullStudyPlan[] = JSON.parse(cached);
      const updated = list.filter((p) => p.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}
}
