"use client";

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import * as Y from "yjs";
import { yCollab } from "y-codemirror.next";
import { WebrtcProvider } from "y-webrtc";

export default function Editor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Basic Yjs document and awareness
    const ydoc = new Y.Doc();
    const provider = new WebrtcProvider("texable-demo-room", ydoc);
    providerRef.current = provider;
    
    const ytext = ydoc.getText("codemirror");

    // Basic Editor View Setup
    const state = EditorState.create({
      doc: ytext.toString(),
      extensions: [
        basicSetup,
        yCollab(ytext, provider.awareness)
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
