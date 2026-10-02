'use client';

import { useToastStore } from '@/stores/toast';

const typeStyles = {
  success: 'bg-accent-green/15 border-accent-green/30 text-accent-green',
  error: 'bg-red-500/15 border-red-500/30 text-red-400',
  info: 'bg-accent-blue/15 border-accent-blue/30 text-accent-blue',
};

const typeIcons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-fade-in min-w-[280px] max-w-[420px] ${typeStyles[toast.type]}`}
        >
          <span className="text-base font-bold shrink-0">{typeIcons[toast.type]}</span>
          <span className="text-sm font-medium flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-xs opacity-60 hover:opacity-100 shrink-0 ml-2"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
