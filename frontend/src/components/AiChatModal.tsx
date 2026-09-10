import React, { useState } from 'react';
import { FullStudyPlan } from '../types';
import { askAiTutor } from '../services/api';

interface AiChatModalProps {
  plan: FullStudyPlan;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  time: string;
}

export const AiChatModal: React.FC<AiChatModalProps> = ({ plan, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Olá! Sou seu tutor pedagógico de IA para a trilha "${plan.title}". Como posso te ajudar hoje? Posso tirar dúvidas sobre qualquer atividade, sugerir analogias ou aprofundar um conceito difícil.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || typing) return;

    const userMsg: Message = {
      role: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const responseText = await askAiTutor({
        action: 'chat',
        topic: plan.title,
        prompt: query,
        context: `Semana ${plan.currentWeek} de ${plan.durationWeeks} - Nível ${plan.level}`,
      });

      const aiMsg: Message = {
        role: 'assistant',
        text: responseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: Message = {
        role: 'assistant',
        text: `Com base em ${plan.title}, recomendo quebrar este conceito em pequenas partes e aplicar a técnica Feynman para validar o raciocínio.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full h-[600px] max-h-[90vh] shadow-2xl border border-outline-variant/30 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="px-6 py-4 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-sm">
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">Tutor IA • {plan.title}</h3>
              <p className="text-[11px] text-primary font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Disponível para dúvidas & mentoria
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Message Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-background/50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {m.role === 'assistant' ? (
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
                  IA
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center shrink-0 text-xs font-bold">
                  Você
                </div>
              )}
              <div
                className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                  m.role === 'user'
                    ? 'bg-primary text-on-primary rounded-tr-xs'
                    : 'bg-surface-container-lowest text-on-surface border border-outline-variant/20 rounded-tl-xs'
                }`}
              >
                <p className="whitespace-pre-line">{m.text}</p>
                <span className={`block text-[10px] mt-1.5 opacity-70 ${m.role === 'user' ? 'text-right' : ''}`}>
                  {m.time}
                </span>
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-bold">
                IA
              </div>
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 text-xs flex items-center gap-2 text-on-surface-variant">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[11px] font-medium">Pensando na melhor explicação...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input form */}
        <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/30">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida sobre a matéria ou peça um exemplo..."
              className="flex-1 px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs sm:text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="px-5 py-3 rounded-xl bg-primary text-on-primary font-semibold text-xs sm:text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1 shadow-sm shrink-0"
            >
              <span>Enviar</span>
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
