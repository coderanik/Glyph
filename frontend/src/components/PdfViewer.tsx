"use client";

import React from 'react';
import { FileText, Loader2 } from 'lucide-react';

type PdfViewerProps = {
  isCompiling?: boolean;
  pdfUrl?: string | null;
  statusMessage?: string | null;
};

export default function PdfViewer({
  isCompiling,
  pdfUrl,
  statusMessage,
}: PdfViewerProps) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-bg-tertiary">
      {statusMessage && !pdfUrl && !isCompiling && (
        <div className="px-4 py-2 text-xs text-amber-700 dark:text-amber-400 border-b border-amber-200/50 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/30 shrink-0">
          {statusMessage}
        </div>
      )}
      {isCompiling ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center animate-pulse">
            <Loader2 className="animate-spin text-accent mb-3" size={36} />
            <p className="font-medium text-sm text-text-secondary tracking-wide">Compiling…</p>
          </div>
        </div>
      ) : pdfUrl ? (
        <iframe
          title="PDF preview"
          src={`${pdfUrl}#toolbar=0&navpanes=0`}
          className="w-full flex-1 min-h-0 border-0 bg-bg-primary"
        />
      ) : (
        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
          <div className="aspect-[1/1.414] w-[400px] sm:w-[500px] lg:w-[600px] max-w-full bg-bg-primary shadow-lg rounded-sm shrink-0 flex items-center justify-center text-text-tertiary select-none border border-border-secondary">
            <div className="flex flex-col items-center">
              <FileText size={36} className="mb-3 opacity-40 text-accent" />
              <p className="font-medium text-sm text-text-secondary tracking-wide">
                Compile to preview PDF
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}