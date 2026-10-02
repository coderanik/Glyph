"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiUrl } from "@/lib/api";
import { logError } from "@/lib/errorLogger";
import { changedNewLines, diffLines, rangesForLines, type DiffRow } from "@/lib/diffLines";

type RevisionSummary = {
  id: string;
  createdAt: string;
  summary: string;
  fileName: string;
};

type RevisionDetail = RevisionSummary & {
  previousContent: string;
  content: string;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPanel({
  projectId,
  fileId,
  liveContent,
  onHighlight,
}: {
  projectId: string;
  fileId: string | null;
  liveContent?: string;
  onHighlight: (ranges: { from: number; to: number }[]) => void;
}) {
  const { getToken } = useAuth();
  const onHighlightRef = useRef(onHighlight);
  const [revisions, setRevisions] = useState<RevisionSummary[]>([]);
  const [loadedFileId, setLoadedFileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RevisionDetail | null>(null);
  const [rows, setRows] = useState<DiffRow[]>([]);

  useEffect(() => {
    onHighlightRef.current = onHighlight;
  }, [onHighlight]);

  const highlightDetail = (data: RevisionDetail, nextRows: DiffRow[], focusLine?: number) => {
    const lineNumbers = focusLine ? [focusLine] : changedNewLines(nextRows);
    const current = liveContent ?? data.content ?? "";
    const ranges = rangesForLines(data.content || "", current, lineNumbers);
    onHighlightRef.current(ranges);
  };

  const [trackedFileId, setTrackedFileId] = useState(fileId);
  if (trackedFileId !== fileId) {
    setTrackedFileId(fileId);
    setSelectedId(null);
    setDetail(null);
    setRows([]);
    setRevisions([]);
    setError(null);
    setLoadedFileId(null);
  }

  const loadRevisions = useCallback(async () => {
    if (!projectId || !fileId) {
      setRevisions([]);
      setLoadedFileId(fileId);
      return;
    }
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(apiUrl(`/projects/${projectId}/files/${fileId}/revisions`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setRevisions(Array.isArray(data) ? data : []);
      setLoadedFileId(fileId);
      setError(null);
    } catch (err) {
      logError("History load failed:", err);
      setError("Couldn't load history.");
      setLoadedFileId(fileId);
    }
  }, [projectId, fileId, getToken]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (!cancelled) await loadRevisions();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadRevisions]);

  useEffect(() => {
    if (!fileId) return;
    const timer = window.setInterval(loadRevisions, 4000);
    return () => window.clearInterval(timer);
  }, [fileId, loadRevisions]);

  const showRevision = async (revision: RevisionSummary, focusLine?: number) => {
    if (!fileId) return;
    setSelectedId(revision.id);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(
        apiUrl(`/projects/${projectId}/files/${fileId}/revisions/${revision.id}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to load revision");
      const data = (await res.json()) as RevisionDetail;
      const nextRows = diffLines(data.previousContent || "", data.content || "");
      setDetail(data);
      setRows(nextRows);
      highlightDetail(data, nextRows, focusLine);
    } catch (err) {
      logError("Revision load failed:", err);
      setError("Couldn't open that change.");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 py-2">
      <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary border-b border-border-secondary mb-2 pb-2 shrink-0">
        History
      </div>
      <div className="overflow-y-auto shrink-0 max-h-[42%]">
        {loadedFileId !== fileId && revisions.length === 0 && !error ? (
          <p className="px-3 text-[11px] text-text-tertiary">Loading history…</p>
        ) : error && revisions.length === 0 ? (
          <p className="px-3 text-[11px] text-red-400">{error}</p>
        ) : revisions.length === 0 ? (
          <p className="px-3 text-[11px] text-text-tertiary leading-relaxed">
            Edits show up here after they are saved, with the date and time of each change.
          </p>
        ) : (
          revisions.map((revision) => {
            const selected = revision.id === selectedId;
            return (
              <button
                key={revision.id}
                type="button"
                onClick={() => showRevision(revision)}
                className={`w-full text-left px-3 py-2 border-l-2 transition-colors cursor-pointer ${
                  selected
                    ? "border-accent bg-bg-primary"
                    : "border-transparent hover:bg-bg-primary"
                }`}
              >
                <div className="text-[11px] font-medium text-text-primary">
                  {formatWhen(revision.createdAt)}
                </div>
                <div className="text-[10px] text-text-tertiary truncate mt-0.5">
                  {revision.fileName} · {revision.summary}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto border-t border-border-secondary mt-2">
        {!detail ? (
          <p className="px-3 py-2 text-[11px] text-text-tertiary">
            Select a change to compare the text before and after it.
          </p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-2 text-[11px] text-text-tertiary">No text difference.</p>
        ) : (
          <div className="font-mono text-[11px] leading-5">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-text-tertiary sticky top-0 bg-bg-secondary">
              {formatWhen(detail.createdAt)}
            </div>
            {rows.map((row, index) => {
              if (row.kind === "gap") {
                return (
                  <div key={`gap-${index}`} className="px-3 text-text-tertiary bg-bg-primary/40">
                    ···
                  </div>
                );
              }
              const lineNo = row.kind === "del" ? row.oldNo : row.newNo;
              const prefix = row.kind === "add" ? "+" : row.kind === "del" ? "−" : " ";
              const tone =
                row.kind === "add"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : row.kind === "del"
                    ? "bg-red-500/15 text-red-300"
                    : "text-text-secondary";
              return (
                <button
                  key={`${row.kind}-${index}`}
                  type="button"
                  className={`w-full text-left px-2 flex gap-2 ${tone} hover:brightness-125`}
                  onClick={() => {
                    if (!detail || row.kind === "del") return;
                    highlightDetail(detail, rows, row.newNo);
                  }}
                >
                  <span className="w-8 shrink-0 text-right text-text-tertiary">{lineNo}</span>
                  <span className="w-3 shrink-0">{prefix}</span>
                  <span className="whitespace-pre">{row.text || " "}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
