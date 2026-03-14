<script lang="ts">
  import Editor from './lib/Editor.svelte';
</script>

<main class="min-h-screen bg-gray-50 flex flex-col items-center">
  <header class="w-full bg-indigo-600 shadow-md p-4 text-white">
    <h1 class="text-2xl font-bold">TeXable Collaborative Editor</h1>
  </header>
  
  <div class="flex flex-1 w-full max-w-6xl p-6 gap-6">
    <section class="flex-1 bg-white shadow-sm p-4 rounded-xl border border-gray-200">
      <h2 class="text-lg font-semibold mb-2">LaTeX Source</h2>
      <div class="h-[600px]">
        <Editor />
      </div>
    </section>

    <aside class="w-80 bg-white p-4 shadow-sm rounded-xl border border-gray-200 hidden md:block">
      <h2 class="text-lg font-semibold mb-2">Output Info</h2>
      <p class="text-sm text-gray-500 mb-4">When compiling, the PDF output status will appear here.</p>
      <button class="w-full bg-green-500 text-white font-medium py-2 rounded-lg hover:bg-green-600 transition-colors">
        Compile PDF (Disabled)
      </button>
    </aside>
  </div>
</main>
