'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useCourseStore } from '@/stores/courses';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { publishAssignment, deleteAssignment, updateAssignment, publishGroup, deleteGroup, getGenerationTask } from '@/lib/api/assignments';
import { ApiError } from '@/lib/api/client';
import { getCourseUnits } from '@/lib/api/courses';
import type { Assignment, AssignmentType } from '@/types/api';

const GEN_STEPS = [
  { key: 'mcq', label: 'Generating MCQs', icon: '📝' },
  { key: 'scenarios', label: 'Creating Scenarios', icon: '🎭' },
  { key: 'code_lab', label: 'Building Code Labs', icon: '💻' },
  { key: 'rubrics', label: 'Designing Rubrics', icon: '📊' },
  { key: 'tagging', label: 'Tagging Concepts', icon: '🏷️' },
  { key: 'saving', label: 'Saving to Database', icon: '💾' },
];

function GeneratingOverlay({ types, elapsed }: { types: AssignmentType[]; elapsed: number }) {
  const activeSteps = GEN_STEPS.filter((s) => {
    if (s.key === 'mcq') return types.includes('MCQ');
    if (s.key === 'scenarios') return types.includes('SCENARIO');
    if (s.key === 'code_lab') return types.includes('CODE_LAB');
    return true; // rubrics, tagging, saving always show
  });

  // Estimate which step is active based on elapsed time
  const avgPerStep = Math.max(8, 45 / activeSteps.length);
  const currentIdx = Math.min(Math.floor(elapsed / avgPerStep), activeSteps.length - 1);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <div className="mt-4 p-5 rounded-xl bg-surface-card border border-accent-blue/30 animate-fade-in">
      {/* Header with spinner */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-accent-blue/20" />
          <div className="absolute inset-0 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-lg">🤖</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary">AI Designer is working...</p>
          <p className="text-xs text-text-faint">This may take 30 seconds to a few minutes depending on complexity</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-lg font-mono font-bold text-accent-blue tabular-nums">{timeStr}</div>
          <div className="text-[10px] text-text-faint">elapsed</div>
        </div>
      </div>

      {/* Step progress */}
      <div className="space-y-2">
        {activeSteps.map((step, i) => {
          const isDone = i < currentIdx;
          const isActive = i === currentIdx;
          return (
            <div key={step.key} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500 ${
              isActive ? 'bg-accent-blue/10 border border-accent-blue/30' : isDone ? 'opacity-60' : 'opacity-30'
            }`}>
              <span className="text-base w-6 text-center">{isDone ? '✅' : step.icon}</span>
              <span className={`text-xs font-medium flex-1 ${isActive ? 'text-accent-blue' : 'text-text-muted'}`}>
                {step.label}
              </span>
              {isActive && (
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-bounce [animation-delay:300ms]" />
                </span>
              )}
              {isDone && <span className="text-[10px] text-accent-green font-medium">Done</span>}
            </div>
          );
        })}
      </div>

      {/* Pulse bar at bottom */}
      <div className="mt-4 h-1 rounded-full bg-surface-overlay overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-accent-blue/50 via-accent-blue to-accent-blue/50 animate-pulse-bar" />
      </div>
    </div>
  );
}

const typeColors: Record<string, string> = {
  MCQ: 'bg-accent-blue/10 text-accent-blue border-accent-blue/20',
  SCENARIO: 'bg-accent-purple/10 text-accent-purple border-accent-purple/20',
  CODE_LAB: 'bg-accent-green/10 text-accent-green border-accent-green/20',
  DEBATE: 'bg-gold/10 text-gold border-gold/20',
  REVERSE_ESSAY: 'bg-streak/10 text-streak border-streak/20',
  CUSTOM: 'bg-text-faint/10 text-text-faint border-text-faint/20',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-text-faint/10 text-text-faint',
  FACULTY_REVIEW: 'bg-gold/10 text-gold',
  PUBLISHED: 'bg-accent-green/10 text-accent-green',
  ARCHIVED: 'bg-text-faint/10 text-text-faint',
};

const difficultyBars = (level: number) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className={`w-1.5 h-3 rounded-sm ${i <= level ? 'bg-accent-blue' : 'bg-surface-overlay'}`} />
    ))}
  </div>
);

export default function CourseAssignmentsPage() {
  const params = useParams();
  const courseId = params.id as string;
  const token = useAuthStore((s) => s.token);
  const { assignments, fetchAssignments, generateAssignments, loading } = useCourseStore();
  const isGenerating = useCourseStore((s) => s.isGenerating);
  const storeGenTypes = useCourseStore((s) => s.genTypes);
  const genStartTime = useCourseStore((s) => s.genStartTime);
  const genTaskId = useCourseStore((s) => s.genTaskId);
  const genCourseId = useCourseStore((s) => s.genCourseId);
  const startGeneration = useCourseStore((s) => s.startGeneration);
  const stopGeneration = useCourseStore((s) => s.stopGeneration);
  const [showGenerator, setShowGenerator] = useState(false);
  const [localGenTypes, setLocalGenTypes] = useState<AssignmentType[]>(['MCQ', 'SCENARIO']);
  const [genCount, setGenCount] = useState(3);
  const [mcqCount, setMcqCount] = useState(5);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [units, setUnits] = useState<{ unit_number: number; unit_name: string }[]>([]);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; description: string; difficulty: number; max_xp: number; max_gold: number }>({ title: '', description: '', difficulty: 1, max_xp: 100, max_gold: 25 });
  const [genResult, setGenResult] = useState<{ count: number; types: string[] } | null>(null);
  const addToast = useToastStore((s) => s.addToast);
  const [genElapsed, setGenElapsed] = useState(0);

  // Elapsed timer driven by store's genStartTime (survives remounts)
  useEffect(() => {
    if (!isGenerating || !genStartTime) {
      setGenElapsed(0);
      return;
    }
    setGenElapsed(Math.floor((Date.now() - genStartTime) / 1000));
    const id = setInterval(() => {
      setGenElapsed(Math.floor((Date.now() - genStartTime) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [isGenerating, genStartTime]);

  // Polling effect — runs whenever genTaskId is set (survives remounts + page refresh via sessionStorage)
  useEffect(() => {
    if (!isGenerating || !genTaskId || !token) return;
    let cancelled = false;
    const targetCourseId = genCourseId || courseId;
    let consecutiveErrors = 0;

    const poll = async () => {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) break;
        try {
          const task = await getGenerationTask(genTaskId, token);
          consecutiveErrors = 0; // reset on success
          if (cancelled) break;
          if (task.status === 'completed') {
            useCourseStore.getState().stopGeneration();
            useCourseStore.getState().fetchAssignments(targetCourseId, token);
            try {
              if (task.result) {
                setGenResult({
                  count: task.result.generated_count,
                  types: [...new Set(task.result.assignments.map((a) => a.type))],
                });
                useToastStore.getState().addToast(
                  `Successfully generated ${task.result.generated_count} assignment${task.result.generated_count !== 1 ? 's' : ''}`,
                  'success',
                );
              }
            } catch { /* swallow result-parsing errors — assignments are already saved */ }
            break;
          } else if (task.status === 'failed') {
            useCourseStore.getState().stopGeneration();
            useToastStore.getState().addToast(
              `Assignment generation failed: ${task.error ?? 'unknown error'}`,
              'error',
            );
            break;
          }
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            // Task not found — server may have restarted. Stop and refresh.
            if (cancelled) break;
            useCourseStore.getState().stopGeneration();
            useCourseStore.getState().fetchAssignments(targetCourseId, token);
            useToastStore.getState().addToast(
              'Generation task lost (server may have restarted). Refreshing assignments...',
              'info',
            );
            break;
          }
          consecutiveErrors++;
          if (consecutiveErrors > 20) {
            // Too many consecutive network errors — give up
            if (cancelled) break;
            useCourseStore.getState().stopGeneration();
            useToastStore.getState().addToast('Lost connection to server during generation', 'error');
            break;
          }
          // Otherwise, just retry on next poll cycle
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [isGenerating, genTaskId, token, genCourseId, courseId]);

  useEffect(() => {
    if (token && courseId) {
      fetchAssignments(courseId, token);
      getCourseUnits(courseId, token).then((data) => setUnits(data.units ?? [])).catch(() => {});
    }
  }, [token, courseId, fetchAssignments]);

  const handleGenerate = async () => {
    if (!token) return;
    setGenResult(null);
    const config: Record<string, unknown> = {
      types: localGenTypes,
      count_per_type: genCount,
      mcq_count: localGenTypes.includes('MCQ') ? mcqCount : undefined,
      unit_number: selectedUnit ?? undefined,
      unit_name: selectedUnit ? units.find((u) => u.unit_number === selectedUnit)?.unit_name : undefined,
      model: selectedModel || undefined,
    };
    try {
      const taskId = await generateAssignments(courseId, config, token);
      if (taskId) {
        startGeneration(localGenTypes, taskId, courseId);
      } else {
        addToast('Failed to start assignment generation', 'error');
      }
    } catch {
      addToast('Assignment generation failed', 'error');
    }
  };

  const handlePublish = async (assignmentId: string) => {
    if (!token) return;
    try {
      await publishAssignment(assignmentId, token);
      fetchAssignments(courseId, token);
      addToast('Assignment published', 'success');
    } catch {
      addToast('Failed to publish assignment', 'error');
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!token) return;
    try {
      await deleteAssignment(assignmentId, token);
      // Immediately remove from local store to avoid needing refresh
      useCourseStore.setState((s) => ({
        assignments: s.assignments.filter((a) => a.id !== assignmentId),
      }));
      addToast('Assignment deleted', 'success');
    } catch {
      addToast('Failed to delete assignment', 'error');
    }
  };

  const handleEditOpen = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setEditForm({
      title: assignment.title,
      description: assignment.description ?? '',
      difficulty: assignment.difficulty,
      max_xp: assignment.max_xp,
      max_gold: assignment.max_gold,
    });
  };

  const handleEditSave = async () => {
    if (!token || !editingAssignment) return;
    try {
      await updateAssignment(editingAssignment.id, editForm, token);
      setEditingAssignment(null);
      fetchAssignments(courseId, token);
      addToast('Assignment updated', 'success');
    } catch {
      addToast('Failed to update assignment', 'error');
    }
  };

  const handlePublishGroup = async (groupId: string) => {
    if (!token) return;
    try {
      await publishGroup(groupId, token);
      fetchAssignments(courseId, token);
      addToast('MCQ set published', 'success');
    } catch {
      addToast('Failed to publish MCQ set', 'error');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!token) return;
    try {
      await deleteGroup(groupId, token);
      useCourseStore.setState((s) => ({
        assignments: s.assignments.filter((a) => a.group_id !== groupId),
      }));
      addToast('MCQ set deleted', 'success');
    } catch {
      addToast('Failed to delete MCQ set', 'error');
    }
  };

  // --- Grouping logic: MCQs with same group_id → sets, rest → individual ---
  type ListItem =
    | { kind: 'single'; assignment: Assignment }
    | { kind: 'mcq_set'; groupId: string; items: Assignment[] };

  function buildGroupedList(list: Assignment[]): ListItem[] {
    const groups = new Map<string, Assignment[]>();
    const singles: Assignment[] = [];
    for (const a of list) {
      if (a.type === 'MCQ' && a.group_id) {
        const arr = groups.get(a.group_id) ?? [];
        arr.push(a);
        groups.set(a.group_id, arr);
      } else {
        singles.push(a);
      }
    }
    const out: ListItem[] = [];
    for (const [groupId, items] of groups) {
      out.push({ kind: 'mcq_set', groupId, items });
    }
    for (const a of singles) {
      out.push({ kind: 'single', assignment: a });
    }
    return out;
  }

  const reviewQueue = assignments.filter((a) => a.status === 'FACULTY_REVIEW');
  const published = assignments.filter((a) => a.status === 'PUBLISHED');
  const drafts = assignments.filter((a) => a.status === 'DRAFT');
  const groupedReview = buildGroupedList(reviewQueue);
  const groupedPublished = buildGroupedList(published);
  const groupedDrafts = buildGroupedList(drafts);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">⚔</span>
            <h2 className="text-lg font-semibold text-text-primary">Quest Board</h2>
          </div>
          <p className="text-sm text-text-muted">{assignments.length} total quests forged</p>
        </div>
        <button onClick={() => setShowGenerator(!showGenerator)} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
          <span>🤖</span> Summon AI Designer
        </button>
      </div>

      {/* Generator panel */}
      {showGenerator && (
        <div className="card border-accent-purple/30 animate-fade-in">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2"><span>🤖</span> AI Quest Forge</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-text-faint mb-1.5">Assignment Types</label>
              <div className="flex flex-wrap gap-2">
                {(['MCQ', 'SCENARIO', 'CODE_LAB', 'DEBATE'] as AssignmentType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setLocalGenTypes((prev) =>
                      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                    )}
                    className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all ${
                      localGenTypes.includes(type) ? typeColors[type] : 'border-border text-text-faint hover:text-text-muted'
                    }`}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1.5">Count per Type</label>
              <select
                value={genCount}
                onChange={(e) => setGenCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm bg-surface-overlay border border-border
                           text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
              >
                {[1, 2, 3, 5, 10].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* MCQ Count (separate) */}
          {localGenTypes.includes('MCQ') && (
            <div className="mb-4">
              <label className="block text-xs text-text-faint mb-1.5">Number of MCQs</label>
              <select
                value={mcqCount}
                onChange={(e) => setMcqCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg text-sm bg-surface-overlay border border-border
                           text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
              >
                {[1, 3, 5, 10, 15, 20, 25, 30].map((n) => (
                  <option key={n} value={n}>{n} MCQs</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Unit Selection */}
            <div>
              <label className="block text-xs text-text-faint mb-1.5">Unit (optional)</label>
              <select
                value={selectedUnit ?? ''}
                onChange={(e) => setSelectedUnit(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-surface-overlay border border-border
                           text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
              >
                <option value="">All Units</option>
                {units.map((u) => (
                  <option key={u.unit_number} value={u.unit_number}>
                    Unit {u.unit_number}: {u.unit_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-xs text-text-faint mb-1.5">LLM Model</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-surface-overlay border border-border
                           text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
              >
                <option value="">Auto (default routing)</option>
                <option value="llama3:latest">LLaMA 3 (8B)</option>
                <option value="qwen3-coder:latest">Qwen3 Coder (coding)</option>
                <option value="qwen2.5vl:latest">Qwen2.5 VL (vision)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || localGenTypes.length === 0}
              className="btn-primary text-xs px-4 py-2 disabled:opacity-50 flex items-center gap-1.5"
            >
              {isGenerating ? '⚔ Forging...' : `⚔ Forge Quests`}
            </button>
            {!isGenerating && (
              <button onClick={() => { setShowGenerator(false); setGenResult(null); }} className="btn-ghost text-xs">
                Cancel
              </button>
            )}
          </div>

          {/* Success Banner */}
          {genResult && (
            <div className="mt-4 p-4 rounded-lg bg-accent-green/10 border border-accent-green/30 animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-accent-green text-lg">✅</span>
                <span className="text-sm font-semibold text-accent-green">Quests Forged!</span>
              </div>
              <p className="text-xs text-text-muted">
                {genResult.count} assignment{genResult.count !== 1 ? 's' : ''} created
                {genResult.types.length > 0 && ` — Types: ${genResult.types.map((t) => t.replace('_', ' ')).join(', ')}`}
              </p>
              <button
                onClick={() => { setShowGenerator(false); setGenResult(null); }}
                className="mt-2 text-xs text-accent-blue hover:underline"
              >
                Close & view assignments
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generation overlay — always visible when generating (survives panel close / page remount) */}
      {isGenerating && <GeneratingOverlay types={storeGenTypes} elapsed={genElapsed} />}

      {/* Review Queue */}
      {reviewQueue.length > 0 && (
        <div>
          <div className="label-overline mb-3 flex items-center gap-2">
            <span>📜</span> Needs Your Seal
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
              {reviewQueue.length}
            </span>
          </div>
          <div className="space-y-3">
            {groupedReview.map((item) =>
              item.kind === 'mcq_set' ? (
                <McqSetCard key={item.groupId} groupId={item.groupId} items={item.items} onPublishGroup={() => handlePublishGroup(item.groupId)} onDeleteGroup={() => handleDeleteGroup(item.groupId)} onEdit={handleEditOpen} onDelete={handleDelete} onPublish={handlePublish} />
              ) : (
                <AssignmentCard key={item.assignment.id} assignment={item.assignment} onPublish={() => handlePublish(item.assignment.id)} onDelete={() => handleDelete(item.assignment.id)} onEdit={() => handleEditOpen(item.assignment)} />
              )
            )}
          </div>
        </div>
      )}

      {/* Published */}
      {published.length > 0 && (
        <div>
          <div className="label-overline mb-3 flex items-center gap-2"><span>✅</span> Published Quests ({published.length})</div>
          <div className="space-y-3">
            {groupedPublished.map((item) =>
              item.kind === 'mcq_set' ? (
                <McqSetCard key={item.groupId} groupId={item.groupId} items={item.items} onDeleteGroup={() => handleDeleteGroup(item.groupId)} onEdit={handleEditOpen} onDelete={handleDelete} />
              ) : (
                <AssignmentCard key={item.assignment.id} assignment={item.assignment} onDelete={() => handleDelete(item.assignment.id)} onEdit={() => handleEditOpen(item.assignment)} />
              )
            )}
          </div>
        </div>
      )}

      {/* Drafts */}
      {drafts.length > 0 && (
        <div>
          <div className="label-overline mb-3 flex items-center gap-2"><span>📝</span> Draft Quests ({drafts.length})</div>
          <div className="space-y-3">
            {groupedDrafts.map((item) =>
              item.kind === 'mcq_set' ? (
                <McqSetCard key={item.groupId} groupId={item.groupId} items={item.items} onDeleteGroup={() => handleDeleteGroup(item.groupId)} onEdit={handleEditOpen} onDelete={handleDelete} />
              ) : (
                <AssignmentCard key={item.assignment.id} assignment={item.assignment} onDelete={() => handleDelete(item.assignment.id)} onEdit={() => handleEditOpen(item.assignment)} />
              )
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {assignments.length === 0 && !loading && !isGenerating && (
        <div className="card text-center py-12 border border-dashed border-surface-border">
          <div className="text-4xl mb-4">⚔</div>
          <p className="text-text-muted mb-1 font-medium">No quests forged yet</p>
          <p className="text-sm text-text-faint mb-4">Upload scrolls of knowledge first, then summon the AI to forge quests</p>
          <button onClick={() => setShowGenerator(true)} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 mx-auto">
            <span>🤖</span> Summon AI Designer
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card w-full max-w-lg mx-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Edit Assignment</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-faint mb-1">Title</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-surface-overlay border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
                />
              </div>
              <div>
                <label className="block text-xs text-text-faint mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-surface-overlay border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40 resize-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-text-faint mb-1">Difficulty (1-5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={editForm.difficulty}
                    onChange={(e) => setEditForm((f) => ({ ...f, difficulty: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-surface-overlay border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-faint mb-1">Max XP</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.max_xp}
                    onChange={(e) => setEditForm((f) => ({ ...f, max_xp: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-surface-overlay border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-faint mb-1">Max Gold</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.max_gold}
                    onChange={(e) => setEditForm((f) => ({ ...f, max_gold: Number(e.target.value) }))}
                    className="w-full px-3 py-2 rounded-lg text-sm bg-surface-overlay border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleEditSave} className="btn-primary text-xs px-4 py-2">Save Changes</button>
              <button onClick={() => setEditingAssignment(null)} className="btn-ghost text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function McqSetCard({
  groupId,
  items,
  onPublishGroup,
  onDeleteGroup,
  onEdit,
  onDelete,
  onPublish,
}: {
  groupId: string;
  items: Assignment[];
  onPublishGroup?: () => void;
  onDeleteGroup?: () => void;
  onEdit: (a: Assignment) => void;
  onDelete: (id: string) => void;
  onPublish?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalXp = items.reduce((s, a) => s + a.max_xp, 0);
  const totalGold = items.reduce((s, a) => s + a.max_gold, 0);
  const avgDiff = Math.round(items.reduce((s, a) => s + a.difficulty, 0) / items.length);
  const unitLabel = items[0]?.unit_name ? `Unit ${items[0].unit_number}` : null;
  const statusLabel = items[0]?.status.replace('_', ' ') ?? '';

  return (
    <div className="rounded-xl border border-accent-blue/20 bg-surface-card overflow-hidden">
      {/* Set header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-surface-overlay/40 transition-colors text-left"
      >
        <span className={`transition-transform duration-200 text-text-faint text-xs ${open ? 'rotate-90' : ''}`}>▶</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-accent-blue/10 text-accent-blue border-accent-blue/20">
          MCQ SET
        </span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[items[0]?.status ?? 'DRAFT']}`}>
          {statusLabel}
        </span>
        {unitLabel && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
            {unitLabel}
          </span>
        )}
        <span className="text-sm font-semibold text-text-primary flex-1">
          MCQ Set — {items.length} question{items.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-center">
            <div className="text-[10px] text-text-faint">Avg Diff</div>
            {difficultyBars(avgDiff)}
          </div>
          <div className="text-center">
            <div className="text-[10px] text-text-faint">Total XP</div>
            <div className="text-sm font-bold text-xp">{totalXp}</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-text-faint">Total Gold</div>
            <div className="text-sm font-bold text-gold">{totalGold}</div>
          </div>
        </div>
      </button>

      {/* Set-level actions */}
      <div className="flex items-center gap-2 px-4 pb-3 border-b border-border/50">
        {onPublishGroup && items[0]?.status === 'FACULTY_REVIEW' && (
          <button onClick={(e) => { e.stopPropagation(); onPublishGroup(); }} className="btn-primary text-[10px] px-3 py-1">
            Publish All {items.length}
          </button>
        )}
        {onDeleteGroup && (
          confirmDelete ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { onDeleteGroup(); setConfirmDelete(false); }} className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                Confirm Delete All
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-[10px] px-2 py-1 text-text-faint hover:text-text-muted">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }} className="text-[10px] px-3 py-1 rounded-lg border border-border text-text-faint hover:text-red-400 hover:border-red-400/30 transition-colors">
              Delete Set
            </button>
          )
        )}
        <span className="text-[10px] text-text-faint ml-auto">
          Click to {open ? 'collapse' : 'expand'} individual questions
        </span>
      </div>

      {/* Expanded: individual MCQ cards */}
      {open && (
        <div className="divide-y divide-border/30">
          {items.map((a, idx) => (
            <div key={a.id} className="px-4 py-3 flex items-start gap-3 hover:bg-surface-overlay/30 transition-colors">
              <span className="text-xs font-mono text-text-faint mt-1 w-6 shrink-0">Q{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-text-primary">{(a.content as Record<string, string> | null)?.question ?? a.title}</h4>
                {(() => {
                  const c = a.content as { options?: Record<string, string>; correct_answer?: string } | null;
                  if (!c?.options) return null;
                  return (
                    <div className="mt-1.5 space-y-1">
                      {Object.entries(c.options).map(([key, val]) => (
                        <div key={key} className={`text-xs px-2.5 py-1 rounded ${
                          key === c.correct_answer ? 'bg-accent-green/10 text-accent-green font-medium' : 'text-text-muted'
                        }`}>
                          <span className="font-semibold mr-1.5">{key}.</span>{String(val)}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {a.concept_tags && a.concept_tags.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {a.concept_tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-surface-overlay text-text-faint">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {difficultyBars(a.difficulty)}
                <button onClick={() => onEdit(a)} className="text-[10px] px-2 py-1 rounded border border-border text-text-faint hover:text-text-primary hover:border-accent-blue/30 transition-colors">
                  Edit
                </button>
                {onPublish && a.status === 'FACULTY_REVIEW' && (
                  <button onClick={() => onPublish(a.id)} className="text-[10px] px-2 py-1 rounded bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors">
                    Publish
                  </button>
                )}
                <button onClick={() => onDelete(a.id)} className="text-[10px] px-2 py-1 rounded border border-border text-text-faint hover:text-red-400 hover:border-red-400/30 transition-colors">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentCard({ assignment, onPublish, onDelete, onEdit }: { assignment: Assignment; onPublish?: () => void; onDelete?: () => void; onEdit?: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="card card-hover flex items-center gap-4 !p-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${typeColors[assignment.type] ?? typeColors.CUSTOM}`}>
            {assignment.type.replace('_', ' ')}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[assignment.status]}`}>
            {assignment.status.replace('_', ' ')}
          </span>
          {assignment.unit_name && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
              Unit {assignment.unit_number}
            </span>
          )}
        </div>
        <h4 className="text-sm font-semibold text-text-primary truncate">{assignment.title}</h4>
        {assignment.description && (
          <p className="text-xs text-text-muted truncate mt-0.5">{assignment.description}</p>
        )}
        {assignment.concept_tags && assignment.concept_tags.length > 0 && (
          <div className="flex gap-1 mt-2">
            {assignment.concept_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-surface-overlay text-text-faint">
                {tag}
              </span>
            ))}
            {assignment.concept_tags.length > 3 && (
              <span className="text-[9px] text-text-faint">+{assignment.concept_tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="text-center">
          <div className="text-xs text-text-faint">Difficulty</div>
          {difficultyBars(assignment.difficulty)}
        </div>
        <div className="text-center">
          <div className="text-xs text-text-faint">XP</div>
          <div className="text-sm font-bold text-xp">{assignment.max_xp}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-text-faint">Gold</div>
          <div className="text-sm font-bold text-gold">{assignment.max_gold}</div>
        </div>
        {onEdit && (
          <button onClick={onEdit} className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:border-accent-blue/30 transition-colors">
            Edit
          </button>
        )}
        {onPublish && assignment.status === 'FACULTY_REVIEW' && (
          <button onClick={onPublish} className="btn-primary text-xs px-3 py-1.5">
            Publish
          </button>
        )}
        {onDelete && (
          confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={() => { onDelete(); setConfirmDelete(false); }} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                Confirm
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 text-text-faint hover:text-text-muted">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-faint hover:text-red-400 hover:border-red-400/30 transition-colors">
              Delete
            </button>
          )
        )}
      </div>
    </div>
  );
}
