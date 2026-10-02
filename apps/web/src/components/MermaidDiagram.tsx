'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    darkMode: true,
    background: '#1a1b26',
    primaryColor: '#7aa2f7',
    primaryTextColor: '#c0caf5',
    primaryBorderColor: '#565f89',
    lineColor: '#565f89',
    secondaryColor: '#bb9af7',
    tertiaryColor: '#2a2b3d',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '14px',
    nodeBorder: '#565f89',
    clusterBkg: '#24283b',
    clusterBorder: '#414868',
    titleColor: '#c0caf5',
    edgeLabelBackground: '#1a1b26',
  },
  flowchart: {
    htmlLabels: true,
    curve: 'basis',
    padding: 12,
    nodeSpacing: 40,
    rankSpacing: 60,
  },
  securityLevel: 'strict',
});

interface MermaidDiagramProps {
  code: string;
}

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    const id = `mermaid-${Date.now()}`;

    (async () => {
      try {
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) {
          setSvgContent(svg);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? 'Failed to render diagram');
          setSvgContent('');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-400/30">
        <p className="text-sm text-red-400 font-medium mb-2">Diagram render error</p>
        <pre className="text-xs text-text-faint whitespace-pre-wrap">{error}</pre>
        <details className="mt-3">
          <summary className="text-xs text-text-faint cursor-pointer hover:text-text-muted">Show raw Mermaid code</summary>
          <pre className="mt-2 text-xs text-text-faint whitespace-pre-wrap bg-surface-overlay rounded p-3 overflow-auto max-h-60">{code}</pre>
        </details>
      </div>
    );
  }

  if (!svgContent) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="overflow-auto rounded-lg bg-surface-card border border-surface-border p-4"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
