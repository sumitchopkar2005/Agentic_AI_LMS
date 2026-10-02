'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { uploadMaterials, getIngestionStatus, listMaterials, getCourseUnits, deleteMaterial } from '@/lib/api/courses';
import type { CourseMaterial } from '@/types/api';

interface UploadedFile {
  name: string;
  status: 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

export default function CourseUploadPage() {
  const params = useParams();
  const courseId = params.id as string;
  const token = useAuthStore((s) => s.token);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [ingestion, setIngestion] = useState<{ status: string; progress_pct: number; current_step: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [uploadDone, setUploadDone] = useState(false);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [units, setUnits] = useState<{ unit_number: number; unit_name: string }[]>([]);
  const [unitMode, setUnitMode] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const addToast = useToastStore((s) => s.addToast);

  const handleDelete = useCallback(async (materialId: string, filename: string) => {
    if (!token || !courseId) return;
    if (!confirm(`Delete "${filename}"? This will also remove its chunks and knowledge graph concepts.`)) return;
    setDeletingId(materialId);
    try {
      const result = await deleteMaterial(courseId, materialId, token);
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
      addToast(
        `Deleted ${filename} (${result.weaviate_chunks_deleted} chunks, ${result.neo4j_concepts_deleted} concepts removed)`,
        'success',
      );
      getCourseUnits(courseId, token).then((data) => setUnits(data.units ?? [])).catch(() => {});
    } catch (err) {
      addToast(`Delete failed: ${(err as Error).message}`, 'error');
    } finally {
      setDeletingId(null);
    }
  }, [courseId, token, addToast]);

  // Fetch existing materials on mount
  useEffect(() => {
    if (!token || !courseId) return;
    listMaterials(courseId, token).then(setMaterials).catch(() => {});
    getCourseUnits(courseId, token).then((data) => setUnits(data.units ?? [])).catch(() => {});
  }, [token, courseId]);

  // Poll ingestion status after at least one upload completes
  useEffect(() => {
    if (!token || !courseId || !uploadDone) return;

    const poll = () => {
      getIngestionStatus(courseId, token).then(setIngestion).catch(() => {});
    };
    poll();
    pollingRef.current = setInterval(poll, 2000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [token, courseId, uploadDone]);

  // Stop polling when ingestion completes or fails
  useEffect(() => {
    if (ingestion?.status === 'completed') {
      if (pollingRef.current) clearInterval(pollingRef.current);
      addToast('Ingestion complete — knowledge graph is ready', 'success');
      // Refresh units after ingestion completes
      if (token && courseId) {
        getCourseUnits(courseId, token).then((data) => setUnits(data.units ?? [])).catch(() => {});
      }
    }
    if (ingestion?.status === 'failed') {
      if (pollingRef.current) clearInterval(pollingRef.current);
      addToast('Ingestion failed — check logs', 'error');
    }
  }, [ingestion?.status, addToast, token, courseId]);

  const handleUpload = useCallback(async (file: File) => {
    if (!token) return;

    const entry: UploadedFile = { name: file.name, status: 'uploading', progress: 0 };
    setFiles((prev) => [...prev, entry]);

    // Determine unit info
    let unitInfo: { unit_number: number; unit_name: string } | undefined;
    if (unitMode) {
      if (selectedUnit) {
        const u = units.find((u) => u.unit_number === selectedUnit);
        if (u) unitInfo = { unit_number: u.unit_number, unit_name: u.unit_name };
      } else if (newUnitNumber) {
        unitInfo = { unit_number: Number(newUnitNumber), unit_name: newUnitName || `Unit ${newUnitNumber}` };
      }
    }

    try {
      // Simulate progress updates while upload happens
      const progressInterval = setInterval(() => {
        setFiles((prev) => prev.map((f) =>
          f.name === file.name && f.status === 'uploading'
            ? { ...f, progress: Math.min(f.progress + 15, 90) }
            : f
        ));
      }, 300);

      await uploadMaterials(courseId, file, token, unitInfo);
      clearInterval(progressInterval);

      setFiles((prev) => prev.map((f) =>
        f.name === file.name ? { ...f, status: 'done', progress: 100 } : f
      ));
      setUploadDone(true);
      addToast(`${file.name} uploaded successfully${unitInfo ? ` (Unit ${unitInfo.unit_number})` : ''}`, 'success');
      // Refresh materials list
      listMaterials(courseId, token).then(setMaterials).catch(() => {});
      getCourseUnits(courseId, token).then((data) => setUnits(data.units ?? [])).catch(() => {});
    } catch (err) {
      setFiles((prev) => prev.map((f) =>
        f.name === file.name
          ? { ...f, status: 'error', error: (err as Error).message }
          : f
      ));
      addToast(`Upload failed: ${(err as Error).message}`, 'error');
    }
  }, [courseId, token, unitMode, selectedUnit, newUnitNumber, newUnitName, units, addToast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(handleUpload);
  }, [handleUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    selected.forEach(handleUpload);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const stepLabels: Record<string, string> = {
    not_started: 'Not started',
    parsing: 'Parsing documents...',
    chunking: 'Chunking content...',
    embedding: 'Generating embeddings...',
    graph_building: 'Building knowledge graph...',
    completed: 'Ingestion complete',
    failed: 'Ingestion failed',
  };

  return (
    <div className="space-y-6">
      {/* Unit-wise upload toggle */}
      <div className="card border border-surface-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📦</span>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Upload Mode</h3>
              <p className="text-xs text-text-faint mt-0.5">Supply materials for the whole realm or a specific chapter</p>
            </div>
          </div>
          <button
            onClick={() => setUnitMode(!unitMode)}
            className={`text-xs px-4 py-2 rounded-lg border transition-all ${
              unitMode
                ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/30'
                : 'border-border text-text-faint hover:text-text-muted'
            }`}
          >
            {unitMode ? '✓ Unit-wise Upload' : 'Enable Unit-wise Upload'}
          </button>
        </div>

        {unitMode && (
          <div className="animate-fade-in space-y-3 p-3 rounded-lg bg-surface-overlay">
            <label className="block text-xs text-text-faint">Select existing unit or create new</label>
            <div className="flex flex-wrap gap-2">
              {units.map((u, idx) => (
                <button
                  key={`${u.unit_number}-${idx}`}
                  onClick={() => { setSelectedUnit(u.unit_number); setNewUnitNumber(''); }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    selectedUnit === u.unit_number
                      ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/30'
                      : 'border-border text-text-faint hover:text-text-muted'
                  }`}
                >
                  Unit {u.unit_number}: {u.unit_name}
                </button>
              ))}
              <button
                onClick={() => { setSelectedUnit(null); }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  !selectedUnit && !newUnitNumber
                    ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
                    : 'border-border text-text-faint hover:text-text-muted'
                }`}
              >
                + New Unit
              </button>
            </div>
            {!selectedUnit && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-faint mb-1">Unit Number</label>
                  <input
                    type="number"
                    min={1}
                    value={newUnitNumber}
                    onChange={(e) => setNewUnitNumber(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-faint mb-1">Unit Name</label>
                  <input
                    value={newUnitName}
                    onChange={(e) => setNewUnitName(e.target.value)}
                    placeholder="e.g. Introduction to Arrays"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-surface border border-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/40"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative rounded-xl border-2 border-dashed p-12 text-center transition-all duration-200 cursor-pointer
          ${isDragging
            ? 'border-accent-purple bg-accent-purple/5 shadow-[0_0_24px_rgba(187,154,247,0.15)]'
            : 'border-border hover:border-accent-purple/40'}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.pptx,.docx"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-xl bg-gradient-to-br from-accent-purple/10 to-accent-blue/10">
          <span className="text-3xl">📜</span>
        </div>
        <p className="text-base font-medium text-text-primary mb-1">
          Drop scrolls of knowledge here
        </p>
        <p className="text-sm text-text-faint">PDF, PPTX, DOCX — up to 100 MB each</p>
      </div>

      {/* Upload list */}
      {files.length > 0 && (
        <div className="card space-y-3 border border-surface-border">
          <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2"><span>📂</span> Uploaded Scrolls</h3>
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-overlay">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                f.status === 'done' ? 'bg-accent-green/10 text-accent-green'
                  : f.status === 'error' ? 'bg-streak/10 text-streak'
                  : 'bg-accent-blue/10 text-accent-blue'
              }`}>
                {f.status === 'done' ? '✓' : f.status === 'error' ? '!' : '↑'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary truncate">{f.name}</div>
                {f.status === 'uploading' && (
                  <div className="progress-track h-1.5 mt-1">
                    <div className="h-full rounded-full bg-gradient-brand transition-all duration-300" style={{ width: `${f.progress}%` }} />
                  </div>
                )}
                {f.status === 'error' && (
                  <div className="text-xs text-streak mt-0.5">{f.error}</div>
                )}
              </div>
              <span className="text-xs text-text-faint">
                {f.status === 'done' ? 'Complete' : f.status === 'uploading' ? `${f.progress}%` : 'Failed'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Ingestion progress */}
      {ingestion && ingestion.current_step !== 'not_started' && (
        <div className="card border border-accent-blue/20 bg-accent-blue/[0.02]">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2"><span>🤖</span> Ingestion Pipeline</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">
                {stepLabels[ingestion.current_step] ?? ingestion.current_step}
              </span>
              <span className={`text-xs font-semibold ${
                ingestion.status === 'completed' ? 'text-accent-green'
                  : ingestion.status === 'failed' ? 'text-streak'
                  : 'text-accent-blue'
              }`}>
                {ingestion.progress_pct}%
              </span>
            </div>
            <div className="progress-track h-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  ingestion.status === 'completed' ? 'bg-accent-green'
                    : ingestion.status === 'failed' ? 'bg-streak'
                    : 'bg-gradient-brand'
                }`}
                style={{ width: `${ingestion.progress_pct}%` }}
              />
            </div>
            {/* Step indicators */}
            <div className="flex justify-between text-[10px] text-text-faint">
              {['parsing', 'chunking', 'embedding', 'graph_building'].map((step) => {
                const steps = ['parsing', 'chunking', 'embedding', 'graph_building'];
                const currentIdx = steps.indexOf(ingestion.current_step);
                const stepIdx = steps.indexOf(step);
                const isDone = ingestion.status === 'completed' || stepIdx < currentIdx;
                const isCurrent = step === ingestion.current_step;
                return (
                  <span key={step} className={`${isDone ? 'text-accent-green' : isCurrent ? 'text-accent-blue font-semibold' : ''}`}>
                    {step.replace('_', ' ')}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Course Materials */}
      {materials.length > 0 && (
        <div className="card space-y-3 border border-surface-border">
          <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2"><span>📚</span> Realm Library</h3>
          {materials.map((m) => {
            const statusColors: Record<string, string> = {
              UPLOADED: 'bg-accent-blue/10 text-accent-blue',
              PARSING: 'bg-gold/10 text-gold',
              COMPLETED: 'bg-accent-green/10 text-accent-green',
              FAILED: 'bg-streak/10 text-streak',
            };
            const statusIcons: Record<string, string> = {
              UPLOADED: '↑',
              PARSING: '⟳',
              COMPLETED: '✓',
              FAILED: '✗',
            };
            const fileSize = m.file_size >= 1048576
              ? `${(m.file_size / 1048576).toFixed(1)} MB`
              : `${(m.file_size / 1024).toFixed(0)} KB`;
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-overlay">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${statusColors[m.status] ?? ''}`}>
                  {statusIcons[m.status] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary truncate">{m.filename}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-text-faint uppercase">{m.file_type}</span>
                    <span className="text-[10px] text-text-faint">{fileSize}</span>
                    {m.unit_name && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple">
                        Unit {m.unit_number}: {m.unit_name}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[m.status] ?? ''}`}>
                  {m.status}
                </span>
                <button
                  onClick={() => handleDelete(m.id, m.filename)}
                  disabled={deletingId === m.id}
                  className="ml-1 w-7 h-7 rounded-lg flex items-center justify-center text-text-faint hover:text-streak hover:bg-streak/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Delete material"
                >
                  {deletingId === m.id ? '...' : '✕'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Instructions callout */}
      <div className="callout">
        <div className="text-sm font-semibold text-text-primary mb-1 flex items-center gap-2"><span>🗺</span> How the magic works</div>
        <ol className="text-sm text-text-muted space-y-1 list-decimal list-inside">
          <li>Upload scrolls of knowledge (lecture slides, textbooks, notes)</li>
          <li>The AI pipeline parses, chunks, and embeds the content</li>
          <li>A knowledge graph is auto-built from extracted concepts</li>
          <li>AI crafts quests & challenges based on the knowledge graph</li>
        </ol>
      </div>
    </div>
  );
}
