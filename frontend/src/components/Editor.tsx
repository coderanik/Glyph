"use client";

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import * as Y from "yjs";
import { yCollab } from "y-codemirror.next";
import { WebsocketProvider } from "y-websocket";

export default function Editor({ onChange }: { onChange?: () => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current) return;

    // Basic Yjs document and awareness
    const ydoc = new Y.Doc();
    
    // Connect to backend WebSocket for synchronization
    // Using a placeholder project ID for now (demo-project)
    const backendUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000/ws/demo-project";
    const provider = new WebsocketProvider(backendUrl, "", ydoc);
    providerRef.current = provider;
    
    const ytext = ydoc.getText("codemirror");

    // Basic Editor View Setup
    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        yCollab(ytext, provider.awareness),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChangeRef.current) {
            onChangeRef.current();
          }
        })
      ]
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      provider.destroy();
    };
  }, []);

  return <div ref={editorRef} className="h-full w-full text-base [&>.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"></div>;
}
