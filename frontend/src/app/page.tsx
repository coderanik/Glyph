"use client";

import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@/components/Editor'), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <header className="w-full bg-indigo-600 shadow-md p-4 text-white">
        <h1 className="text-2xl font-bold">TeXable Collaborative Editor</h1>
      </header>
      
      <div className="flex flex-1 w-full max-w-6xl p-6 gap-6">
        <section className="flex-1 bg-white shadow-sm p-4 rounded-xl border border-gray-200">
          <h2 className="text-lg font-semibold mb-2">LaTeX Source</h2>
          <div className="h-[600px] border border-gray-300 rounded-lg overflow-hidden relative">
            <Editor />
          </div>
        </section>

        <aside className="w-80 bg-white p-4 shadow-sm rounded-xl border border-gray-200 hidden md:block">
          <h2 className="text-lg font-semibold mb-2">Output Info</h2>
          <p className="text-sm text-gray-500 mb-4">When compiling, the PDF output status will appear here.</p>
          <button className="w-full bg-green-500 text-white font-medium py-2 rounded-lg hover:bg-green-600 transition-colors">
            Compile PDF (Disabled)
          </button>
        </aside>
      </div>
    </main>
  );
}
