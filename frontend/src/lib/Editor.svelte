<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { EditorState } from '@codemirror/state';
  import * as Y from 'yjs';
  import { yCollab } from 'y-codemirror.next';
  import { WebrtcProvider } from 'y-webrtc';

  let editorContainer: HTMLDivElement;
  let view: EditorView;
  let provider: WebrtcProvider;

  onMount(() => {
    // Basic Yjs document and awareness
    const ydoc = new Y.Doc();
    provider = new WebrtcProvider('texable-demo-room', ydoc);
    const ytext = ydoc.getText('codemirror');

    // Basic Editor View Setup
    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        yCollab(ytext, provider.awareness)
      ]
    });

    view = new EditorView({
      state,
      parent: editorContainer
    });
  });

  onDestroy(() => {
    if (view) view.destroy();
    if (provider) provider.destroy();
  });
</script>

<div class="h-full w-full border border-gray-300 rounded-lg overflow-hidden shadow-sm">
  <div bind:this={editorContainer} class="h-full text-base"></div>
</div>

<style>
  :global(.cm-editor) {
    height: 100%;
  }
  :global(.cm-scroller) {
    overflow: auto;
  }
</style>
