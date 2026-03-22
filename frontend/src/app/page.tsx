"use client";

import { useState, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import PdfViewer from '@/components/PdfViewer';
import UserDropdown from '@/components/UserDropdown';

const Editor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
});

export default function Home() {
  const [isCompiling, setIsCompiling] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const runCompile = useCallback(() => {
    setIsCompiling(true);
    // Simulate compilation time
    setTimeout(() => {
      setIsCompiling(false);
    }, 1200);
  }, []);

  const handleEditorChange = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      runCompile();
    }, 400); // Wait 400ms after user stops typing to trigger compile
  }, [runCompile]);

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
            <button 
              onClick={runCompile}
              className={`px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors shadow-sm ${isCompiling ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isCompiling}
            >
              Compile
            </button>
            <UserDropdown />
          </div>
        </header>
        
        <div className="flex-1 overflow-hidden flex flex-row">
          
          {/* Editor Pane */}
          <div className="w-1/2 h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col">
            <div className="flex-1 relative">
              <Editor onChange={handleEditorChange} />
            </div>
          </div>
          
          {/* Renderer Pane */}
          <div className="w-1/2 h-full bg-zinc-50 dark:bg-[#1A1A1A] flex flex-col relative">
            <PdfViewer isCompiling={isCompiling} />
          </div>
          
        </div>
      </main>
    </div>
  );
}
