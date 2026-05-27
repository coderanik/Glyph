"use client";

import React, { useState } from "react";
import { X, Copy, Check, ShieldAlert, Eye, Edit2 } from "lucide-react";
import { apiUrl } from "@/lib/api";

type ShareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  getToken: () => Promise<string | null>;
};

export default function ShareModal({
  isOpen,
  onClose,
  projectId,
  getToken,
}: ShareModalProps) {
  const [permission, setPermission] = useState<"read" | "write">("write");
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError("Session expired. Please log in again.");
        setLoading(false);
        return;
      }

      const res = await fetch(apiUrl(`/projects/${projectId}/share`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permission }),
      });

      if (res.ok) {
        const data = await res.json();
        // Construct standard sharing URL
        const inviteUrl = `${window.location.origin}/projects/share?token=${data.token}`;
        setShareLink(inviteUrl);
      } else {
        const errText = await res.text();
        setError(errText || "Only the project owner can invite collaborators.");
      }
    } catch (err) {
      setError("Failed to reach server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs select-none">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-[420px] bg-bg-primary border border-border-secondary shadow-2xl rounded-xl p-5 z-10 animate-in fade-in zoom-in-95 duration-200 text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-secondary">
          <div>
            <h3 className="text-sm font-semibold tracking-wide">Share Project</h3>
            <p className="text-[11px] text-text-tertiary mt-0.5">Invite others to view or edit this LaTeX project.</p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-4">
          {error && (
            <div className="text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/15 p-2 rounded-md border border-red-200/50 dark:border-red-950/30 flex items-start gap-1.5 leading-relaxed">
              <ShieldAlert size={12} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!shareLink ? (
            <>
              {/* Permission Selection */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                  Collaborator Role
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setPermission("write")}
                    className={`flex flex-col items-center gap-2 p-3 border rounded-lg text-center transition-all cursor-pointer ${
                      permission === "write"
                        ? "border-accent bg-accent-bg ring-1 ring-accent text-accent"
                        : "border-border-secondary bg-bg-secondary hover:bg-bg-primary text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Edit2 size={16} />
                    <div className="text-xs font-semibold">Collaborator</div>
                    <div className="text-[10px] text-text-tertiary">Can view, edit, & compile</div>
                  </button>
                  <button
                    onClick={() => setPermission("read")}
                    className={`flex flex-col items-center gap-2 p-3 border rounded-lg text-center transition-all cursor-pointer ${
                      permission === "read"
                        ? "border-accent bg-accent-bg ring-1 ring-accent text-accent"
                        : "border-border-secondary bg-bg-secondary hover:bg-bg-primary text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Eye size={16} />
                    <div className="text-xs font-semibold">Viewer</div>
                    <div className="text-[10px] text-text-tertiary">Can view & preview only</div>
                  </button>
                </div>
              </div>

              {/* Live Edit Note */}
              <div className="p-2.5 bg-bg-secondary rounded-lg border border-border-secondary flex items-start gap-2">
                <span className="text-xs">⚡</span>
                <p className="text-[10px] text-text-secondary leading-relaxed">
                  <strong>Free Tier limit:</strong> Live collaborative editing is supported for up to 3 active collaborators.
                </p>
              </div>

              {/* Action */}
              <button
                onClick={handleGenerateLink}
                disabled={loading}
                className="w-full h-8 flex items-center justify-center bg-accent hover:bg-accent-hover disabled:bg-bg-secondary text-white disabled:text-text-tertiary text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
              >
                {loading ? "Generating Invitation Link..." : "Create Invite Link"}
              </button>
            </>
          ) : (
            <>
              {/* Shareable link display */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold tracking-wide text-text-secondary uppercase">
                  Invitation Link
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-border-secondary bg-bg-secondary outline-none font-mono text-text-secondary text-ellipsis overflow-hidden select-all"
                  />
                  <button
                    onClick={handleCopy}
                    className="h-8 w-8 rounded-md border border-border-secondary flex items-center justify-center bg-bg-primary hover:bg-bg-secondary transition-colors cursor-pointer"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check size={14} className="text-green-500" />
                    ) : (
                      <Copy size={14} className="text-text-secondary" />
                    )}
                  </button>
                </div>
              </div>

              {/* Reset link creation */}
              <div className="pt-2 flex justify-between gap-2.5">
                <button
                  onClick={() => setShareLink(null)}
                  className="text-[11px] font-semibold text-accent hover:text-accent-hover cursor-pointer"
                >
                  Create another link
                </button>
                <span className="text-[10px] text-text-tertiary font-medium">
                  Role: {permission === "write" ? "Collaborator" : "Viewer"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
