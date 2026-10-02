'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCourseStore } from '@/stores/courses';
import { useAuthStore } from '@/stores/auth';
import { getCourseSummary } from '@/lib/api/courses';

interface Summary {
  active_students: number;
  average_score: number;
  completion_rate: number;
  hint_usage_rate: number;
  at_risk_count: number;
}

export default function CourseOverview() {
  const params = useParams();
  const courseId = params.id as string;
  const token = useAuthStore((s) => s.token);
  const { currentCourse, updateCourse } = useCourseStore();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingConfig, setEditingConfig] = useState(false);
  const [configDraft, setConfigDraft] = useState({
    gamification_level: 'MEDIUM' as 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH',
    grading_strictness: 'MEDIUM' as 'LENIENT' | 'MEDIUM' | 'STRICT',
    hints_enabled: true,
    leaderboard_visible: true,
    streak_tracking_active: true,
  });

  useEffect(() => {
    if (token && courseId) {
      getCourseSummary(courseId, token).then(setSummary).catch(() => {});
    }
  }, [token, courseId]);

  useEffect(() => {
    if (currentCourse) {
      setTitle(currentCourse.title);
      setDescription(currentCourse.description ?? '');
      setConfigDraft({
        gamification_level: currentCourse.gamification_level,
        grading_strictness: currentCourse.grading_strictness,
        hints_enabled: currentCourse.hints_enabled,
        leaderboard_visible: currentCourse.leaderboard_visible,
        streak_tracking_active: currentCourse.streak_tracking_active,
      });
    }
  }, [currentCourse]);

  const handleSave = async () => {
    if (!token || !courseId) return;
    await updateCourse(courseId, { title, description: description || undefined }, token);
    setEditing(false);
  };

  const handleSaveConfig = async () => {
    if (!token || !courseId) return;
    await updateCourse(courseId, configDraft, token);
    setEditingConfig(false);
  };

  const summaryStats = summary
    ? [
        { label: 'Active Students', value: summary.active_students, icon: '⚔', color: 'text-accent-blue', border: 'border-accent-blue/20', bg: 'bg-accent-blue/5' },
        { label: 'Avg Score', value: `${(summary.average_score * 100).toFixed(0)}%`, icon: '🎯', color: 'text-accent-green', border: 'border-accent-green/20', bg: 'bg-accent-green/5' },
        { label: 'Completion', value: `${(summary.completion_rate * 100).toFixed(0)}%`, icon: '📈', color: 'text-accent-purple', border: 'border-accent-purple/20', bg: 'bg-accent-purple/5' },
        { label: 'At-Risk', value: summary.at_risk_count, icon: '🛡', color: summary.at_risk_count > 0 ? 'text-streak' : 'text-accent-green', border: summary.at_risk_count > 0 ? 'border-streak/20' : 'border-accent-green/20', bg: summary.at_risk_count > 0 ? 'bg-streak/5' : 'bg-accent-green/5' },
      ]
    : null;

  return (
    <div className="space-y-6">
      {/* Course info card */}
      <div className="card border border-surface-border">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📖</span>
            <h2 className="text-lg font-semibold text-text-primary">Realm Information</h2>
          </div>
          <button
            onClick={() => editing ? handleSave() : setEditing(true)}
            className={editing ? 'btn-primary text-xs px-3 py-1.5' : 'btn-ghost text-xs'}
          >
            {editing ? '✓ Save' : '✏ Edit'}
          </button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-faint mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm text-text-primary bg-surface-overlay
                           border border-border focus:outline-none focus:ring-2 focus:ring-accent-purple/40"
              />
            </div>
            <div>
              <label className="block text-xs text-text-faint mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm text-text-primary bg-surface-overlay
                           border border-border focus:outline-none focus:ring-2 focus:ring-accent-purple/40 resize-none"
              />
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-text-secondary">{currentCourse?.description || 'No description set.'}</p>
          </div>
        )}
      </div>

      {/* Summary stats */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryStats.map((s, i) => (
            <div key={s.label} className={`card text-center border ${s.border} ${s.bg} animate-fade-in`} style={{ animationDelay: `${i * 80}ms` }}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</div>
              <div className="text-xs text-text-faint mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Configuration */}
      <div className="card border border-surface-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙</span>
            <h2 className="text-lg font-semibold text-text-primary">Realm Configuration</h2>
          </div>
          <button
            onClick={() => editingConfig ? handleSaveConfig() : setEditingConfig(true)}
            className={editingConfig ? 'btn-primary text-xs px-3 py-1.5' : 'btn-ghost text-xs'}
          >
            {editingConfig ? '✓ Save' : '✏ Edit'}
          </button>
        </div>
        {editingConfig ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Gamification Level */}
            <div className="p-3 rounded-lg bg-surface-overlay border border-accent-blue/10">
              <label className="text-xs text-text-faint flex items-center gap-1.5 mb-2">
                <span>🎮</span> Gamification
              </label>
              <select
                value={configDraft.gamification_level}
                onChange={(e) => setConfigDraft((d) => ({ ...d, gamification_level: e.target.value as typeof d.gamification_level }))}
                className="w-full px-2 py-1.5 rounded-md text-xs font-semibold bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
              >
                {['OFF', 'LOW', 'MEDIUM', 'HIGH'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {/* Grading Strictness */}
            <div className="p-3 rounded-lg bg-surface-overlay border border-accent-purple/10">
              <label className="text-xs text-text-faint flex items-center gap-1.5 mb-2">
                <span>📊</span> Grading
              </label>
              <select
                value={configDraft.grading_strictness}
                onChange={(e) => setConfigDraft((d) => ({ ...d, grading_strictness: e.target.value as typeof d.grading_strictness }))}
                className="w-full px-2 py-1.5 rounded-md text-xs font-semibold bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-purple/40"
              >
                {['LENIENT', 'MEDIUM', 'STRICT'].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {/* Hints Toggle */}
            <ToggleItem
              label="Hints" emoji="💡" color="gold"
              checked={configDraft.hints_enabled}
              onChange={(v) => setConfigDraft((d) => ({ ...d, hints_enabled: v }))}
            />
            {/* Leaderboard Toggle */}
            <ToggleItem
              label="Leaderboard" emoji="🏆" color="accent-green"
              checked={configDraft.leaderboard_visible}
              onChange={(v) => setConfigDraft((d) => ({ ...d, leaderboard_visible: v }))}
            />
            {/* Streaks Toggle */}
            <ToggleItem
              label="Streaks" emoji="🔥" color="streak"
              checked={configDraft.streak_tracking_active}
              onChange={(v) => setConfigDraft((d) => ({ ...d, streak_tracking_active: v }))}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {currentCourse && (
              <>
                <ConfigItem label="Gamification" value={currentCourse.gamification_level} emoji="🎮" color="accent-blue" />
                <ConfigItem label="Grading" value={currentCourse.grading_strictness} emoji="📊" color="accent-purple" />
                <ConfigItem label="Hints" value={currentCourse.hints_enabled ? 'Enabled' : 'Disabled'} emoji="💡" color="gold" />
                <ConfigItem label="Leaderboard" value={currentCourse.leaderboard_visible ? 'Visible' : 'Hidden'} emoji="🏆" color="accent-green" />
                <ConfigItem label="Streaks" value={currentCourse.streak_tracking_active ? 'Active' : 'Off'} emoji="🔥" color="streak" />
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="card border border-surface-border">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⚡</span>
          <h2 className="text-lg font-semibold text-text-primary">Quick Actions</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/faculty/courses/${courseId}/upload`} className="btn-secondary text-xs flex items-center gap-1.5">
            <span>📦</span> Upload Materials
          </Link>
          <Link href={`/faculty/courses/${courseId}/assignments`} className="btn-secondary text-xs flex items-center gap-1.5">
            <span>⚔</span> Manage Quests
          </Link>
          <Link href={`/faculty/courses/${courseId}/analytics`} className="btn-secondary text-xs flex items-center gap-1.5">
            <span>📡</span> View Intel
          </Link>
        </div>
      </div>
    </div>
  );
}

function ConfigItem({ label, value, emoji, color }: { label: string; value: string; emoji: string; color: string }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg bg-surface-overlay border border-${color}/10`}>
      <span className="text-xs text-text-faint flex items-center gap-1.5">
        <span>{emoji}</span> {label}
      </span>
      <span className={`text-xs font-semibold text-${color}`}>{value}</span>
    </div>
  );
}

function ToggleItem({ label, emoji, color, checked, onChange }: { label: string; emoji: string; color: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg bg-surface-overlay border border-${color}/10`}>
      <span className="text-xs text-text-faint flex items-center gap-1.5">
        <span>{emoji}</span> {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent-green' : 'bg-surface-border'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}
