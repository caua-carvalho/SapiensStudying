import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AllPlansView } from './components/AllPlansView';
import { DedicatedPlanView } from './components/DedicatedPlanView';
import { CreatePlanModal } from './components/CreatePlanModal';
import { FlashcardsModal, QuizModal, FeynmanModal } from './components/MethodModals';
import { AiChatModal } from './components/AiChatModal';
import { generatePlan } from './services/api';
import {
  fetchAllPlansFromDB,
  toggleTaskInDB,
  saveGeneratedPlanToDB,
  archivePlanInDB,
  deletePlanFromDB,
} from './services/storage';
import { FullStudyPlan } from './types';

const TRENDING_SUGGESTIONS = [
  'Machine Learning',
  'Arquitetura de Software',
  'Neurociência do Hábito',
  'Design Systems',
  'Python para Dados',
  'Finanças Pessoais',
];

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'all-plans' | 'dedicated-plan' | 'estatisticas' | 'explorar'>('all-plans');
  const [plans, setPlans] = useState<FullStudyPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(true);

  // Generator on Home
  const [homeTopic, setHomeTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeChatPlan, setActiveChatPlan] = useState<FullStudyPlan | null>(null);
  const [activeFlashcardsPlan, setActiveFlashcardsPlan] = useState<FullStudyPlan | null>(null);
  const [activeQuizPlan, setActiveQuizPlan] = useState<FullStudyPlan | null>(null);
  const [activeFeynmanPlan, setActiveFeynmanPlan] = useState<FullStudyPlan | null>(null);

  // Carrega dados reais do banco de dados ao iniciar
  useEffect(() => {
    async function loadDatabasePlans() {
      setInitialLoading(true);
      try {
        console.log("Inicio do try de carregamento de planos");
        const dbPlans = await fetchAllPlansFromDB();
        setPlans(dbPlans);

        const hash = window.location.hash;
        if (hash.startsWith('#/plano/')) {
          const id = hash.replace('#/plano/', '');
          if (dbPlans.some((p) => p.id === id)) {
            setSelectedPlanId(id);
            setCurrentView('dedicated-plan');
          } else if (dbPlans.length > 0) {
            setSelectedPlanId(dbPlans[0].id);
          }
        } else if (hash === '#/home' || hash === '#/') {
          setCurrentView('home');
        } else if (dbPlans.length > 0) {
          setSelectedPlanId(dbPlans[0].id);
        }

        console.log("Fim do try de carregamento de planos");
      } catch (err) {
        console.error('Erro ao carregar dados do banco:', err);
      } finally {
        setInitialLoading(false);
      }
    }

    loadDatabasePlans();
  }, []);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setCurrentView('dedicated-plan');
    window.location.hash = `#/plano/${planId}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (view: 'home' | 'all-plans' | 'estatisticas' | 'explorar') => {
    setCurrentView(view);
    if (view === 'all-plans') {
      window.location.hash = '#/planos';
    } else if (view === 'home') {
      window.location.hash = '#/';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleTask = async (taskId: string) => {
    const currentPlan = plans.find((p) => p.id === selectedPlanId);
    if (!currentPlan) return;

    const updatedPlan = await toggleTaskInDB(selectedPlanId, taskId, currentPlan);
    setPlans((prev) => prev.map((p) => (p.id === selectedPlanId ? updatedPlan : p)));
  };

  const handleArchivePlan = async (planId: string) => {
    await archivePlanInDB(planId);
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, status: 'arquivado' as const } : p)));
    if (currentView === 'dedicated-plan' && selectedPlanId === planId) {
      handleNavigate('all-plans');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    await deletePlanFromDB(planId);
    setPlans((prev) => prev.filter((p) => p.id !== planId));
  };

  const handlePlanCreated = (newPlan: FullStudyPlan) => {
    setPlans((prev) => [newPlan, ...prev.filter((p) => p.id !== newPlan.id)]);
    setShowCreateModal(false);
    setSelectedPlanId(newPlan.id);
    setCurrentView('dedicated-plan');
    window.location.hash = `#/plano/${newPlan.id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = homeTopic.trim();
    if (!query || generating) return;

    setGenerating(true);
    setHomeError(null);

    try {
      const result = await generatePlan(query);
      const newPlan = await saveGeneratedPlanToDB(query, result.plan, result.savedPlanId);
      handlePlanCreated(newPlan);
    } catch (err: any) {
      setHomeError(err.message || 'Erro ao gerar o plano de estudos.');
    } finally {
      setGenerating(false);
    }
  };

  const currentSelectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  return (
    <div className="bg-background font-body text-on-surface antialiased min-h-screen flex flex-col">
      {/* HEADER */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenNewStudyModal={() => setShowCreateModal(true)}
      />

      {/* MAIN CONTAINER */}
      <main className="w-full pt-16 bg-background flex-1 max-w-7xl mx-auto px-6 lg:px-12">
        {/* Loading inicial do banco */}
        {initialLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-surface-container-high border-t-primary animate-spin"></div>
            <p className="font-headline font-semibold text-sm text-on-surface-variant">
              Carregando dados do banco...
            </p>
          </div>
        ) : (
          <>
            {/* VIEW 1: HOME */}
            {currentView === 'home' && (
              <div className="flex flex-col w-full py-12 md:py-16 space-y-16 lg:space-y-20 animate-fadeIn">
                {/* HERO SECTION */}
                <section className="relative flex flex-col items-center text-center space-y-8">
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 max-w-2xl h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
                  <div className="absolute top-20 right-1/4 w-48 h-48 bg-tertiary/10 rounded-full blur-2xl pointer-events-none -z-10"></div>

                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container/70 shadow-sm text-tertiary text-xs md:text-sm font-semibold tracking-wide">
                    <span className="material-symbols-outlined text-base text-tertiary material-symbols-filled">bolt</span>
                    <span>Aprendizado Acelerado por Inteligência Artificial</span>
                  </div>

                  <div className="max-w-3xl space-y-4">
                    <h1 className="font-headline text-4xl sm:text-5xl lg:text-6xl text-on-surface font-bold tracking-tight leading-[1.15]">
                      O que você quer <span className="text-primary italic font-normal">estudar hoje?</span>
                    </h1>
                    <p className="font-body text-base sm:text-lg lg:text-xl text-on-surface-variant max-w-2xl mx-auto font-normal leading-relaxed">
                      Digite qualquer tema e receba um plano de estudos completo com cronograma semanal, curadoria multimídia e métodos ativos de fixação.
                    </p>
                  </div>

                  {/* Search Box */}
                  <div className="w-full max-w-3xl relative z-20">
                    <div className="relative bg-surface-container-lowest rounded-2xl shadow-[0_8px_30px_rgba(46,50,48,0.08)] p-2 transition-all focus-within:shadow-[0_12px_40px_rgba(74,124,89,0.16)] border border-outline-variant/30">
                      <form onSubmit={handleHomeSubmit} className="flex items-center gap-2 h-14 sm:h-16">
                        <div className="flex items-center justify-center pl-3 sm:pl-4 text-primary shrink-0">
                          <span className="material-symbols-outlined text-2xl sm:text-3xl">psychology</span>
                        </div>
                        <input
                          type="text"
                          value={homeTopic}
                          onChange={(e) => setHomeTopic(e.target.value)}
                          placeholder="Ex: Machine Learning, História do Brasil, Fotografia, Rust..."
                          disabled={generating}
                          className="w-full h-full bg-transparent text-on-surface placeholder:text-outline font-body text-sm sm:text-base md:text-lg focus:outline-none px-2"
                        />
                        <button
                          type="submit"
                          disabled={generating || !homeTopic.trim()}
                          className="shrink-0 h-11 sm:h-12 px-5 sm:px-7 rounded-xl bg-primary text-on-primary font-semibold text-sm sm:text-base flex items-center gap-2 shadow-[0_4px_14px_rgba(74,124,89,0.3)] hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                          {generating ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-1 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Gerando...</span>
                            </>
                          ) : (
                            <>
                              <span>Gerar Plano</span>
                              <span className="material-symbols-outlined text-lg sm:text-xl material-symbols-filled">auto_awesome</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    {homeError && (
                      <div className="mt-4 p-3.5 rounded-xl bg-error-container text-on-error-container text-xs text-left">
                        {homeError}
                      </div>
                    )}

                    {/* Suggestions */}
                    <div className="mt-3 bg-surface-container-low/95 backdrop-blur-md rounded-xl p-3 shadow-sm text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-outline-variant/30">
                      <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant uppercase tracking-wider shrink-0">
                        <span className="material-symbols-outlined text-sm text-tertiary">trending_up</span>
                        <span>Sugestões em alta:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {TRENDING_SUGGESTIONS.slice(0, 4).map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => {
                              setHomeTopic(sug);
                              handleHomeSubmit({ preventDefault: () => {} } as any);
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface hover:bg-primary hover:text-on-primary transition-colors font-medium"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* RECENT STUDIES SECTION (Dados Reais do Banco) */}
                <section className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                    <div>
                      <span className="text-xs uppercase tracking-widest font-semibold text-tertiary">Progresso Contínuo</span>
                      <h2 className="font-headline text-2xl sm:text-3xl text-on-surface font-bold tracking-tight">Estudos no Banco</h2>
                      <p className="text-sm text-on-surface-variant">Continue de onde parou e mantenha sua consistência mental ativa.</p>
                    </div>
                    <button
                      onClick={() => handleNavigate('all-plans')}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors self-start sm:self-auto"
                    >
                      <span>Ver todos os temas ({plans.length})</span>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </button>
                  </div>

                  {plans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                      {plans.slice(0, 4).map((p) => (
                        <div
                          key={p.id}
                          className="group bg-surface-container-low hover:bg-surface-container-lowest rounded-2xl p-5 transition-all duration-300 shadow-sm hover:shadow-[0_8px_25px_rgba(46,50,48,0.06)] flex flex-col justify-between relative overflow-hidden border border-outline-variant/20"
                        >
                          <div className="absolute top-0 left-0 right-0 h-1 bg-primary"></div>
                          <div className="space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                                {p.status === 'em_andamento' ? 'Em andamento' : 'Revisão'}
                              </span>
                              <span className="text-[11px] text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">schedule</span>
                                {p.durationWeeks} sem
                              </span>
                            </div>
                            <div className="space-y-1">
                              <h3
                                onClick={() => handleSelectPlan(p.id)}
                                className="font-headline font-bold text-base text-on-surface group-hover:text-primary transition-colors line-clamp-2 cursor-pointer"
                              >
                                {p.title}
                              </h3>
                              <p className="text-xs text-on-surface-variant">
                                Semana {p.currentWeek} • {p.level}
                              </p>
                            </div>

                            {/* Progress */}
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-3">
                                <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <circle className="text-surface-container-high stroke-current" cx="18" cy="18" fill="none" r="14" strokeWidth="3"></circle>
                                    <circle
                                      className="text-primary stroke-current"
                                      cx="18"
                                      cy="18"
                                      fill="none"
                                      r="14"
                                      strokeDasharray="87.96"
                                      strokeDashoffset={87.96 - (87.96 * p.progressPercent) / 100}
                                      strokeLinecap="round"
                                      strokeWidth="3"
                                    ></circle>
                                  </svg>
                                  <span className="absolute font-body font-bold text-[11px] text-on-surface">
                                    {p.progressPercent}%
                                  </span>
                                </div>
                                <div className="text-xs">
                                  <p className="font-semibold text-on-surface">
                                    {p.completedTasksCount}/{p.totalTasksCount} tarefas
                                  </p>
                                  <p className="text-on-surface-variant text-[11px]">
                                    Semana {p.currentWeek}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="pt-5 mt-4">
                            <button
                              onClick={() => handleSelectPlan(p.id)}
                              className="w-full py-2.5 px-3 rounded-xl bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                              type="button"
                            >
                              <span>Continuar Estudo</span>
                              <span className="material-symbols-outlined text-sm">play_arrow</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-surface-container-low text-center space-y-3">
                      <p className="font-headline text-base font-semibold text-on-surface">
                        Nenhuma trilha encontrada no banco de dados.
                      </p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm hover:bg-primary/90"
                      >
                        Gerar Primeira Trilha com IA
                      </button>
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* VIEW 2: ALL PLANS (Meus Temas do Banco) */}
            {currentView === 'all-plans' && (
              <AllPlansView
                plans={plans}
                onSelectPlan={handleSelectPlan}
                onOpenNewStudyModal={() => setShowCreateModal(true)}
                onOpenAiChat={(plan) => setActiveChatPlan(plan)}
                onArchivePlan={handleArchivePlan}
                onDeletePlan={handleDeletePlan}
              />
            )}

            {/* VIEW 3: DEDICATED PLAN (Tela dedicada com dados reais) */}
            {currentView === 'dedicated-plan' && currentSelectedPlan && (
              <DedicatedPlanView
                plan={currentSelectedPlan}
                onBackToPlans={() => handleNavigate('all-plans')}
                onBackToHome={() => handleNavigate('home')}
                onToggleTask={handleToggleTask}
                onOpenAiChat={(plan) => setActiveChatPlan(plan)}
                onOpenFlashcards={(plan) => setActiveFlashcardsPlan(plan)}
                onOpenQuiz={(plan) => setActiveQuizPlan(plan)}
                onOpenFeynman={(plan) => setActiveFeynmanPlan(plan)}
                onArchivePlan={handleArchivePlan}
              />
            )}

            {/* VIEW 4: ESTATÍSTICAS / EXPLORAR */}
            {(currentView === 'estatisticas' || currentView === 'explorar') && (
              <div className="py-12 text-center max-w-xl mx-auto space-y-6 animate-fadeIn">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-3xl">
                    {currentView === 'estatisticas' ? 'analytics' : 'explore'}
                  </span>
                </div>
                <h2 className="font-headline font-bold text-3xl text-on-surface">
                  {currentView === 'estatisticas' ? 'Estatísticas & Rendimento' : 'Explorar Novas Trilhas'}
                </h2>
                <p className="text-sm text-on-surface-variant">
                  {currentView === 'estatisticas'
                    ? `Você tem ${plans.length} trilhas registradas no banco e ${plans.reduce((acc, p) => acc + p.completedTasksCount, 0)} atividades concluídas.`
                    : 'Gere qualquer plano de estudos personalizado para o seu objetivo acadêmico ou profissional.'}
                </p>
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => handleNavigate('all-plans')}
                    className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 shadow-sm"
                  >
                    Ver Meus Temas
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold"
                  >
                    Criar Nova Trilha
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* FOOTER */}
      <Footer />

      {/* MODALS */}
      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onPlanCreated={handlePlanCreated}
        />
      )}

      {activeChatPlan && (
        <AiChatModal
          plan={activeChatPlan}
          onClose={() => setActiveChatPlan(null)}
        />
      )}

      {activeFlashcardsPlan && (
        <FlashcardsModal
          plan={activeFlashcardsPlan}
          onClose={() => setActiveFlashcardsPlan(null)}
        />
      )}

      {activeQuizPlan && (
        <QuizModal
          plan={activeQuizPlan}
          onClose={() => setActiveQuizPlan(null)}
        />
      )}

      {activeFeynmanPlan && (
        <FeynmanModal
          plan={activeFeynmanPlan}
          onClose={() => setActiveFeynmanPlan(null)}
        />
      )}
    </div>
  );
}
