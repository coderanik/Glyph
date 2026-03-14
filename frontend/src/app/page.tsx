"use client";

import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';

const Editor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="flex bg-gray-50 dark:bg-black h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-950">
        <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-tight">
              Current Project: <span className="text-indigo-600 dark:text-indigo-400">Thesis Main</span>
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm">
              Compile PDF
            </button>
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
              AD
            </div>
          </div>
        </header>
        
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full bg-white dark:bg-gray-900 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
            <div className="flex-1 relative">
              <Editor />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
