'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/auth';
import { useGamificationStore } from '@/stores/gamification';
import { useToastStore } from '@/stores/toast';
import { getAssignment, submitAssignment, getMySubmissions, runCode } from '@/lib/api/assignments';
import type { RunCodeResponse, RunTestResult } from '@/lib/api/assignments';
import { previewHint, purchaseHint } from '@/lib/api/gamification';
import type { Assignment, Submission } from '@/types/api';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] rounded-lg bg-[#1a1b26] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
    </div>
  ),
});

/* ── Confetti Burst ── */
function ConfettiBurst() {
  const colors = ['#9ece6a', '#7aa2f7', '#bb9af7', '#ff9e64', '#7dcfff', '#f7768e'];
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 10 + 5}%`,
            width: `${Math.random() * 8 + 4}px`,
            height: `${Math.random() * 8 + 4}px`,
            background: colors[i % colors.length],
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${Math.random() * 0.8}s`,
            animationDuration: `${1.5 + Math.random() * 1.5}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Floating Reward ── */
function FloatingReward({ text, color }: { text: string; color: string }) {
  return (
    <div className={`absolute -top-2 left-1/2 -translate-x-1/2 animate-float-up pointer-events-none z-40 font-bold text-lg ${color}`}>
      {text}
    </div>
  );
}

export default function AssignmentViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const { gold, spendGold } = useGamificationStore();
  const addToast = useToastStore((s) => s.addToast);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // MCQ state
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');

  // Scenario / text state
  const [textResponse, setTextResponse] = useState('');

  // Hint state
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);

  // CODE_LAB state
  const [codeValue, setCodeValue] = useState('');
  const [runningCode, setRunningCode] = useState(false);
  const [runResult, setRunResult] = useState<RunCodeResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'testcases' | 'output'>('testcases');

  // Game effects
  const [showConfetti, setShowConfetti] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const [flashColor, setFlashColor] = useState<'red' | 'green' | null>(null);
  const [floatingRewards, setFloatingRewards] = useState<{ id: number; text: string; color: string }[]>([]);
  const rewardIdRef = useRef(0);

  const addFloatingReward = useCallback((text: string, color: string) => {
    const rid = ++rewardIdRef.current;
    setFloatingRewards((prev) => [...prev, { id: rid, text, color }]);
    setTimeout(() => setFloatingRewards((prev) => prev.filter((r) => r.id !== rid)), 1600);
  }, []);

  useEffect(() => {
    if (!token || !id) return;
    (async () => {
      try {
        const [a, subs] = await Promise.all([
          getAssignment(id, token),
          getMySubmissions(id, token),
        ]);
        setAssignment(a);
        setSubmissions(subs);
      } catch {
        addToast('Failed to load assignment', 'error');
      }
      setLoading(false);
    })();
  }, [token, id, addToast]);

  const hasSubmitted = submissions.length > 0;
  const content = assignment?.content as Record<string, unknown> | null;
  const isMCQ = assignment?.type === 'MCQ';
  const isScenario = assignment?.type === 'SCENARIO';
  const isCodeLab = assignment?.type === 'CODE_LAB';

  const solvedCorrectly = submissions.some(
    (s) => (s.ai_grade as Record<string, unknown> | null)?.correct === true,
  );

  async function handleRunCode() {
    if (!token || !assignment) return;
    setRunningCode(true);
    setActiveTab('output');
    try {
      const language = (content?.language as string) || 'python';
      const result = await runCode(codeValue, language, assignment.id, token);
      setRunResult(result);
      if (result.all_passed) {
        addToast(`All ${result.tests_total} tests passed!`, 'success');
      } else {
        addToast(`${result.tests_passed}/${result.tests_total} tests passed`, 'info');
      }
    } catch {
      addToast('Code execution failed', 'error');
    }
    setRunningCode(false);
  }

  async function handleSubmit() {
    if (!token || !assignment) return;
    setSubmitting(true);
    try {
      let payload: { content?: string; content_json?: Record<string, unknown> };
      if (isMCQ) {
        payload = { content_json: { selected_answer: selectedAnswer } };
      } else if (isCodeLab) {
        payload = { content: codeValue };
      } else {
        payload = { content: textResponse };
      }
      const sub = await submitAssignment(assignment.id, payload, token);
      setSubmissions([sub, ...submissions]);
      const grade = sub.ai_grade as Record<string, unknown> | null;
      if (grade?.correct === true) {
        // Victory effects
        setShowConfetti(true);
        setFlashColor('green');
        setTimeout(() => setShowConfetti(false), 3000);
        setTimeout(() => setFlashColor(null), 700);
        addFloatingReward(`+${sub.xp_awarded} XP`, 'text-xp');
        setTimeout(() => addFloatingReward(`+${sub.gold_awarded} Gold`, 'text-gold'), 300);
        addToast(isCodeLab ? 'All tests passed! XP and Gold awarded 🎉' : 'Correct! XP and Gold awarded 🎉', 'success');
        // Update run result panel with submission test results
        if (isCodeLab && grade) {
          setRunResult({
            stdout: `${grade.tests_passed}/${grade.tests_total} tests passed`,
            stderr: '',
            exit_code: 0,
            test_results: (grade.test_results as RunTestResult[]) || null,
            tests_passed: (grade.tests_passed as number) || 0,
            tests_total: (grade.tests_total as number) || 0,
            all_passed: true,
            execution_time_ms: 0,
          });
          setActiveTab('output');
        }
      } else {
        // Defeat effects
        setShakeCard(true);
        setFlashColor('red');
        setTimeout(() => setShakeCard(false), 600);
        setTimeout(() => setFlashColor(null), 500);
        if (isCodeLab && grade) {
          const tp = (grade.tests_passed as number) || 0;
          const tt = (grade.tests_total as number) || 0;
          addToast(`${tp}/${tt} tests passed — fix failing tests and try again`, 'info');
          setRunResult({
            stdout: `${tp}/${tt} tests passed`,
            stderr: '',
            exit_code: 1,
            test_results: (grade.test_results as RunTestResult[]) || null,
            tests_passed: tp,
            tests_total: tt,
            all_passed: false,
            execution_time_ms: 0,
          });
          setActiveTab('output');
        } else {
          addToast('Not quite — try again or use a hint!', 'info');
        }
      }
    } catch {
      addToast('Submission failed', 'error');
    }
    setSubmitting(false);
  }

  async function handleHint() {
    if (!token || !assignment) return;
    setHintLoading(true);
    try {
      const preview = await previewHint(assignment.id, 'NUDGE', token);
      if (!preview.can_afford) {
        addToast(`Not enough gold (need ${preview.gold_cost})`, 'error');
        setHintLoading(false);
        return;
      }
      const result = await purchaseHint(assignment.id, 'NUDGE', token);
      spendGold(result.gold_cost);
      setHintText(result.hint_text);
      addToast(`Hint unlocked! (-${result.gold_cost} Gold)`, 'info');
    } catch {
      addToast('Failed to get hint', 'error');
    }
    setHintLoading(false);
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-accent-blue/20" />
          <div className="absolute inset-0 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-8">
        <div className="card text-center py-12">
          <p className="text-sm text-text-faint">Assignment not found</p>
          <button onClick={() => router.push('/student/dashboard')} className="btn-ghost text-xs mt-4">
            Back to Missions
          </button>
        </div>
      </div>
    );
  }

  const mcqOptions = (content?.options ?? {}) as Record<string, string>;
  const mcqQuestion = (content?.question ?? assignment.description ?? '') as string;
  const difficultyStars = Array.from({ length: 5 }, (_, i) => i < assignment.difficulty);

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {showConfetti && <ConfettiBurst />}

      {/* Back nav */}
      <button
        onClick={() => router.push('/student/dashboard')}
        className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text-muted transition-colors mb-5"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Missions
      </button>

      {/* Header — quest banner style */}
      <div className={`relative mb-6 rounded-xl border p-5 ${
        solvedCorrectly
          ? 'bg-gradient-to-r from-accent-green/5 to-transparent border-accent-green/30'
          : 'bg-gradient-to-r from-accent-blue/5 to-transparent border-border'
      }`}>
        {/* Floating rewards appear here */}
        <div className="relative">
          {floatingRewards.map((r) => (
            <FloatingReward key={r.id} text={r.text} color={r.color} />
          ))}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-accent-blue/15 text-accent-blue border border-accent-blue/20">
                {assignment.type.replace('_', ' ')}
              </span>
              {solvedCorrectly && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-accent-green/15 text-accent-green border border-accent-green/20 animate-score-pop">
                  ✓ Completed
                </span>
              )}
              {/* Difficulty stars */}
              <div className="flex items-center gap-0.5 ml-1">
                {difficultyStars.map((filled, i) => (
                  <svg key={i} className={`w-3 h-3 ${filled ? 'text-gold' : 'text-surface-border'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <h1 className="text-lg font-bold text-text-primary leading-snug">{assignment.title}</h1>
          </div>
          {/* Rewards badge */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-xp/10 border border-xp/20">
                <span className="text-xp text-xs">✦</span>
                <span className="text-xp font-bold text-sm">{assignment.max_xp} XP</span>
              </div>
              {assignment.max_gold > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/20">
                  <span className="text-gold text-xs">●</span>
                  <span className="text-gold font-bold text-sm">{assignment.max_gold} Gold</span>
                </div>
              )}
            </div>
            {hasSubmitted && (
              <span className="text-[10px] text-text-faint">{submissions.length} attempt{submissions.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
      </div>

      {/* Main grid — wider sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Question area (3 cols) */}
        <div className={`lg:col-span-3 space-y-5 ${shakeCard ? 'animate-shake' : ''} ${
          flashColor === 'red' ? 'animate-flash-red' : flashColor === 'green' ? 'animate-flash-green' : ''
        }`}>
          {/* MCQ */}
          {isMCQ && (
            <div className="card">
              {solvedCorrectly && (
                <div className="flex items-center gap-2 px-4 py-3 mb-5 rounded-lg bg-accent-green/10 border border-accent-green/30">
                  <span className="text-accent-green text-lg">🏆</span>
                  <span className="text-sm text-accent-green font-medium">Quest complete! You&apos;ve answered correctly.</span>
                </div>
              )}
              <p className="text-sm text-text-primary font-semibold mb-4">{mcqQuestion}</p>
              <div className="space-y-2.5">
                {Object.entries(mcqOptions).map(([key, text]) => {
                  const isSelected = selectedAnswer === key;
                  const wasSubmitted = submissions.some(
                    (s) => (s.content_json as Record<string, unknown> | null)?.selected_answer === key,
                  );
                  const wasCorrect = submissions.some(
                    (s) =>
                      (s.content_json as Record<string, unknown> | null)?.selected_answer === key &&
                      (s.ai_grade as Record<string, unknown> | null)?.correct === true,
                  );
                  const wasWrong = wasSubmitted && !wasCorrect;
                  return (
                    <label
                      key={key}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 ${
                        solvedCorrectly ? 'cursor-default' : 'cursor-pointer'
                      } ${
                        wasCorrect
                          ? 'border-accent-green/50 bg-accent-green/5'
                          : wasWrong
                          ? 'border-accent-red/30 bg-accent-red/5 opacity-60'
                          : isSelected
                          ? 'border-accent-blue/50 bg-accent-blue/5 shadow-md shadow-accent-blue/10'
                          : 'border-border hover:border-accent-blue/30 hover:bg-surface-overlay'
                      }`}
                    >
                      <input
                        type="radio"
                        name="mcq-answer"
                        value={key}
                        checked={isSelected}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        disabled={solvedCorrectly}
                        className="mt-0.5 accent-[var(--accent-blue)] sr-only"
                      />
                      <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold border-2 transition-all ${
                        wasCorrect
                          ? 'bg-accent-green/20 border-accent-green/50 text-accent-green'
                          : wasWrong
                          ? 'bg-accent-red/20 border-accent-red/40 text-accent-red'
                          : isSelected
                          ? 'bg-accent-blue/20 border-accent-blue/50 text-accent-blue'
                          : 'bg-surface-overlay border-border text-text-faint'
                      }`}>
                        {wasCorrect ? '✓' : wasWrong ? '✗' : key}
                      </div>
                      <span className="text-sm text-text-secondary mt-0.5">{text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scenario / text response */}
          {(isScenario || (!isMCQ && !isCodeLab)) && (
            <div className="card space-y-4">
              {assignment.description && (
                <p className="text-sm text-text-primary">{assignment.description}</p>
              )}
              {typeof content?.scenario === 'string' && (
                <div className="p-4 rounded-lg bg-surface-overlay border border-border">
                  <p className="text-xs text-text-faint uppercase tracking-wider mb-2">Scenario</p>
                  <p className="text-sm text-text-secondary">{content.scenario}</p>
                </div>
              )}
              <textarea
                value={textResponse}
                onChange={(e) => setTextResponse(e.target.value)}
                placeholder="Type your response here..."
                rows={8}
                className="w-full px-4 py-3 rounded-lg text-sm text-text-primary bg-surface-overlay
                           border border-border focus:outline-none focus:ring-2 focus:ring-accent-blue/40
                           focus:border-accent-blue/60 placeholder:text-text-faint transition-all resize-y"
              />
            </div>
          )}

          {/* Code Lab — LeetCode-style IDE */}
          {isCodeLab && (
            <div className="space-y-0">
              {/* Problem statement */}
              {(assignment.description || typeof content?.problem_statement === 'string') && (
                <div className="card mb-4 space-y-3">
                  {assignment.description && (
                    <p className="text-sm text-text-primary">{assignment.description}</p>
                  )}
                  {typeof content?.problem_statement === 'string' && (
                    <div className="p-4 rounded-lg bg-surface-overlay border border-border">
                      <p className="text-xs text-text-faint uppercase tracking-wider mb-2">Problem</p>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{content.problem_statement}</p>
                    </div>
                  )}
                  {/* Sample I/O if provided */}
                  {content?.sample_input != null && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-surface-overlay border border-border">
                        <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Sample Input</p>
                        <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap">{String(content.sample_input)}</pre>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-overlay border border-border">
                        <p className="text-[10px] text-text-faint uppercase tracking-wider mb-1">Expected Output</p>
                        <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap">{String(content?.sample_output ?? '')}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Editor + toolbar */}
              <div className="rounded-xl border border-border overflow-hidden bg-[#1a1b26]">
                {/* Editor toolbar */}
                <div className="flex items-center justify-between px-4 py-2 bg-surface-overlay/50 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-text-faint uppercase tracking-wider">
                      {(content?.language as string) || 'Python'}
                    </span>
                    {solvedCorrectly && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-green/15 text-accent-green border border-accent-green/20">
                        Accepted
                      </span>
                    )}
                  </div>
                  {runResult && (
                    <span className="text-[10px] text-text-faint">
                      {runResult.execution_time_ms}ms
                    </span>
                  )}
                </div>

                {/* Monaco editor */}
                <MonacoEditor
                  height="380px"
                  language={(content?.language as string) || 'python'}
                  theme="vs-dark"
                  value={codeValue}
                  onChange={(v) => setCodeValue(v || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    padding: { top: 12, bottom: 12 },
                    renderLineHighlight: 'line',
                    automaticLayout: true,
                    tabSize: 4,
                    readOnly: solvedCorrectly,
                  }}
                />

                {/* Run / Submit bar */}
                {!solvedCorrectly && (
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-overlay/50 border-t border-border">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRunCode}
                        disabled={runningCode || !codeValue.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium
                                   bg-surface-overlay border border-border text-text-primary
                                   hover:bg-surface-overlay/80 hover:border-text-faint
                                   disabled:opacity-40 transition-all"
                      >
                        {runningCode ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-text-faint/30 border-t-text-primary rounded-full animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
                            </svg>
                            Run Code
                          </>
                        )}
                      </button>
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !codeValue.trim()}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold
                                 bg-accent-green text-surface-base
                                 hover:bg-accent-green/90 hover:shadow-lg hover:shadow-accent-green/20
                                 disabled:opacity-40 transition-all"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-surface-base/30 border-t-surface-base rounded-full animate-spin" />
                          Judging...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Submit
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Test Results Panel */}
              {runResult && (
                <div className="mt-4 rounded-xl border border-border overflow-hidden animate-fade-in">
                  {/* Tab bar */}
                  <div className="flex items-center gap-0 bg-surface-overlay border-b border-border">
                    <button
                      onClick={() => setActiveTab('testcases')}
                      className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                        activeTab === 'testcases'
                          ? 'border-accent-blue text-accent-blue'
                          : 'border-transparent text-text-faint hover:text-text-muted'
                      }`}
                    >
                      Test Results
                      {runResult.tests_total > 0 && (
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          runResult.all_passed
                            ? 'bg-accent-green/15 text-accent-green'
                            : 'bg-accent-red/15 text-accent-red'
                        }`}>
                          {runResult.tests_passed}/{runResult.tests_total}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('output')}
                      className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                        activeTab === 'output'
                          ? 'border-accent-blue text-accent-blue'
                          : 'border-transparent text-text-faint hover:text-text-muted'
                      }`}
                    >
                      Console Output
                    </button>
                  </div>

                  <div className="p-4 bg-[#1a1b26] max-h-[240px] overflow-y-auto">
                    {activeTab === 'testcases' && runResult.test_results && (
                      <div className="space-y-2">
                        {runResult.test_results.map((t, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              t.passed
                                ? 'border-accent-green/20 bg-accent-green/5'
                                : 'border-accent-red/20 bg-accent-red/5'
                            }`}
                          >
                            <span className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center text-[10px] font-bold ${
                              t.passed
                                ? 'bg-accent-green/20 text-accent-green'
                                : 'bg-accent-red/20 text-accent-red'
                            }`}>
                              {t.passed ? '✓' : '✗'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-text-primary">{t.name}</p>
                              {t.output && (
                                <pre className="mt-1 text-[11px] text-text-faint font-mono whitespace-pre-wrap break-all">{t.output}</pre>
                              )}
                              {t.error && (
                                <pre className="mt-1 text-[11px] text-accent-red/80 font-mono whitespace-pre-wrap break-all">{t.error}</pre>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {activeTab === 'testcases' && !runResult.test_results && (
                      <p className="text-xs text-text-faint">No individual test results available.</p>
                    )}
                    {activeTab === 'output' && (
                      <div className="space-y-2">
                        {runResult.stdout && (
                          <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap">{runResult.stdout}</pre>
                        )}
                        {runResult.stderr && (
                          <pre className="text-xs text-accent-red/80 font-mono whitespace-pre-wrap">{runResult.stderr}</pre>
                        )}
                        {!runResult.stdout && !runResult.stderr && (
                          <p className="text-xs text-text-faint">No output.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit button (non-CODE_LAB) */}
          {!solvedCorrectly && !isCodeLab && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={submitting || (isMCQ && !selectedAnswer) || (!isMCQ && !textResponse.trim())}
                className="btn-primary disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {hasSubmitted ? 'Try Again' : 'Submit Answer'}
                  </>
                )}
              </button>
              {isMCQ && !selectedAnswer && (
                <span className="text-xs text-text-faint">Select an answer to submit</span>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Hint panel */}
          {!solvedCorrectly && (
            <div className="card border-gold/15">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">💡</span>
                <h3 className="text-xs font-bold text-gold uppercase tracking-wider">Power-Up: Hint</h3>
              </div>
              <button
                onClick={handleHint}
                disabled={hintLoading}
                className="w-full text-left px-4 py-3 rounded-xl border-2 border-dashed border-gold/25
                           hover:border-gold/50 hover:bg-gold/5 transition-all duration-200 disabled:opacity-50
                           group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hintLoading ? (
                      <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 text-gold group-hover:animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zm4.657 2.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM4 11a1 1 0 100-2H3a1 1 0 000 2h1zm7.36 7a1 1 0 01-.94-.66l-.54-1.5a3 3 0 00-1.664-1.782L7.2 13.6A1 1 0 018 12h4a1 1 0 01.8 1.6l-1.016.458A3 3 0 0010.12 15.84l-.54 1.5A1 1 0 018.64 18h2.72zM10 5a5 5 0 100 10 5 5 0 000-10z" />
                      </svg>
                    )}
                    <span className="text-sm font-medium text-text-primary">
                      {hintLoading ? 'Generating...' : 'Get a Nudge'}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-md">
                    <span>●</span> 10
                  </span>
                </div>
              </button>
              {hintText && (
                <div className="mt-3 p-4 rounded-xl bg-gold/5 border border-gold/20 animate-slide-up">
                  <div className="flex items-start gap-2">
                    <span className="text-gold text-sm mt-0.5">✧</span>
                    <p className="text-sm text-text-secondary leading-relaxed">{hintText}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attempts / submissions */}
          {submissions.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-text-faint uppercase tracking-wider">
                  Battle Log
                </h3>
                <span className="text-[10px] text-text-faint bg-surface-overlay px-2 py-0.5 rounded-full">
                  {submissions.length} attempt{submissions.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {submissions.map((sub) => {
                  const grade = sub.ai_grade as Record<string, unknown> | null;
                  const isCorrect = grade?.correct === true;
                  const hasGrade = grade !== null && grade !== undefined;
                  return (
                    <div
                      key={sub.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isCorrect
                          ? 'border-accent-green/30 bg-accent-green/5'
                          : 'border-border bg-surface-overlay'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                            isCorrect
                              ? 'bg-accent-green/20 text-accent-green'
                              : hasGrade
                              ? 'bg-accent-red/20 text-accent-red'
                              : 'bg-surface-overlay text-text-faint'
                          }`}>
                            {isCorrect ? '✓' : hasGrade ? '✗' : '#'}
                          </span>
                          <span className="text-xs font-medium text-text-primary">Attempt {sub.attempt_number}</span>
                        </div>
                        {sub.xp_awarded > 0 && (
                          <span className="text-xs font-bold text-xp bg-xp/10 px-2 py-0.5 rounded-md">
                            +{sub.xp_awarded} XP
                          </span>
                        )}
                      </div>
                      {sub.feedback && (
                        <p className="text-xs text-text-faint mt-1 leading-relaxed">{sub.feedback}</p>
                      )}
                      {hasGrade && !isCorrect && !sub.feedback && (
                        <p className="text-xs text-text-faint mt-1">Incorrect — try again or use a hint</p>
                      )}
                      {!hasGrade && !sub.feedback && (
                        <p className="text-xs text-text-faint mt-1">Awaiting grading...</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rubric */}
          {assignment.rubric && (
            <div className="card">
              <h3 className="text-xs font-bold text-text-faint uppercase tracking-wider mb-3">Grading Criteria</h3>
              <div className="space-y-2">
                {((assignment.rubric as Record<string, unknown>).criteria as Array<Record<string, unknown>> ?? []).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-text-secondary">{c.name as string}</span>
                    <span className="text-text-faint font-mono">{c.max_score as number} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
