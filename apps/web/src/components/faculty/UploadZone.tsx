'use client';

import { useState, useCallback } from 'react';
import { uploadMaterials } from '@/lib/api/courses';
import { useAuthStore } from '@/stores/auth';

interface UploadZoneProps {
  courseId: string;
  onUploadComplete?: (filename: string) => void;
}

export function UploadZone({ courseId, onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.token);

  const doUpload = useCallback(
    async (file: File) => {
      if (!token) {
        setError('Not authenticated');
        return;
      }

      setUploading(true);
      setProgress(0);
      setError(null);

      // Simulate progress while the upload is in flight
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 10 : prev));
      }, 300);

      try {
        await uploadMaterials(courseId, file, token);
        clearInterval(interval);
        setProgress(100);
        onUploadComplete?.(file.name);
      } catch (e) {
        clearInterval(interval);
        setError(e instanceof Error ? e.message : 'Upload failed');
      } finally {
        setTimeout(() => {
          setUploading(false);
          setProgress(0);
        }, 1000);
      }
    },
    [courseId, token, onUploadComplete],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (!file) return;
      await doUpload(file);
    },
    [doUpload],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await doUpload(file);
      e.target.value = '';
    },
    [doUpload],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => {
        if (!uploading) document.getElementById('upload-input')?.click();
      }}
      className={`
        relative rounded-xl border-2 border-dashed p-12 text-center transition-all duration-200
        ${isDragging
          ? 'border-accent-blue bg-accent-blue/5 shadow-[0_0_24px_rgba(122,162,247,0.1)]'
          : 'border-border hover:border-text-faint'}
        ${uploading ? 'pointer-events-none' : 'cursor-pointer'}
      `}
    >
      <input
        id="upload-input"
        type="file"
        accept=".pdf,.pptx,.docx,.mp4,.mp3,.txt"
        className="hidden"
        onChange={handleFileSelect}
      />
      {uploading ? (
        <div className="animate-fade-in">
          <div className="progress-track h-3 mb-3">
            <div
              className="h-full rounded-full bg-gradient-brand transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-text-muted">Uploading... {progress}%</p>
        </div>
      ) : (
        <>
          <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl
                          bg-accent-blue/10 text-accent-blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-base font-medium text-text-primary mb-1">
            Drag & drop course materials
          </p>
          <p className="text-sm text-text-faint">PDF, PPTX, DOCX, MP4, MP3</p>
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
