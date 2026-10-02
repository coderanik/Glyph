"use client";

import { useEffect } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="dash-modal-overlay" onClick={() => { if (!busy) onCancel(); }}>
      <div
        className="dash-modal dash-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dash-confirm-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h2 id="dash-confirm-title" className="dash-modal-title">{title}</h2>
          <p className="dash-modal-desc">{message}</p>
        </div>
        <div className="dash-modal-actions">
          <button
            type="button"
            className="dash-modal-btn dash-modal-btn-cancel"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`dash-modal-btn ${tone === "danger" ? "dash-confirm-btn-danger" : "dash-modal-btn-create"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
