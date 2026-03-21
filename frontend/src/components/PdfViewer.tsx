import React from 'react';
import { FileText, Download, Maximize, ZoomIn, ZoomOut } from 'lucide-react';

export default function PdfViewer() {
  return (
    <div className="flex flex-col h-full w-full bg-zinc-100 dark:bg-[#1E1E1E]">
      {/* Toolbar */}
      <div className="h-10 flex items-center justify-between px-4 bg-zinc-200 dark:bg-[#2D2D2D] border-b border-zinc-300 dark:border-zinc-700 shrink-0">
        <div className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-400">
          <button className="p-1 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded">
            <ZoomOut size={16} />
          </button>
          <span className="text-xs font-medium content-center">100%</span>
          <button className="p-1 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded">
            <ZoomIn size={16} />
          </button>
        </div>
        
        <div className="flex items-center space-x-2 text-zinc-600 dark:text-zinc-400">
          <button className="p-1 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded">
            <Download size={16} />
          </button>
          <button className="p-1 hover:bg-zinc-300 dark:hover:bg-zinc-600 rounded">
            <Maximize size={16} />
          </button>
        </div>
      </div>
      
      {/* Document Canvas */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-zinc-100 dark:bg-[#1E1E1E]">
        <div className="aspect-[1/1.414] w-[400px] sm:w-[500px] lg:w-[600px] max-w-full bg-white shadow-2xl shrink-0 flex items-center justify-center text-zinc-400 dark:text-zinc-300 select-none border border-zinc-200 dark:border-zinc-800 transition-all duration-300 rounded-sm">
          <div className="flex flex-col items-center">
            <FileText size={48} className="mb-4 opacity-50 text-indigo-500" />
            <p className="font-semibold text-lg text-zinc-600 dark:text-zinc-400">Compiled PDF preview</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">Click "Compile PDF" to generate</p>
          </div>
        </div>
      </div>
    </div>
  );
}
