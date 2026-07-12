"use client";

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { openSearchPanel } from "@codemirror/search";
import * as Y from "yjs";
import { yCollab } from "y-codemirror.next";
import { WebsocketProvider } from "y-websocket";
import { WS_BASE } from "@/lib/api";

export default function Editor({
  fileId,
  initialContent = "",
  onChange,
  readOnly = false,
  editorViewRef,
  onConnectionStatusChange,
}: {
  fileId: string;
  initialContent?: string;
  onChange?: (text: string) => void;
  readOnly?: boolean;
  editorViewRef?: React.RefObject<EditorView | null>;
  onConnectionStatusChange?: (connected: boolean) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const onChangeRef = useRef(onChange);
  const onConnectionStatusChangeRef = useRef(onConnectionStatusChange);
  // Seed only — do not put live document text in the effect deps (that remounts on every keystroke).
  const initialContentRef = useRef(initialContent);

  useEffect(() => {
    initialContentRef.current = initialContent;
  }, [initialContent]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onConnectionStatusChangeRef.current = onConnectionStatusChange;
  }, [onConnectionStatusChange]);

  useEffect(() => {
    if (!editorRef.current) return;

    let cancelled = false;
    const seedContent = initialContentRef.current || "";

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

    const onYjsChange = () => {
      if (onChangeRef.current) {
        onChangeRef.current(ytext.toString());
      }
    };

    // Listen to changes deeply from the collaborative text instance directly
    ytext.observe(onYjsChange);

    const collabCompartment = new Compartment();

    // Basic Editor View Setup
    const extensions = [
      basicSetup,
      collabCompartment.of([]), // Start without collaboration extension until synced
      keymap.of([
        {
          key: "Alt-f",
          run: openSearchPanel,
        },
      ]),
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
      extensions.push(EditorView.editable.of(false));
    }

    const state = EditorState.create({
      doc: seedContent || ytext.toString(),
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    viewRef.current = view;
    if (editorViewRef) {
      editorViewRef.current = view;
    }

    // Initial content notify
    if (onChangeRef.current) {
      onChangeRef.current(seedContent || ytext.toString());
    }

    const onStatusChange = ({ status }: { status: string }) => {
      if (onConnectionStatusChangeRef.current) {
        onConnectionStatusChangeRef.current(status === "connected");
      }
    };
    provider.on("status", onStatusChange);

    provider.on("sync", (isSynced: boolean) => {
      if (isSynced && !cancelled) {
        // Seed remote empty docs so first open of a new file keeps local content
        if (ytext.length === 0) {
          const local = view.state.doc.toString();
          const toSeed = local || seedContent;
          if (toSeed) {
            ydoc.transact(() => {
              ytext.insert(0, toSeed);
            });
          }
        }
        view.dispatch({
          effects: collabCompartment.reconfigure(yCollab(ytext, provider.awareness)),
        });
      }
    });

    const connectId = window.setTimeout(() => {
      if (!cancelled) {
        provider.connect();
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(connectId);
      ytext.unobserve(onYjsChange);
      provider.off("status", onStatusChange);
      view.destroy();
      if (editorViewRef) {
        editorViewRef.current = null;
      }
      provider.destroy();
    };
    // Only remount when switching files or read-only mode — never on content edits
  }, [fileId, readOnly, editorViewRef]);

  return <div ref={editorRef} className="h-full w-full text-base [&>.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"></div>;
}
