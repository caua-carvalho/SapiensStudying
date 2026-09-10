import React, { useState } from 'react';
import { FullStudyPlan } from '../types';
import { askAiTutor } from '../services/api';

interface FlashcardsModalProps {
  plan: FullStudyPlan;
  onClose: () => void;
}

export const FlashcardsModal: React.FC<FlashcardsModalProps> = ({ plan, onClose }) => {
  const defaultCards = [
    {
      q: `Qual é o objetivo principal de ${plan.title}?`,
      a: 'Compreender os fundamentos teóricos e aplicá-los com rigor prático e métodos de repetição ativa.',
    },
    {
      q: 'O que diferencia o aprendizado ativo da leitura passiva?',
      a: 'O aprendizado ativo exige recuperação cognitiva (active recall), prática deliberada e autoexplicação, fortalecendo as sinapses a longo prazo.',
    },
    {
      q: 'Qual é o critério para considerar uma atividade dominada?',
      a: 'Ser capaz de explicar o conceito em termos simples (Técnica Feynman) e construir uma solução funcional sem consultar o gabarito.',
    },
    {
      q: `Qual a importância da métrica de avaliação em ${plan.title}?`,
      a: 'Permite diagnosticar com precisão lacunas conceituais e ajustar o ritmo de estudo antes de avançar para tópicos complexos.',
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);

  const card = defaultCards[currentIndex];

  const handleNext = (known: boolean) => {
    if (known) setKnownCount((c) => c + 1);
    setIsFlipped(false);
    if (currentIndex < defaultCards.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      alert(`Parabéns! Você concluiu a sessão de repetição espaçada. Cartões dominados: ${knownCount + (known ? 1 : 0)} de ${defaultCards.length}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-outline-variant/30 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">style</span>
            </span>
            <div>
              <h3 className="font-headline font-bold text-lg text-on-surface">Flashcards de Repetição Espaçada</h3>
              <p className="text-xs text-on-surface-variant">Cartão {currentIndex + 1} de {defaultCards.length}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Card Flip area */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="min-h-[220px] p-6 rounded-xl bg-surface-container-low border border-outline-variant/30 cursor-pointer flex flex-col justify-between hover:border-primary/50 transition-all text-center select-none"
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-tertiary">
            {isFlipped ? '💡 Resposta / Explicação' : '❓ Pergunta do Cartão (clique para virar)'}
          </span>
          <p className="font-headline text-lg sm:text-xl font-semibold text-on-surface my-auto">
            {isFlipped ? card.a : card.q}
          </p>
          <span className="text-xs text-on-surface-variant">
            {isFlipped ? 'Clique para ver a pergunta novamente' : 'Clique para revelar a resposta'}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={() => handleNext(false)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-error-container text-on-error-container text-xs font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">replay</span>
            Preciso Revisar
          </button>
          <button
            onClick={() => handleNext(true)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-1 shadow-md"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            Lembrei Bem
          </button>
        </div>
      </div>
    </div>
  );
};

interface QuizModalProps {
  plan: FullStudyPlan;
  onClose: () => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({ plan, onClose }) => {
  const questions = [
    {
      q: `Qual é o primeiro passo crítico ao iniciar o estudo de ${plan.title}?`,
      options: [
        'Pular direto para a implementação complexa sem teoria',
        'Compreender os conceitos fundamentais e arquitetura de dados',
        'Memorizar todas as fórmulas sem praticar códigos',
        'Ignorar os requisitos e testes',
      ],
      correctIndex: 1,
    },
    {
      q: 'Por que o feedback de avaliação formativa acelera a retenção cognitiva?',
      options: [
        'Porque aponta com precisão onde focar os esforços imediatos de correção',
        'Porque dispensa qualquer leitura complementar',
        'Porque reduz a necessidade de praticar exercícios',
        'Não há benefício cognitivo comprovado',
      ],
      correctIndex: 0,
    },
    {
      q: 'Qual a recomendação para evitar o esquecimento acelerado (Curva de Ebbinghaus)?',
      options: [
        'Estudar 10 horas seguidas no final de semana',
        'Revisões espaçadas de 24h, 7 dias e 30 dias',
        'Não revisar nunca mais após concluir o dia',
        'Somente reler anotações passivamente',
      ],
      correctIndex: 1,
    },
  ];

  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const q = questions[currentQ];

  const handleSelect = (index: number) => {
    if (submitted) return;
    setSelectedOpt(index);
  };

  const handleConfirm = () => {
    if (selectedOpt === null) return;
    if (selectedOpt === q.correctIndex) {
      setScore((s) => s + 1);
    }
    setSubmitted(true);
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelectedOpt(null);
      setSubmitted(false);
    } else {
      alert(`Quiz concluído com sucesso! Sua pontuação final: ${score + (selectedOpt === q.correctIndex ? 1 : 0)} de ${questions.length} questões.`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-outline-variant/30 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">psychology_alt</span>
            </span>
            <div>
              <h3 className="font-headline font-bold text-lg text-on-surface">Quiz Dinâmico Sapiens</h3>
              <p className="text-xs text-on-surface-variant">Questão {currentQ + 1} de {questions.length}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <h4 className="font-headline font-bold text-base text-on-surface leading-snug">
            {q.q}
          </h4>
          <div className="flex flex-col gap-2.5">
            {q.options.map((opt, idx) => {
              let btnClass = 'bg-surface-container-low hover:bg-surface-container text-on-surface border-transparent';
              if (selectedOpt === idx) {
                btnClass = 'bg-primary/10 border-primary text-primary font-semibold';
              }
              if (submitted) {
                if (idx === q.correctIndex) {
                  btnClass = 'bg-primary text-on-primary font-bold border-primary';
                } else if (selectedOpt === idx) {
                  btnClass = 'bg-error-container text-on-error-container border-error';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={submitted}
                  className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center gap-3 ${btnClass}`}
                >
                  <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {!submitted ? (
            <button
              onClick={handleConfirm}
              disabled={selectedOpt === null}
              className="py-2.5 px-5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              Confirmar Resposta
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="py-2.5 px-5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1"
            >
              <span>{currentQ < questions.length - 1 ? 'Próxima Questão' : 'Finalizar Quiz'}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface FeynmanModalProps {
  plan: FullStudyPlan;
  onClose: () => void;
}

export const FeynmanModal: React.FC<FeynmanModalProps> = ({ plan, onClose }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);

    try {
      const fb = await askAiTutor({
        action: 'feynman_eval',
        topic: plan.title,
        text,
      });
      setFeedback(fb);
    } catch (err) {
      setFeedback(
        `Excelente síntese! Você explicou os conceitos essenciais de forma fluida. Dica Sapiens: tente incluir um exemplo cotidiano para fixar ainda mais o raciocínio em sua memória de longo prazo.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-outline-variant/30 flex flex-col gap-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-surface-container-highest text-on-surface flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">edit_note</span>
            </span>
            <div>
              <h3 className="font-headline font-bold text-lg text-on-surface">Técnica Feynman: Resumo Ativo</h3>
              <p className="text-xs text-on-surface-variant">Explique {plan.title} como se ensinasse a uma criança de 10 anos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-secondary-container text-on-secondary-container text-xs space-y-1">
            <p className="font-bold">Regras do Método Feynman:</p>
            <ol className="list-decimal list-inside space-y-0.5 opacity-90">
              <li>Use linguagem simples e evite jargões complexos sem explicação.</li>
              <li>Identifique onde você hesita ou não sabe explicar: aí está sua lacuna.</li>
              <li>Crie uma analogia da vida real para consolidar o entendimento.</li>
            </ol>
          </div>

          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Comece a explicar o tema com suas próprias palavras..."
            disabled={loading}
            className="w-full p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs sm:text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed resize-none"
          />

          {feedback && (
            <div className="p-4 rounded-xl bg-primary-fixed text-on-primary-fixed text-xs space-y-1 animate-fadeIn">
              <div className="flex items-center gap-1.5 font-bold">
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                Diagnóstico Pedagógico IA:
              </div>
              <p className="whitespace-pre-line leading-relaxed">{feedback}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container text-on-surface text-xs font-semibold hover:bg-surface-container-high transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || loading}
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md"
          >
            {loading ? (
              <span>Avaliando...</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span>Avaliar Síntese com IA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
