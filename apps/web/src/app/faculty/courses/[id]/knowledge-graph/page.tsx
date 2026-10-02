'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { getKnowledgeGraph, getCourseUnits, deleteKnowledgeGraph, getKnowledgeGraphMermaid } from '@/lib/api/courses';

const MermaidDiagram = dynamic(() => import('@/components/MermaidDiagram'), { ssr: false });

interface CourseUnit {
  unit_number: number;
  unit_name: string;
}

interface KGNode {
  id: string;
  name?: string;
  label?: string;
  difficulty?: number;
  unit_number?: number;
  unit_name?: string;
  [key: string]: unknown;
}

interface KGEdge {
  source: string;
  target: string;
  relationship?: string;
  [key: string]: unknown;
}

export default function KnowledgeGraphPage() {
  const params = useParams();
  const courseId = params.id as string;
  const token = useAuthStore((s) => s.token);
  const [nodes, setNodes] = useState<KGNode[]>([]);
  const [edges, setEdges] = useState<KGEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<KGNode | null>(null);
  const [units, setUnits] = useState<CourseUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const addToast = useToastStore((s) => s.addToast);

  // View mode: list (old) vs graph (mermaid)
  type ViewMode = 'graph' | 'list';
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [mermaidCode, setMermaidCode] = useState<string>('');
  const [mermaidLoading, setMermaidLoading] = useState(false);

  useEffect(() => {
    if (!token || !courseId) return;
    getCourseUnits(courseId, token).then((data) => setUnits(data.units ?? [])).catch(() => {});
  }, [token, courseId]);

  useEffect(() => {
    if (!token || !courseId) return;
    setLoading(true);
    getKnowledgeGraph(courseId, token, selectedUnit ?? undefined)
      .then((data) => {
        setNodes((data.nodes ?? []) as KGNode[]);
        setEdges((data.edges ?? []) as KGEdge[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, courseId, selectedUnit]);

  // Fetch mermaid when graph view is active and data changes
  const fetchMermaid = (forceRegenerate = false) => {
    if (!token || !courseId || nodes.length === 0) return;
    setMermaidLoading(true);
    getKnowledgeGraphMermaid(courseId, token, selectedUnit ?? undefined, forceRegenerate)
      .then((data) => setMermaidCode(data.mermaid_code ?? ''))
      .catch(() => {
        addToast('Failed to generate diagram', 'error');
        setMermaidCode('');
      })
      .finally(() => setMermaidLoading(false));
  };

  useEffect(() => {
    if (viewMode !== 'graph' || loading) return;
    fetchMermaid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, token, courseId, selectedUnit, loading, nodes.length]);

  if (loading) {
    return (
      <div className="card text-center py-16 border border-accent-purple/10">
        <div className="text-2xl mb-3 animate-pulse">🕸️</div>
        <p className="text-text-muted">Weaving the knowledge web...</p>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="card text-center py-16 border border-dashed border-surface-border">
        <div className="text-4xl mb-4">🕸️</div>
        <p className="text-text-muted mb-1 font-medium">No knowledge web yet</p>
        <p className="text-sm text-text-faint mb-4">Upload scrolls of knowledge to auto-weave the concept graph</p>
        <Link href={`/faculty/courses/${courseId}/upload`} className="btn-primary text-xs px-4 py-2 inline-flex items-center gap-1.5">
          <span>📦</span> Upload Materials
        </Link>
      </div>
    );
  }

  // Build adjacency for list view rendering
  const nodeConnections = nodes.map((node) => {
    const incoming = edges.filter((e) => e.target === node.id);
    const outgoing = edges.filter((e) => e.source === node.id);
    return { ...node, incoming, outgoing, totalEdges: incoming.length + outgoing.length };
  });
  nodeConnections.sort((a, b) => b.totalEdges - a.totalEdges);

  return (
    <div className="space-y-6">
      {/* Summary + View Toggle */}
      <div className="flex gap-4">
        <div className="card flex-1 text-center border border-accent-blue/10 bg-accent-blue/[0.02]">
          <div className="text-lg mb-1">🧠</div>
          <div className="text-2xl font-bold text-accent-blue tabular-nums">{nodes.length}</div>
          <div className="text-xs text-text-faint">Concepts</div>
        </div>
        <div className="card flex-1 text-center border border-accent-purple/10 bg-accent-purple/[0.02]">
          <div className="text-lg mb-1">🔗</div>
          <div className="text-2xl font-bold text-accent-purple tabular-nums">{edges.length}</div>
          <div className="text-xs text-text-faint">Relationships</div>
        </div>

        {/* View toggle */}
        <div className="card flex-none flex items-center gap-1">
          <button
            onClick={() => setViewMode('graph')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'graph'
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'text-text-faint hover:text-text-muted'
            }`}
          >
            🔀 Graph
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'list'
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'text-text-faint hover:text-text-muted'
            }`}
          >
            📋 List
          </button>
        </div>

        {/* Delete All */}
        <div className="card flex-none flex items-center">
          {confirmDeleteAll ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Delete all concepts?</span>
              <button
                onClick={async () => {
                  if (!token) return;
                  setDeleting(true);
                  try {
                    const result = await deleteKnowledgeGraph(courseId, token);
                    setConfirmDeleteAll(false);
                    setDeleting(false);
                    setNodes([]);
                    setEdges([]);
                    setSelectedNode(null);
                    setMermaidCode('');
                    addToast(`Knowledge graph deleted (${result.deleted_count} concepts removed)`, 'success');
                  } catch {
                    setDeleting(false);
                    addToast('Failed to delete knowledge graph', 'error');
                  }
                }}
                disabled={deleting}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm'}
              </button>
              <button onClick={() => setConfirmDeleteAll(false)} className="text-xs text-text-faint hover:text-text-muted">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              className="text-xs px-4 py-2 rounded-lg border border-border text-text-faint hover:text-red-400 hover:border-red-400/30 transition-colors"
            >
              Delete All
            </button>
          )}
        </div>
      </div>

      {/* Unit Filter */}
      {units.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-faint">Filter by Unit:</span>
          <button
            onClick={() => setSelectedUnit(null)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              selectedUnit === null
                ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30'
                : 'border-border text-text-faint hover:text-text-muted'
            }`}
          >
            All Units
          </button>
          {units.map((u) => (
            <button
              key={u.unit_number}
              onClick={() => setSelectedUnit(u.unit_number)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                selectedUnit === u.unit_number
                  ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/30'
                  : 'border-border text-text-faint hover:text-text-muted'
              }`}
            >
              Unit {u.unit_number}: {u.unit_name}
            </button>
          ))}
        </div>
      )}

      {/* ===== Graph View (Mermaid) ===== */}
      {viewMode === 'graph' && (
        <div className="space-y-4">
          {mermaidLoading ? (
            <div className="card text-center py-16 border border-accent-blue/10">
              <div className="relative h-12 w-12 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-accent-blue/20" />
                <div className="absolute inset-0 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center text-lg">🤖</span>
              </div>
              <p className="text-sm text-text-muted font-medium">🤖 AI is weaving the diagram...</p>
              <p className="text-xs text-text-faint mt-1">Using LLM to create a clean visual layout</p>
            </div>
          ) : mermaidCode ? (
            <>
              <div className="flex justify-end">
                <button
                  onClick={() => fetchMermaid(true)}
                  disabled={mermaidLoading}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-faint hover:text-accent-blue hover:border-accent-blue/30 transition-colors disabled:opacity-50"
                >
                  🔄 Regenerate
                </button>
              </div>
              <MermaidDiagram code={mermaidCode} />
              <details className="card !p-0">
                <summary className="px-5 py-3 text-xs text-text-faint cursor-pointer hover:text-text-muted">
                  View raw Mermaid code
                </summary>
                <pre className="px-5 pb-3 text-xs text-text-faint whitespace-pre-wrap font-mono overflow-auto max-h-60">{mermaidCode}</pre>
              </details>
            </>
          ) : (
            <div className="card text-center py-12">
              <p className="text-sm text-text-faint">No diagram available</p>
            </div>
          )}
        </div>
      )}

      {/* ===== List View (original) ===== */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Concept list */}
          <div className="lg:col-span-2 card !p-0 overflow-hidden border border-surface-border">
            <div className="px-5 py-3 border-b border-surface-border flex items-center gap-2">
              <span>🧠</span>
              <h3 className="text-sm font-semibold text-text-primary">Concept Nodes</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {nodeConnections.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`w-full text-left px-5 py-3 border-b border-surface-border transition-colors
                    hover:bg-surface-overlay ${selectedNode?.id === node.id ? 'bg-surface-overlay border-l-2 border-l-accent-blue' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">{node.name ?? node.label ?? node.id}</span>
                    <div className="flex items-center gap-2">
                      {node.unit_name && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple">
                          U{node.unit_number}
                        </span>
                      )}
                      <span className="text-[10px] text-text-faint">{node.totalEdges} connections</span>
                    </div>
                  </div>
                  {node.difficulty && (
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`w-1 h-2 rounded-sm ${i <= (node.difficulty ?? 0) ? 'bg-accent-blue' : 'bg-surface-overlay'}`} />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div className="card">
            {selectedNode ? (
              <div className="animate-fade-in">
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  {selectedNode.name ?? selectedNode.label ?? selectedNode.id}
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="label-overline mb-1">Prerequisites</div>
                    {edges.filter((e) => e.target === selectedNode.id).length === 0 ? (
                      <p className="text-xs text-text-faint">None (root concept)</p>
                    ) : (
                      <div className="space-y-1">
                        {edges.filter((e) => e.target === selectedNode.id).map((e, i) => {
                          const src = nodes.find((n) => n.id === e.source);
                          return (
                            <div key={i} className="text-xs text-text-muted flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
                              {src?.name ?? src?.label ?? e.source}
                              <span className="text-text-faint">({e.relationship ?? 'prerequisite'})</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="label-overline mb-1">Leads To</div>
                    {edges.filter((e) => e.source === selectedNode.id).length === 0 ? (
                      <p className="text-xs text-text-faint">None (leaf concept)</p>
                    ) : (
                      <div className="space-y-1">
                        {edges.filter((e) => e.source === selectedNode.id).map((e, i) => {
                          const tgt = nodes.find((n) => n.id === e.target);
                          return (
                            <div key={i} className="text-xs text-text-muted flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                              {tgt?.name ?? tgt?.label ?? e.target}
                              <span className="text-text-faint">({e.relationship ?? 'prerequisite'})</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-text-faint">Select a concept to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
