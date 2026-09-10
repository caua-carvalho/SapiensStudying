import React, { useState, useEffect } from 'react';
import { generatePlan, StudyPlan } from './services/api';

const TRENDING_SUGGESTIONS = [
  'Machine Learning',
  'Arquitetura de Software',
  'Neurociência do Hábito',
  'Design Systems',
  'Python para Dados',
  'Finanças Pessoais'
];

export default function App() {
  const [topic, setTopic] = useState('');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [currentTopic, setCurrentTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega último plano salvo no localStorage se existir
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sapiens_last_plan');
      const savedTopic = localStorage.getItem('sapiens_last_topic');
      if (saved) {
        setPlan(JSON.parse(saved));
        if (savedTopic) setCurrentTopic(savedTopic);
      }
    } catch {
      // Ignora erro no localStorage
    }
  }, []);

  const handleGenerate = async (topicToSearch?: string) => {
    const query = (topicToSearch || topic).trim();
    if (!query) return;

    setLoading(true);
    setError(null);

    try {
      const result = await generatePlan(query);
      setPlan(result.plan);
      setCurrentTopic(query);
      setTopic(query);
      
      // Salva no localStorage para conveniência
      try {
        localStorage.setItem('sapiens_last_plan', JSON.stringify(result.plan));
        localStorage.setItem('sapiens_last_topic', query);
      } catch {
        // Ignora
      }

      // Rola suavemente até o plano
      setTimeout(() => {
        const resultsEl = document.getElementById('study-plan-results');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao comunicar com a inteligência artificial.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate();
  };

  const handleSuggestionClick = (sug: string) => {
    setTopic(sug);
    handleGenerate(sug);
  };

  return (
    <div className="min-h-screen bg-background font-body text-on-surface antialiased flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 w-full z-40 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(46,50,48,0.05)] border-b border-outline-variant/30">
        <div className="h-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            {/* Logo SVG */}
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm">
              <span className="material-symbols-outlined text-2xl font-bold">menu_book</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline font-bold text-lg text-on-surface tracking-tight leading-none">
                Sapiens<span className="text-primary">Studying</span>
              </span>
              <span className="text-[10px] font-bold text-secondary tracking-widest uppercase mt-0.5">
                AI Study Planner
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/70 text-tertiary text-xs font-semibold">
              <span className="material-symbols-outlined text-sm text-tertiary material-symbols-filled">sparkles</span>
              Gemini 2.5 Flash
            </span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12 sm:space-y-16">
        {/* HERO SECTION */}
        <section className="relative flex flex-col items-center text-center space-y-6 sm:space-y-8">
          {/* Ambient Glows */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-3/4 max-w-2xl h-56 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
          <div className="absolute top-20 right-1/4 w-44 h-44 bg-tertiary/10 rounded-full blur-2xl pointer-events-none -z-10"></div>

          {/* Badge Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container/70 shadow-sm text-tertiary text-xs sm:text-sm font-semibold tracking-wide">
            <span className="material-symbols-outlined text-base text-tertiary material-symbols-filled">bolt</span>
            <span>Aprendizado Acelerado por Inteligência Artificial</span>
          </div>

          {/* Heading */}
          <div className="max-w-2xl space-y-3">
            <h1 className="font-headline text-3xl sm:text-5xl font-bold text-on-surface tracking-tight leading-[1.2]">
              O que você quer <span className="text-primary italic font-normal">estudar hoje?</span>
            </h1>
            <p className="font-body text-sm sm:text-base text-on-surface-variant max-w-xl mx-auto font-normal leading-relaxed">
              Digite qualquer assunto e nossa IA criará um plano completo: cronograma diário, livros, filmes, recursos e métodos de fixação.
            </p>
          </div>

          {/* Search Box */}
          <div className="w-full max-w-2xl relative z-10">
            <div className="relative bg-surface-container-lowest rounded-2xl shadow-[0_8px_30px_rgba(46,50,48,0.08)] p-2 transition-all focus-within:shadow-[0_12px_40px_rgba(74,124,89,0.18)] focus-within:ring-2 focus-within:ring-primary/40 border border-outline-variant/30">
              <form onSubmit={handleSubmit} className="flex items-center gap-2 h-14 sm:h-16">
                <div className="flex items-center justify-center pl-3 sm:pl-4 text-primary shrink-0">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl">psychology</span>
                </div>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: Machine Learning, História Antiga, Fotografia, Rust..."
                  disabled={loading}
                  className="w-full h-full bg-transparent text-on-surface placeholder:text-outline font-body text-sm sm:text-base md:text-lg focus:outline-none px-2"
                />
                <button
                  type="submit"
                  disabled={loading || !topic.trim()}
                  className="shrink-0 h-11 sm:h-12 px-5 sm:px-7 rounded-xl bg-primary text-on-primary font-semibold text-sm sm:text-base flex items-center gap-2 shadow-[0_4px_14px_rgba(74,124,89,0.3)] hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
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

            {/* Suggestions Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <span className="text-xs text-on-surface-variant font-medium flex items-center gap-1 shrink-0">
                <span className="material-symbols-outlined text-xs text-tertiary">trending_up</span>
                Sugestões:
              </span>
              {TRENDING_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleSuggestionClick(sug)}
                  disabled={loading}
                  className="text-xs px-3 py-1 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-secondary-container transition-all"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ERROR NOTIFICATION */}
        {error && (
          <div className="max-w-2xl mx-auto p-4 rounded-xl bg-error-container text-on-error-container border border-error/30 flex items-start gap-3">
            <span className="material-symbols-outlined text-error shrink-0">error</span>
            <div className="flex-1 text-sm">
              <p className="font-bold">Não foi possível gerar o plano</p>
              <p className="opacity-90">{error}</p>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full border-4 border-surface-container-high border-t-primary animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">psychology</span>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="font-headline font-bold text-lg text-on-surface">Estruturando sua jornada...</h3>
              <p className="text-xs text-on-surface-variant">
                Consultando o Gemini 2.5 Flash para selecionar os melhores livros, recursos e cronograma de estudo.
              </p>
            </div>
          </div>
        )}

        {/* STUDY PLAN OUTPUT */}
        {plan && !loading && (
          <div id="study-plan-results" className="space-y-10 pt-4 animate-fadeIn">
            {/* PLAN HEADER */}
            <div className="border-b border-outline-variant/30 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-widest font-bold text-primary">
                  Plano Personalizado
                </span>
                <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface tracking-tight mt-1 capitalize">
                  {currentTopic}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-all shrink-0 self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                Imprimir / Salvar PDF
              </button>
            </div>

            {/* 1. CRONOGRAMA */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">calendar_month</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface">1. Cronograma de Estudos</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plan.cronograma?.map((item, i) => (
                  <div
                    key={i}
                    className="p-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm hover:shadow-md transition-all space-y-2 relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary/60"></div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-secondary-container text-tertiary">
                          Dia {item.dia}
                        </span>
                      </div>
                      <h4 className="font-headline font-bold text-base text-on-surface">{item.topico}</h4>
                      <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                        {item.descricao}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. LIVROS RECOMENDADOS */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">auto_stories</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface">2. Livros Recomendados</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plan.livros?.map((livro, i) => (
                  <div
                    key={i}
                    className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-tertiary">
                        <span className="material-symbols-outlined text-sm">book</span>
                        <span className="text-[11px] font-semibold uppercase tracking-wider">Leitura Principal</span>
                      </div>
                      <h4 className="font-headline font-bold text-base text-on-surface">{livro.titulo}</h4>
                      <p className="text-xs font-semibold text-secondary">Autor: {livro.autor}</p>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{livro.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. FILMES E DOCUMENTÁRIOS */}
            {plan.filmes && plan.filmes.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">movie</span>
                  </div>
                  <h3 className="font-headline text-xl font-bold text-on-surface">3. Filmes & Documentários</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {plan.filmes.map((filme, i) => (
                    <div
                      key={i}
                      className="p-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-headline font-bold text-base text-on-surface">{filme.titulo}</h4>
                        {filme.plataforma && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                            {filme.plataforma}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                        {filme.sinopse}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 4. RECURSOS ADICIONAIS */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">link</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface">4. Recursos Complementares</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plan.recursos?.map((rec, i) => (
                  <div
                    key={i}
                    className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                          {rec.tipo || 'Recurso'}
                        </span>
                        {rec.url && (
                          <a
                            href={rec.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <span>Acessar</span>
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                          </a>
                        )}
                      </div>
                      <h4 className="font-headline font-bold text-base text-on-surface">{rec.titulo}</h4>
                      {rec.descricao && (
                        <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 leading-relaxed">
                          {rec.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 5. TÉCNICAS DE FIXAÇÃO */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">lightbulb</span>
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface">5. Métodos & Técnicas de Fixação</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plan.tecnicas?.map((tec, i) => (
                  <div
                    key={i}
                    className="p-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-sm space-y-2"
                  >
                    <div className="flex items-center gap-2 text-primary font-bold">
                      <span className="material-symbols-outlined text-base">psychology_alt</span>
                      <h4 className="font-headline text-base text-on-surface">{tec.nome}</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                      {tec.como_aplicar}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-16 py-8 border-t border-outline-variant/30 text-center text-xs text-on-surface-variant bg-surface/50">
        <p className="font-body">
          SapiensStudying &copy; {new Date().getFullYear()} — Plataforma de aprendizado sob demanda com Inteligência Artificial.
        </p>
      </footer>
    </div>
  );
}
