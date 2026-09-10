import React, { useState, useMemo } from 'react';
import { FullStudyPlan } from '../types';

interface AllPlansViewProps {
  plans: FullStudyPlan[];
  onSelectPlan: (planId: string) => void;
  onOpenNewStudyModal: () => void;
  onOpenAiChat: (plan: FullStudyPlan) => void;
  onArchivePlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
}

export const AllPlansView: React.FC<AllPlansViewProps> = ({
  plans,
  onSelectPlan,
  onOpenNewStudyModal,
  onOpenAiChat,
  onArchivePlan,
  onDeletePlan,
}) => {
  const [activeFilter, setActiveFilter] = useState<'todos' | 'em_andamento' | 'concluido' | 'arquivado'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchesFilter =
        activeFilter === 'todos'
          ? p.status !== 'arquivado'
          : p.status === activeFilter;
      const matchesSearch =
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [plans, activeFilter, searchTerm]);

  // General KPIs
  const totalPlans = plans.length;
  const inProgressPlans = plans.filter((p) => p.status === 'em_andamento').length;
  const totalTasksCompleted = plans.reduce((acc, p) => acc + p.completedTasksCount, 0);
  const avgProgress = totalPlans > 0 ? Math.round(plans.reduce((acc, p) => acc + p.progressPercent, 0) / totalPlans) : 0;

  return (
    <div className="flex flex-col w-full pb-20 animate-fadeIn">
      {/* Page Header */}
      <section className="py-6 sm:py-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant/30">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-tertiary text-xs font-semibold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[15px]">folder_special</span>
            <span>Painel do Estudante</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-bold text-on-surface tracking-tight leading-tight">
            Meus Planos de Estudo
          </h1>
          <p className="text-sm sm:text-base text-on-surface-variant font-body leading-relaxed">
            Acompanhe suas jornadas ativas, avance nos cronogramas diários e consolide conhecimento com IA.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenNewStudyModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow-[0_2px_10px_rgba(74,124,89,0.25)] hover:bg-primary/90 transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Novo Estudo</span>
          </button>
        </div>
      </section>

      {/* KPI Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
        <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Trilhas Ativas</span>
            <div className="text-2xl font-headline font-bold text-on-surface mt-1">{inProgressPlans}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">local_library</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Atividades Feitas</span>
            <div className="text-2xl font-headline font-bold text-on-surface mt-1">{totalTasksCompleted}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-tertiary/10 text-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Média de Progresso</span>
            <div className="text-2xl font-headline font-bold text-on-surface mt-1">{avgProgress}%</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">trending_up</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/20 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Ritmo de Aprendizado</span>
            <div className="text-2xl font-headline font-bold text-on-surface mt-1">4 Dias seguidos 🔥</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-secondary-container text-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">bolt</span>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-low overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveFilter('todos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'todos'
                ? 'bg-secondary-container text-on-surface shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Todos ({plans.filter((p) => p.status !== 'arquivado').length})
          </button>
          <button
            onClick={() => setActiveFilter('em_andamento')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'em_andamento'
                ? 'bg-secondary-container text-on-surface shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Em Andamento ({plans.filter((p) => p.status === 'em_andamento').length})
          </button>
          <button
            onClick={() => setActiveFilter('concluido')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'concluido'
                ? 'bg-secondary-container text-on-surface shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Concluídos ({plans.filter((p) => p.status === 'concluido').length})
          </button>
          <button
            onClick={() => setActiveFilter('arquivado')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === 'arquivado'
                ? 'bg-secondary-container text-on-surface shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            Arquivados ({plans.filter((p) => p.status === 'arquivado').length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por tema ou ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="material-symbols-outlined text-sm text-outline absolute left-3 top-2.5">
            search
          </span>
        </div>
      </section>

      {/* Plans Card Grid */}
      {filteredPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group relative"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary/80 group-hover:bg-primary transition-colors"></div>

              <div className="p-6 space-y-4">
                {/* Badge and ID header */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-secondary-container text-on-secondary-container truncate max-w-[200px]">
                    {plan.badge}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant uppercase">
                    {plan.code}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3
                    onClick={() => onSelectPlan(plan.id)}
                    className="font-headline font-bold text-lg sm:text-xl text-on-surface group-hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug"
                  >
                    {plan.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1.5 flex items-center gap-2">
                    <span>Semana {plan.currentWeek} de {plan.durationWeeks}</span>
                    <span>•</span>
                    <span>{plan.dailyHours}</span>
                    <span>•</span>
                    <span>{plan.level}</span>
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 bg-surface-container-low p-3.5 rounded-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-on-surface flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      {plan.progressPercent}% concluído
                    </span>
                    <span className="text-on-surface-variant text-[11px]">
                      {plan.completedTasksCount}/{plan.totalTasksCount} atividades
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${plan.progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Today's pending task preview if any */}
                {plan.todayTask && !plan.todayTask.completed && (
                  <div className="p-3 rounded-xl bg-secondary-container/40 border border-tertiary/20 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-sm text-tertiary mt-0.5 shrink-0">
                      play_circle
                    </span>
                    <div className="text-xs min-w-0">
                      <span className="font-bold text-tertiary uppercase text-[10px] block">Próxima meta</span>
                      <p className="font-semibold text-on-surface truncate">{plan.todayTask.title}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="px-6 py-4 bg-surface-container-low/60 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenAiChat(plan)}
                  title="Conversar com Tutor IA"
                  className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary hover:text-primary/80 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">auto_awesome</span>
                </button>

                <div className="flex items-center gap-2">
                  {plan.status !== 'arquivado' ? (
                    <button
                      onClick={() => onArchivePlan(plan.id)}
                      title="Arquivar Plano"
                      className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">archive</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onDeletePlan(plan.id)}
                      title="Excluir Definitivamente"
                      className="p-2 rounded-xl hover:bg-error-container text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectPlan(plan.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 shadow-sm transition-all"
                  >
                    <span>Abrir Trilha</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">search_off</span>
          </div>
          <div className="space-y-1">
            <h3 className="font-headline font-bold text-lg text-on-surface">Nenhum plano encontrado</h3>
            <p className="text-xs text-on-surface-variant">
              Não encontramos trilhas de estudo correspondentes aos filtros selecionados.
            </p>
          </div>
          <button
            onClick={onOpenNewStudyModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 transition-all"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Criar Nova Trilha com IA</span>
          </button>
        </div>
      )}
    </div>
  );
};
