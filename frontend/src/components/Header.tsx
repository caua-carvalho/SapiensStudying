import React from 'react';

interface HeaderProps {
  currentView: 'home' | 'all-plans' | 'dedicated-plan' | 'estatisticas' | 'explorar';
  onNavigate: (view: 'home' | 'all-plans' | 'estatisticas' | 'explorar') => void;
  onOpenNewStudyModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onOpenNewStudyModal }) => {
  return (
    <header className="fixed top-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(46,50,48,0.05)] border-b border-outline-variant/30">
      <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
        {/* Logo and Brand */}
        <div 
          onClick={() => onNavigate('home')} 
          className="flex items-center gap-3 shrink-0 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-[20px]">menu_book</span>
          </div>
          <span className="font-headline font-semibold text-lg text-on-surface tracking-tight">
            Sapiens<span className="text-primary font-bold">Studying</span>
          </span>
        </div>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-low" data-active-classes="bg-secondary-container text-on-surface font-semibold">
          <button
            onClick={() => onNavigate('home')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              currentView === 'home'
                ? 'bg-secondary-container text-on-surface font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Início
          </button>
          <button
            onClick={() => onNavigate('all-plans')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              currentView === 'all-plans' || currentView === 'dedicated-plan'
                ? 'bg-secondary-container text-on-surface font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Meus Temas
          </button>
          <button
            onClick={() => onNavigate('estatisticas')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              currentView === 'estatisticas'
                ? 'bg-secondary-container text-on-surface font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Estatísticas
          </button>
          <button
            onClick={() => onNavigate('explorar')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              currentView === 'explorar'
                ? 'bg-secondary-container text-on-surface font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}
          >
            Explorar
          </button>
        </nav>

        {/* Action buttons */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenNewStudyModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow-[0_2px_10px_rgba(74,124,89,0.25)] hover:bg-primary/90 active:scale-95 transition-all"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Novo Estudo</span>
          </button>

          <button
            aria-label="Notificações"
            className="relative p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-tertiary"></span>
          </button>

          <div className="relative flex items-center pl-2 border-l border-outline-variant/40">
            <button
              aria-label="Menu do usuário"
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-outline-variant/50 transition-all focus:outline-none"
              type="button"
            >
              <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center font-headline font-bold text-xs text-primary">
                SP
              </div>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">expand_more</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
