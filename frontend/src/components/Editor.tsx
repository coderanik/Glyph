"use client";

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import * as Y from "yjs";
import { yCollab } from "y-codemirror.next";
import { WebsocketProvider } from "y-websocket";
import { WS_BASE } from "@/lib/api";

export default function Editor({
  fileId,
  onChange,
  readOnly = false,
}: {
  fileId: string;
  onChange?: (text: string) => void;
  readOnly?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editorRef.current) return;

    let cancelled = false;

    // Basic Yjs document and awareness
    const ydoc = new Y.Doc();
    
    // y-websocket URL = serverUrl + "/" + roomname (see y-websocket.js). Backend route is /ws/:file_id (UUID).
    const serverUrl = (
      process.env.NEXT_PUBLIC_WS_URL ?? WS_BASE
    ).replace(/\/$/, "");
    // connect:false + delayed connect: React Strict Mode runs mount/cleanup/mount; immediate connect is torn down before open.
    const provider = new WebsocketProvider(
      serverUrl,
      `ws/${fileId}`,
      ydoc,
      { connect: false, disableBc: true }
    );
    providerRef.current = provider;
    
    const ytext = ydoc.getText("codemirror");

    // Listen to changes deeply from the collaborative text instance directly
    ytext.observe(() => {
      if (onChangeRef.current) {
        onChangeRef.current(ytext.toString());
      }
    });

    // Basic Editor View Setup
    const extensions = [
      basicSetup,
      yCollab(ytext, provider.awareness)
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
      extensions.push(EditorView.editable.of(false));
    }

    const state = EditorState.create({
      doc: ytext.toString(),
      extensions
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    viewRef.current = view;

    // Initial content notify
    if (onChangeRef.current) {
      onChangeRef.current(ytext.toString());
    }

    const connectId = window.setTimeout(() => {
      if (!cancelled) {
        provider.connect();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(connectId);
      view.destroy();
      provider.destroy();
    };
  }, [fileId]);

  return <div ref={editorRef} className="h-full w-full text-base [&>.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"></div>;
}
