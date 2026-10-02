"use client";

export type ToastItem = {
  id: number;
  message: string;
  tone: "success" | "error";
};

export default function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="dash-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={`dash-toast dash-toast-${toast.tone}`}
          onClick={() => onDismiss(toast.id)}
        >
          <span className="dash-toast-mark" aria-hidden="true">
            {toast.tone === "success" ? "✓" : "!"}
          </span>
          <span>{toast.message}</span>
        </button>
      ))}
    </div>
  );
}
