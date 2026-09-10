import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-container-low mt-auto border-t border-outline-variant/30 py-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-xs text-on-surface-variant tracking-wide">
          SapiensStudying &copy; 2026 - IA para Aprendizado Profundo
        </p>
        <div className="flex items-center gap-6">
          <a className="text-xs text-on-surface-variant hover:text-on-surface transition-colors" href="#sobre">Sobre</a>
          <a className="text-xs text-on-surface-variant hover:text-on-surface transition-colors" href="#metodo-sapiens">Método Sapiens</a>
          <a className="text-xs text-on-surface-variant hover:text-on-surface transition-colors" href="#feedback">Feedback</a>
          <a className="text-xs text-on-surface-variant hover:text-on-surface transition-colors" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  );
};
