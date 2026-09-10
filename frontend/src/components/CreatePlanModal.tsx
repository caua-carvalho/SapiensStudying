import React, { useState } from 'react';
import { generatePlan } from '../services/api';
import { saveGeneratedPlanToDB } from '../services/storage';
import { FullStudyPlan } from '../types';

interface CreatePlanModalProps {
  onClose: () => void;
  onPlanCreated: (plan: FullStudyPlan) => void;
}

const QUICK_SUGGESTIONS = [
  'Deep Learning & LLMs',
  'DevOps & Kubernetes',
  'Bioquímica Básica',
  'História Medieval',
  'Economia Comportamental',
  'Rust para Sistemas',
];

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({ onClose, onPlanCreated }) => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (queryToUse?: string) => {
    const query = (queryToUse || topic).trim();
    if (!query) return;

    setLoading(true);
    setError(null);

    try {
      const result = await generatePlan(query);
      const fullPlan = await saveGeneratedPlanToDB(query, result.plan, result.savedPlanId);
      onPlanCreated(fullPlan);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar o plano de estudos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-outline-variant/30 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-sm">
              <span className="material-symbols-outlined text-xl">auto_awesome</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-xl text-on-surface">Criar Novo Estudo</h3>
              <p className="text-xs text-on-surface-variant">A IA estruturará um roteiro completo de 4 semanas</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-error-container text-on-error-container text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-error">error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Qual assunto você quer dominar?
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Criptografia Moderna, UX Design, Inteligência Artificial..."
              disabled={loading}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/40 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-tertiary">bolt</span>
              Ideias rápidas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setTopic(sug);
                    handleGenerate(sug);
                  }}
                  className="text-xs px-2.5 py-1 rounded-lg bg-surface-container text-on-surface hover:bg-secondary-container hover:text-on-surface-variant transition-colors"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-container-high">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Gerando Trilha com IA...</span>
                </>
              ) : (
                <>
                  <span>Gerar Plano de Estudos</span>
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
