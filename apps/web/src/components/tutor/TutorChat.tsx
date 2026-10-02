'use client';

import { useState, useRef, useEffect } from 'react';
import { useGamificationStore } from '@/stores/gamification';
import { useMascotStore } from '@/stores/mascot';

interface Message {
  id: string;
  role: 'student' | 'tutor';
  content: string;
  citations?: { source: string; page: number }[];
}

interface HintOffer {
  tier: number;
  cost: number;
  content: string;
}

interface LearningPathConcept {
  id: string;
  name: string;
  description?: string;
  unit_number?: number;
  unit_name?: string;
  difficulty?: number;
}

interface LearningPath {
  total_concepts: number;
  mastered_count: number;
  current_concept: LearningPathConcept | null;
  upcoming: { id: string; name: string; difficulty: number }[];
  mastered: { id: string; name: string }[];
  mastery_update: { concept_id: string; understanding: string } | null;
}

interface TutorChatProps {
  assignmentId?: string;
  courseId?: string;
  token: string;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-in">
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl rounded-bl-md bg-surface-overlay border border-border">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-typing-dot" />
        <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-typing-dot" style={{ animationDelay: '0.2s' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-typing-dot" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}

export function TutorChat({ assignmentId, courseId, token }: TutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [learningSummary, setLearningSummary] = useState<string>('');
  const [hintOffer, setHintOffer] = useState<HintOffer | null>(null);
  const [goldBalance, setGoldBalance] = useState<number | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiHost = window.location.hostname;
    let wsUrl = `${wsProto}//${apiHost}:8000/api/v1/tutor/chat?token=${token}`;
    if (courseId) wsUrl += `&course_id=${encodeURIComponent(courseId)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen = () => {
      setConnected(true);
      // Fallback: if no chat_history or learning_path arrives within 3s, mark loaded
      setTimeout(() => setHistoryLoaded(true), 3000);
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'chat_history') {
        // Restore previous messages from database
        const restored: Message[] = (data.messages || []).map((m: { id: string; role: string; content: string; citations?: { source: string; page: number }[] }) => ({
          id: m.id,
          role: m.role as 'student' | 'tutor',
          content: m.content,
          citations: m.citations,
        }));
        setMessages(restored);
        setHistoryLoaded(true);
        if (data.learning_summary) {
          setLearningSummary(data.learning_summary);
        }
      }
      if (data.type === 'stream') {
        setWaiting(false);
        const tutorMsg: Message = {
          id: Date.now().toString(),
          role: 'tutor',
          content: data.content,
          citations: data.citations,
        };
        setMessages((prev) => [...prev, tutorMsg]);
      }
      if (data.type === 'learning_path' && data.learning_path) {
        setLearningPath(data.learning_path);
        setHistoryLoaded(true); // initial data exchange complete
      }
      if (data.type === 'done') {
        if (data.learning_summary) {
          setLearningSummary(data.learning_summary);
        }
        if (data.learning_path) {
          setLearningPath(data.learning_path);
        }
      }
      if (data.type === 'hint_offer') {
        setHintOffer({ tier: data.tier, cost: data.cost, content: data.content });
      }
      if (data.type === 'hint_purchased') {
        setHintOffer(null);
        setGoldBalance(data.new_balance);
        useGamificationStore.getState().spendGold(data.gold_spent);
        // Deliver hint through Rune mascot
        useMascotStore.getState().deliverHint(data.hint_text, `TIER_${data.tier || 1}`, data.gold_spent);
        const hintMsg: Message = {
          id: Date.now().toString(),
          role: 'tutor',
          content: `💡 Hint (${data.gold_spent} Gold spent):\n\n${data.hint_text}`,
        };
        setMessages((prev) => [...prev, hintMsg]);
      }
      if (data.type === 'hint_error') {
        setHintOffer(null);
        const errMsg: Message = {
          id: Date.now().toString(),
          role: 'tutor',
          content: `⚠️ ${data.content}`,
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    };
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    return () => ws.close();
  }, [token, courseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, waiting]);

  const sendMessage = () => {
    if (!input.trim() || !connected) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      role: 'student',
      content: input,
    };
    setMessages((prev) => [...prev, newMsg]);
    setWaiting(true);

    wsRef.current?.send(JSON.stringify({ type: 'message', content: input, assignment_id: assignmentId }));

    setInput('');
    setHintOffer(null);
  };

  const buyHint = () => {
    if (!hintOffer || !connected) return;
    const lastStudentMsg = [...messages].reverse().find((m) => m.role === 'student');
    wsRef.current?.send(JSON.stringify({
      type: 'buy_hint',
      tier: hintOffer.tier,
      cost: hintOffer.cost,
      assignment_id: assignmentId,
      question: lastStudentMsg?.content || '',
    }));
  };

  return (
    <div className="flex flex-col h-full rounded-2xl bg-surface-raised border-2 border-surface-border overflow-hidden">
      {/* Chat header */}
      <div className="px-5 py-3 border-b border-surface-border bg-gradient-to-r from-accent-purple/5 to-accent-blue/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-base shadow-sm">
              🧙
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-raised ${
              connected ? 'bg-accent-green animate-pulse' : 'bg-text-faint'
            }`} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Scholar&apos;s Guide</h3>
            <span className={`text-[10px] ${connected ? 'text-accent-green' : 'text-text-faint'}`}>
              {connected ? 'Ready to help' : 'Reconnecting...'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
            Socratic Mode
          </span>
        </div>
      </div>

      {/* Learning Path Progress */}
      {learningPath && (
        <div className="px-5 py-3 border-b border-surface-border bg-gradient-to-r from-accent-purple/5 to-accent-cyan/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">🗺️</span>
              <h4 className="text-xs font-semibold text-accent-purple">Learning Path</h4>
            </div>
            <span className="text-[10px] font-bold text-accent-cyan">
              {learningPath.mastered_count}/{learningPath.total_concepts} concepts
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full bg-surface-overlay mb-2.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-cyan transition-all duration-700"
              style={{ width: `${learningPath.total_concepts > 0 ? (learningPath.mastered_count / learningPath.total_concepts) * 100 : 0}%` }}
            />
          </div>
          {/* Current concept */}
          {learningPath.current_concept ? (
            <div className="flex items-start gap-2 mb-2">
              <span className="mt-0.5 text-[10px] shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-accent-purple/20 text-accent-purple font-bold">📍</span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-text-primary truncate">
                  {learningPath.current_concept.unit_name && (
                    <span className="text-text-faint font-normal">
                      U{learningPath.current_concept.unit_number} ›{' '}
                    </span>
                  )}
                  {learningPath.current_concept.name}
                </div>
                {learningPath.current_concept.description && (
                  <div className="text-[10px] text-text-faint mt-0.5 line-clamp-1">
                    {learningPath.current_concept.description}
                  </div>
                )}
              </div>
              <div className="shrink-0 flex gap-0.5 ml-auto">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-1 h-3 rounded-full ${
                      i < (learningPath.current_concept?.difficulty ?? 1) ? 'bg-accent-purple' : 'bg-surface-overlay'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-accent-green font-semibold flex items-center gap-1.5 mb-1">
              <span>🏆</span> All concepts mastered!
            </div>
          )}
          {/* Upcoming concepts */}
          {learningPath.upcoming.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] text-text-faint uppercase font-semibold tracking-wider">Next:</span>
              {learningPath.upcoming.map((c) => (
                <span
                  key={c.id}
                  className="px-1.5 py-0.5 rounded text-[9px] bg-surface-overlay text-text-secondary border border-surface-border"
                >
                  {c.name}
                </span>
              ))}
            </div>
          )}
          {/* Mastery update notification */}
          {learningPath.mastery_update && learningPath.mastery_update.understanding !== 'none' && (
            <div className={`mt-2 px-2 py-1 rounded-md text-[10px] font-medium ${
              learningPath.mastery_update.understanding === 'understood'
                ? 'bg-accent-green/10 text-accent-green border border-accent-green/20'
                : 'bg-gold/10 text-gold border border-gold/20'
            }`}>
              {learningPath.mastery_update.understanding === 'understood'
                ? '✨ Great understanding! Mastery increased significantly.'
                : '📈 Partial understanding — keep going! Mastery increased.'}
            </div>
          )}
        </div>
      )}

      {/* Learning Summary */}
      {learningSummary && (
        <div className="px-5 py-3 border-b border-surface-border bg-gradient-to-r from-accent-green/5 to-accent-cyan/5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm">📖</span>
            <h4 className="text-xs font-semibold text-accent-green">What You&apos;ve Learned</h4>
          </div>
          <div className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
            {learningSummary}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && !historyLoaded && connected && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-typing-dot" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-typing-dot" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-typing-dot" style={{ animationDelay: '0.4s' }} />
            </div>
            <p className="text-xs text-text-faint mt-3">Loading conversation history...</p>
          </div>
        )}
        {messages.length === 0 && historyLoaded && (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-purple/10 to-accent-blue/10 border border-accent-purple/20 flex items-center justify-center mb-4">
              <span className="text-3xl">📜</span>
            </div>
            <p className="text-sm font-medium text-text-muted mb-1">
              Your quest for knowledge begins here
            </p>
            <p className="text-xs text-text-faint text-center max-w-xs">
              Ask about your course and I&apos;ll guide you with Socratic questions — helping you discover answers yourself.
            </p>
            <div className="flex flex-wrap gap-2 mt-5 justify-center">
              {['Explain this concept', 'Help me understand', 'Quiz me on...'].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-3 py-1.5 rounded-lg text-[11px] border border-accent-purple/20 text-accent-purple bg-accent-purple/5 hover:bg-accent-purple/10 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'} ${
              msg.role === 'student' ? 'animate-slide-in-right' : 'animate-slide-in-left'
            }`}
          >
            {msg.role === 'tutor' && (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-xs mr-2 mt-1 shrink-0">
                🧙
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'student'
                  ? 'bg-accent-blue text-white rounded-br-md shadow-sm shadow-accent-blue/20'
                  : 'bg-surface-overlay text-text-primary border border-surface-border rounded-bl-md'
              }`}
            >
              {msg.content}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 pt-2 border-t border-surface-border/50">
                  {msg.citations.map((c, i) => (
                    <span key={i} className="text-[10px] text-accent-cyan mr-2">📎 {c.source} p.{c.page}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {waiting && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Hint offer banner */}
      {hintOffer && (
        <div className="px-4 py-2.5 border-t border-gold/20 bg-gradient-to-r from-gold/5 to-amber-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">💡</span>
            <span className="text-xs text-gold font-medium">{hintOffer.content}</span>
          </div>
          <button
            onClick={buyHint}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 transition-colors flex items-center gap-1.5"
          >
            <span>●</span> Buy for {hintOffer.cost} Gold
          </button>
        </div>
      )}

      {/* Gold balance indicator */}
      {goldBalance !== null && (
        <div className="px-4 py-1 border-t border-surface-border bg-surface-overlay/50 flex justify-end">
          <span className="text-[10px] text-gold font-medium">● {goldBalance} Gold remaining</span>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-surface-border bg-surface-raised">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={connected ? 'Ask a question...' : 'Connecting...'}
            disabled={!connected}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-text-primary
                       bg-surface-overlay border border-surface-border
                       focus:outline-none focus:ring-2 focus:ring-accent-purple/30 focus:border-accent-purple/50
                       placeholder:text-text-faint transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={!connected || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-white text-sm font-medium
                       hover:shadow-lg hover:shadow-accent-purple/20 transition-all duration-200
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
