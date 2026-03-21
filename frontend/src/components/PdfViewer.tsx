import React from 'react';
import { FileText, Download, Maximize, ZoomIn, ZoomOut } from 'lucide-react';

export default function PdfViewer() {
  return (
    <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-[#1A1A1A]">
      {/* Toolbar */}
      <div className="h-12 flex items-center justify-between px-4 bg-zinc-100 dark:bg-[#111111] border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center space-x-1 text-zinc-600 dark:text-zinc-400">
          <button className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-medium content-center">100%</span>
          <button className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors">
            <ZoomIn size={16} />
          </button>
        </div>
        
        <div className="flex items-center space-x-1 text-zinc-600 dark:text-zinc-400">
          <button className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors">
            <Download size={16} />
          </button>
          <button className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors">
            <Maximize size={16} />
          </button>
        </div>
      </div>
      
      {/* Document Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-zinc-50 dark:bg-[#1A1A1A]">
        <div className="aspect-[1/1.414] w-[400px] sm:w-[500px] lg:w-[600px] max-w-full bg-white dark:bg-[#222222] shadow shrink-0 flex items-center justify-center text-zinc-400 dark:text-zinc-500 select-none border border-zinc-200 dark:border-zinc-800/80 transition-all duration-300">
          <div className="flex flex-col items-center">
            <FileText size={36} className="mb-3 opacity-40 text-green-600" />
            <p className="font-medium text-sm text-zinc-500 tracking-wide">Blank Preview</p>
          </div>
        </div>
      </div>
    </div>
  );
}
