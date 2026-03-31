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
    <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-zinc-100 dark:bg-[#1A1A1A]">
      {statusMessage && !pdfUrl && !isCompiling && (
        <div className="px-4 py-2 text-xs text-amber-700 dark:text-amber-400 border-b border-amber-200/50 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/30 shrink-0">
          {statusMessage}
        </div>
      )}
      {isCompiling ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center animate-pulse">
            <Loader2 className="animate-spin text-green-600 mb-3" size={36} />
            <p className="font-medium text-sm text-zinc-500 tracking-wide">Compiling…</p>
          </div>
        </div>
      ) : pdfUrl ? (
        <iframe
          title="PDF preview"
          src={pdfUrl}
          className="w-full flex-1 min-h-0 border-0 bg-white dark:bg-zinc-900"
        />
      ) : (
        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
          <div className="aspect-[1/1.414] w-[400px] sm:w-[500px] lg:w-[600px] max-w-full bg-white dark:bg-[#222222] shadow-lg rounded-sm shrink-0 flex items-center justify-center text-zinc-400 dark:text-zinc-500 select-none border border-zinc-200 dark:border-zinc-800/80">
            <div className="flex flex-col items-center">
              <FileText size={36} className="mb-3 opacity-40 text-green-600" />
              <p className="font-medium text-sm text-zinc-500 tracking-wide">
                Compile to preview PDF
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}