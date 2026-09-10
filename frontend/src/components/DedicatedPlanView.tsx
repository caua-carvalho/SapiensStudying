import React, { useState } from 'react';
import { FullStudyPlan, TaskActivity } from '../types';

interface DedicatedPlanViewProps {
  plan: FullStudyPlan;
  onBackToPlans: () => void;
  onBackToHome: () => void;
  onToggleTask: (taskId: string) => void;
  onOpenAiChat: (plan: FullStudyPlan) => void;
  onOpenFlashcards: (plan: FullStudyPlan) => void;
  onOpenQuiz: (plan: FullStudyPlan) => void;
  onOpenFeynman: (plan: FullStudyPlan) => void;
  onArchivePlan: (planId: string) => void;
}

export const DedicatedPlanView: React.FC<DedicatedPlanViewProps> = ({
  plan,
  onBackToPlans,
  onBackToHome,
  onToggleTask,
  onOpenAiChat,
  onOpenFlashcards,
  onOpenQuiz,
  onOpenFeynman,
  onArchivePlan,
}) => {
  const [activeWeekNum, setActiveWeekNum] = useState<number>(plan.currentWeek || 1);
  const [selectedResourceCategory, setSelectedResourceCategory] = useState<
    'livros' | 'filmes' | 'cursos' | 'podcasts' | 'artigos'
  >('livros');
  const [copiedLink, setCopiedLink] = useState(false);
  const [quickAiQuestion, setQuickAiQuestion] = useState('');

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleQuickAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAiQuestion.trim()) return;
    onOpenAiChat(plan);
    setQuickAiQuestion('');
  };

  const currentWeekData = plan.weeks.find((w) => w.weekNumber === activeWeekNum) || plan.weeks[0];

  const filteredResources = plan.resources.filter((r) => r.category === selectedResourceCategory);
  // Fallback if none in specific category to show other resources
  const displayedResources = filteredResources.length > 0 ? filteredResources : plan.resources.slice(0, 3);

  // SVG circular calculation
  const dashArray = `${plan.progressPercent}, 100`;

  // Helper for task type icons
  const getTaskIcon = (type: TaskActivity['type']) => {
    switch (type) {
      case 'reading':
        return { icon: 'menu_book', label: 'Leitura' };
      case 'code':
        return { icon: 'code', label: 'Exercício Prático' };
      case 'video':
        return { icon: 'smart_display', label: 'Videoaula' };
      case 'quiz':
        return { icon: 'quiz', label: 'Exercício Aplicado' };
      case 'project':
        return { icon: 'terminal', label: 'Mão na Massa' };
      default:
        return { icon: 'task_alt', label: 'Atividade' };
    }
  };

  return (
    <div className="flex flex-col w-full pb-16 animate-fadeIn">
      {/* Breadcrumb */}
      <nav aria-label="Caminho de navegação" className="py-4 flex items-center gap-2 text-xs font-medium text-on-surface-variant">
        <button
          onClick={onBackToHome}
          className="hover:text-primary transition-colors flex items-center gap-1"
          type="button"
        >
          <span className="material-symbols-outlined text-sm">home</span>
          <span>Início</span>
        </button>
        <span className="material-symbols-outlined text-xs opacity-60">chevron_right</span>
        <button
          onClick={onBackToPlans}
          className="hover:text-primary transition-colors"
          type="button"
        >
          Meus Temas
        </button>
        <span className="material-symbols-outlined text-xs opacity-60">chevron_right</span>
        <span className="text-on-surface font-semibold truncate max-w-xs sm:max-w-md">
          {plan.title}
        </span>
      </nav>

      {/* Layout Principal de 2 Colunas (70% / 30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUNA PRINCIPAL (Esquerda - ~70%) */}
        <div className="lg:col-span-8 flex flex-col gap-8 min-w-0">
          {/* 1. Header do Tema */}
          <section className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 relative overflow-hidden">
            {/* Detalhe decorativo orgânico */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-primary/5 pointer-events-none blur-2xl"></div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
                {plan.badge}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[11px] font-mono tracking-wider uppercase">
                ID: {plan.code}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <h1 className="font-headline text-3xl sm:text-4xl font-bold text-on-surface tracking-tight leading-tight">
                {plan.title}
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Gerado em {plan.createdAt}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-tertiary">calendar_today</span>
                  {plan.durationWeeks} semanas
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-primary">pace</span>
                  {plan.dailyHours}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-on-surface-variant">school</span>
                  Nível {plan.level}
                </span>
              </p>
            </div>

            {/* Barra de Progresso com Métricas */}
            <div className="flex flex-col gap-2 bg-surface-container-low p-4 rounded-xl">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-semibold text-on-surface flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  {plan.progressPercent}% concluído
                </span>
                <span className="text-on-surface-variant font-medium">
                  {plan.completedTasksCount} de {plan.totalTasksCount} atividades finalizadas
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${plan.progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onOpenAiChat(plan)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-semibold text-sm shadow-md hover:bg-primary/90 transition-all active:scale-95"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span>Conversar com IA</span>
              </button>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-medium transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>Imprimir / PDF</span>
              </button>

              <button
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-medium transition-colors relative"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                <span>{copiedLink ? 'Link Copiado!' : 'Compartilhar'}</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Deseja arquivar este plano de estudos?')) {
                    onArchivePlan(plan.id);
                  }
                }}
                aria-label="Arquivar"
                className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-error transition-colors ml-auto"
                title="Arquivar Plano"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">archive</span>
              </button>
            </div>
          </section>

          {/* 2. Cronograma Semanal */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline text-2xl font-bold text-on-surface">Seu Cronograma Semanal</h2>
                <p className="text-xs sm:text-sm text-on-surface-variant">
                  Roteiro metódico de aprendizado ativo e aplicação prática
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container">
                Semana {activeWeekNum} de {plan.durationWeeks}
              </span>
            </div>

            {/* Semana Ativa & Expandida */}
            {currentWeekData && (
              <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-sm flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-surface-container-high">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-fixed text-on-primary-fixed font-bold flex items-center justify-center font-headline text-lg">
                      {currentWeekData.weekNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-headline font-bold text-base sm:text-lg text-on-surface">
                          {currentWeekData.title}
                        </h3>
                        {currentWeekData.weekNumber === plan.currentWeek && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            Atual
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {currentWeekData.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-on-surface-variant sm:text-right font-mono shrink-0 pl-12 sm:pl-0">
                    {currentWeekData.progressPercent || 0}% desta semana
                  </div>
                </div>

                {/* Lista de Dias da Semana Ativa */}
                <div className="flex flex-col gap-2.5" id={`week${currentWeekData.weekNumber}-days`}>
                  {currentWeekData.activities.map((act) => {
                    const taskMeta = getTaskIcon(act.type);
                    const isTodayHighlight = act.isToday && !act.completed;

                    if (isTodayHighlight) {
                      return (
                        <div
                          key={act.id}
                          className="flex items-center justify-between gap-4 p-4 rounded-xl bg-secondary-container text-on-secondary-container shadow-sm"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              id="check-day-active"
                              checked={act.completed}
                              onChange={() => onToggleTask(act.id)}
                              className="w-5 h-5 rounded accent-primary text-primary focus:ring-0 focus:outline-none cursor-pointer"
                            />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-on-surface truncate">
                                  {act.title}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-tertiary text-on-tertiary uppercase tracking-wider">
                                  Hoje
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
                                <span className="inline-flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">
                                    {taskMeta.icon}
                                  </span>
                                  <span>{taskMeta.label}</span>
                                </span>
                                <span>•</span>
                                <span className="font-mono">{act.duration}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => onToggleTask(act.id)}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm"
                            type="button"
                          >
                            <span>Concluir</span>
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </button>
                        </div>
                      );
                    }

                    return (
                      <label
                        key={act.id}
                        className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer group select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={act.completed}
                            onChange={() => onToggleTask(act.id)}
                            className="w-5 h-5 rounded accent-primary text-primary focus:ring-0 focus:outline-none cursor-pointer"
                          />
                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-sm font-semibold truncate transition-colors ${
                                act.completed
                                  ? 'text-on-surface-variant line-through group-hover:text-on-surface'
                                  : 'text-on-surface group-hover:text-primary'
                              }`}
                            >
                              {act.title}
                            </span>
                            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                              <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">
                                  {taskMeta.icon}
                                </span>
                                <span>{taskMeta.label}</span>
                              </span>
                              <span>•</span>
                              <span className="font-mono">{act.duration}</span>
                            </div>
                          </div>
                        </div>

                        {act.completed ? (
                          <span className="shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-primary-fixed text-on-primary-fixed">
                            Concluído
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs text-on-surface-variant font-medium">
                            {act.dayNumber > (plan.todayTask ? 4 : 2) ? 'Amanhã' : 'Pendente'}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Outras Semanas (Accordion / Seletor interativo) */}
            <div className="space-y-3">
              {plan.weeks
                .filter((w) => w.weekNumber !== activeWeekNum)
                .map((week) => (
                  <div
                    key={week.weekNumber}
                    onClick={() => setActiveWeekNum(week.weekNumber)}
                    className="bg-surface-container-low hover:bg-surface-container rounded-xl p-4 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface-variant flex items-center justify-center font-headline font-bold text-sm group-hover:bg-primary-fixed group-hover:text-on-primary-fixed transition-colors">
                        {week.weekNumber}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-headline font-semibold text-sm sm:text-base text-on-surface group-hover:text-primary transition-colors truncate">
                          {week.title}
                        </h4>
                        <p className="text-xs text-on-surface-variant truncate">
                          {week.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-on-surface-variant font-mono hidden sm:inline">
                        {week.activities.length} atividades ({week.progressPercent || 0}%)
                      </span>
                      <span className="material-symbols-outlined text-on-surface-variant text-lg">
                        expand_more
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {/* 3. Material de Estudo Curado */}
          <section className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-headline text-2xl font-bold text-on-surface">
                  Material de Estudo Curado
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant">
                  Fontes de alta fidelidade selecionadas pelo motor pedagógico
                </p>
              </div>
            </div>

            {/* Abas com Filtro */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
              <button
                onClick={() => setSelectedResourceCategory('livros')}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap shadow-sm transition-all ${
                  selectedResourceCategory === 'livros'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                Livros
              </button>
              <button
                onClick={() => setSelectedResourceCategory('filmes')}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  selectedResourceCategory === 'filmes'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                Filmes & Documentários
              </button>
              <button
                onClick={() => setSelectedResourceCategory('cursos')}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  selectedResourceCategory === 'cursos'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                Cursos Online
              </button>
              <button
                onClick={() => setSelectedResourceCategory('podcasts')}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  selectedResourceCategory === 'podcasts'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                Podcasts
              </button>
              <button
                onClick={() => setSelectedResourceCategory('artigos')}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                  selectedResourceCategory === 'artigos'
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                }`}
                type="button"
              >
                Artigos Científicos
              </button>
            </div>

            {/* Grid de Cards de Recursos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {displayedResources.map((rec) => (
                <div
                  key={rec.id}
                  className="bg-surface-container-lowest rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col gap-3">
                    {rec.imageUrl ? (
                      <div className="relative w-full h-44 rounded-lg overflow-hidden bg-surface-container">
                        <img
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          alt={rec.title}
                          src={rec.imageUrl}
                        />
                        <span
                          className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold shadow ${
                            rec.badgeColor === 'secondary'
                              ? 'bg-secondary text-on-secondary'
                              : rec.badgeColor === 'tertiary'
                              ? 'bg-tertiary text-on-tertiary'
                              : 'bg-primary text-on-primary'
                          }`}
                        >
                          {rec.badge || 'Recomendado'}
                        </span>
                      </div>
                    ) : (
                      <div className="relative w-full h-32 rounded-lg bg-surface-container-high flex items-center justify-center p-4 text-center">
                        <span className="material-symbols-outlined text-4xl text-primary/40">
                          {rec.category === 'filmes' ? 'movie' : rec.category === 'podcasts' ? 'podcasts' : 'menu_book'}
                        </span>
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary text-on-primary shadow">
                          {rec.badge || 'Recomendado'}
                        </span>
                      </div>
                    )}

                    <div>
                      <h4 className="font-headline font-bold text-sm text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                        {rec.title}
                      </h4>
                      <p className="text-xs text-on-surface-variant mt-1">{rec.authorOrCreator}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-surface-container-low flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-tertiary font-bold">
                      <span className="material-symbols-outlined text-[15px] material-symbols-filled">star</span>
                      <span>{rec.rating || 4.8}</span>
                      <span className="text-on-surface-variant text-[11px] font-normal">
                        ({rec.ratingCount || '950'})
                      </span>
                    </div>
                    <a
                      className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
                      href={rec.url || '#'}
                      target={rec.url ? '_blank' : '_self'}
                      rel="noreferrer"
                    >
                      <span>Ver Detalhes</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Pratique e Fixe o Conteúdo (Métodos Ativos) */}
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">
                Pratique e Fixe o Conteúdo
              </h2>
              <p className="text-xs sm:text-sm text-on-surface-variant">
                Metodologias cognitivas comprovadas para retenção de longo prazo
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Flashcards */}
              <div className="bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">style</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Repetição Espaçada
                    </span>
                    <h3 className="font-headline font-bold text-base text-on-surface mt-0.5">
                      Flashcards do Tema
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Cartões inteligentes gerados a partir do cronograma da trilha.
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-surface-container-high flex items-center justify-between">
                  <span className="text-xs font-mono text-on-surface-variant">14 pendentes hoje</span>
                  <button
                    onClick={() => onOpenFlashcards(plan)}
                    className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-colors"
                    type="button"
                  >
                    Praticar Flashcards
                  </button>
                </div>
              </div>

              {/* Quiz Dinâmico */}
              <div className="bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">psychology_alt</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
                      Avaliação Formativa
                    </span>
                    <h3 className="font-headline font-bold text-base text-on-surface mt-0.5">
                      Quiz Dinâmico IA
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Questões adaptativas para diagnóstico e consolidação.
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-surface-container-high flex items-center justify-between">
                  <span className="text-xs font-mono text-on-surface-variant">~8 min de duração</span>
                  <button
                    onClick={() => onOpenQuiz(plan)}
                    className="px-3.5 py-1.5 rounded-lg bg-tertiary text-on-tertiary text-xs font-semibold hover:bg-tertiary/90 transition-colors"
                    type="button"
                  >
                    Iniciar Quiz
                  </button>
                </div>
              </div>

              {/* Resumo Ativo Feynman */}
              <div className="bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">edit_note</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                      Técnica Feynman
                    </span>
                    <h3 className="font-headline font-bold text-base text-on-surface mt-0.5">
                      Resumo Ativo
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Explique os conceitos com suas próprias palavras e receba feedback de lacunas.
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-surface-container-high flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">Template estruturado</span>
                  <button
                    onClick={() => onOpenFeynman(plan)}
                    className="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors"
                    type="button"
                  >
                    Abrir Template
                  </button>
                </div>
              </div>

              {/* Mini-Projeto Guiado */}
              <div className="bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">construction</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      Mão na Massa
                    </span>
                    <h3 className="font-headline font-bold text-base text-on-surface mt-0.5">
                      Mini-Projeto Guiado
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Construção prática e aplicação real dos conhecimentos adquiridos.
                    </p>
                  </div>
                </div>
                <div className="mt-5 pt-3 border-t border-surface-container-high flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant">Instruções Práticas</span>
                  <button
                    onClick={() => {
                      alert(`Instruções do Projeto de ${plan.title}:

1. Defina o problema prático e escopo de entrega.
2. Crie uma branch no Git e configure seu ambiente.
3. Implemente os componentes principais conforme o cronograma.
4. Realize testes e envie para avaliação com o Tutor IA.`);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors"
                    type="button"
                  >
                    Ver Instruções
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* SIDEBAR FIXA / LATERAL (Direita - ~30%) */}
        <aside className="lg:col-span-4 flex flex-col gap-6 w-full">
          {/* 1. Card Progresso Geral */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-on-surface">Progresso Geral</h3>
              <span className="material-symbols-outlined text-on-surface-variant text-lg">
                donut_large
              </span>
            </div>

            <div className="flex items-center gap-5">
              {/* Gráfico SVG Circular */}
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                  {/* Círculo de fundo */}
                  <path
                    className="text-surface-container-high"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3.5"
                  ></path>
                  {/* Círculo de preenchimento */}
                  <path
                    className="text-primary transition-all duration-1000 ease-out"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeDasharray={dashArray}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  ></path>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-headline font-bold text-xl text-on-surface leading-none">
                    {plan.progressPercent}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-on-surface-variant font-semibold mt-0.5">
                    feito
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0"></span>
                  <span className="text-on-surface font-semibold">
                    {plan.completedTasksCount} atividades feitas
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-surface-container-highest shrink-0"></span>
                  <span className="text-on-surface-variant">
                    {plan.totalTasksCount - plan.completedTasksCount} restantes
                  </span>
                </div>
                <div className="pt-1 text-[11px] text-on-surface-variant">
                  Previsão de término:<br />
                  <strong className="text-on-surface font-semibold">
                    {plan.estimatedEndDate}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Card A Fazer Hoje */}
          {plan.todayTask && (
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-4 border-l-4 border-tertiary">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary text-lg">alarm</span>
                  <h3 className="font-headline font-bold text-base text-on-surface">A Fazer Hoje</h3>
                </div>
                <span className="text-xs font-mono font-semibold text-tertiary">
                  {plan.todayTask.dayText}
                </span>
              </div>

              <div className="bg-surface-container-low p-3.5 rounded-xl flex flex-col gap-2">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="aside-day-task"
                    checked={plan.todayTask.completed}
                    onChange={() => onToggleTask(plan.todayTask!.id)}
                    className="mt-0.5 w-4 h-4 rounded accent-primary text-primary focus:ring-0 cursor-pointer"
                  />
                  <label
                    htmlFor="aside-day-task"
                    className={`text-xs font-semibold leading-snug cursor-pointer transition-colors ${
                      plan.todayTask.completed ? 'line-through text-on-surface-variant' : 'text-on-surface'
                    }`}
                  >
                    {plan.todayTask.title}
                  </label>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-on-surface-variant pl-6">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    {plan.todayTask.duration}
                  </span>
                  <span>•</span>
                  <span>{plan.todayTask.typeText}</span>
                </div>
              </div>

              <button
                onClick={() => onToggleTask(plan.todayTask!.id)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 ${
                  plan.todayTask.completed
                    ? 'bg-surface-container-highest text-on-surface'
                    : 'bg-primary text-on-primary hover:bg-primary/90'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-sm">
                  {plan.todayTask.completed ? 'task_alt' : 'play_circle'}
                </span>
                <span>{plan.todayTask.completed ? 'Atividade Concluída' : 'Iniciar Atividade de Hoje'}</span>
              </button>
            </div>
          )}

          {/* 3. Card Ritmo de Aprendizado */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-on-surface">Ritmo de Aprendizado</h3>
              <span className="text-xs font-bold text-tertiary flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-tertiary">local_fire_department</span>
                4 Dias
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Sua consistência nesta semana:
            </p>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d, i) => (
                <div key={d} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-on-surface-variant font-medium">{d}</span>
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      i < 4
                        ? 'bg-primary text-on-primary'
                        : i === 4
                        ? 'border-2 border-dashed border-primary/50 text-primary'
                        : 'bg-surface-container-high text-on-surface-variant'
                    }`}
                  >
                    {i < 4 ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Card Sapiens IA Tutor */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 text-primary font-bold text-base font-headline">
              <span className="material-symbols-outlined text-xl">psychology</span>
              <h3>Sapiens Tutor IA</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Tem alguma dúvida sobre este plano? Peça uma explicação resumida ou dicas personalizadas.
            </p>
            <form onSubmit={handleQuickAsk} className="flex flex-col gap-2">
              <input
                type="text"
                value={quickAiQuestion}
                onChange={(e) => setQuickAiQuestion(e.target.value)}
                placeholder="Ex: Como funciona a regressão linear?"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button
                type="submit"
                disabled={!quickAiQuestion.trim()}
                className="w-full py-2 px-3 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <span>Perguntar ao Tutor</span>
                <span className="material-symbols-outlined text-xs">send</span>
              </button>
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
};
