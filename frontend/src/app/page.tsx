"use client";

import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import PdfViewer from '@/components/PdfViewer';

const Editor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="flex bg-white dark:bg-zinc-950 h-screen overflow-hidden text-zinc-900 dark:text-zinc-100">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium tracking-tight">
              Thesis Main
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors shadow-sm">
              Compile
            </button>
            <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
              AD
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-hidden flex flex-row">
          
          {/* Editor Pane */}
          <div className="w-1/2 h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
            <div className="flex-1 relative">
              <Editor />
            </div>
          </div>
          
          {/* Renderer Pane */}
          <div className="w-1/2 h-full bg-zinc-50 dark:bg-[#1A1A1A] flex flex-col relative">
            <PdfViewer />
          </div>
          
        </div>
      </main>
    </div>
  );
}
