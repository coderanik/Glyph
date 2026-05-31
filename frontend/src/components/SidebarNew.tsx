"use client";

import { useState } from "react";
import {
  FileText,
  Folder,
  ChevronRight,
  ChevronDown,
  Plus,
  Sparkles,
  Send,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { apiUrl } from "@/lib/api";

type SidebarNewProps = {
  isOpen: boolean;
  activeTab: number;
  onTabChange: (tab: number) => void;
  activeActivityItem: number;
  // Project files logic
  projectName: string;
  files: { id: string; name: string; path: string; content?: string }[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileCreate?: () => void;
  // Collaborators logic
  collaborators?: { id: string; name: string; initials: string; color: string; online: boolean }[];
  readOnly?: boolean;
  onInsertText?: (text: string) => void;
  onGetEditorContext?: () => { fileContent: string; selectedText: string };
  onReplaceDocument?: (text: string) => void;
  projectId: string;
};

function parseOutline(content: string) {
  if (!content) return [];
  const list: { name: string; indent: number }[] = [];
  const regex = /\\(section|subsection|subsubsection)\*?\{(.*?)\}/g;
  let match;

  // Strip LaTeX comments
  const cleanContent = content
    .split("\n")
    .map(line => {
      const commentMatch = line.match(/(?<!\\)%/);
      if (commentMatch && commentMatch.index !== undefined) {
        return line.substring(0, commentMatch.index);
      }
      return line;
    })
    .join("\n");

  let sectionCount = 0;
  let subsectionCount = 0;
  let subsubsectionCount = 0;

  while ((match = regex.exec(cleanContent)) !== null) {
    const type = match[1];
    let name = match[2].trim();

    // Clean up LaTeX markup formatting inside headers
    name = name.replace(/\\[a-zA-Z]+\{(.*?)\}/g, "$1");
    name = name.replace(/\$/g, "");

    let indent = 0;
    if (type === "section") {
      sectionCount++;
      subsectionCount = 0;
      subsubsectionCount = 0;
      const hasNumbering = /^[0-9A-Z\.]+[\s\.]/.test(name);
      const prefix = hasNumbering ? "" : `${sectionCount}. `;
      list.push({ name: `${prefix}${name}`, indent });
    } else if (type === "subsection") {
      subsectionCount++;
      subsubsectionCount = 0;
      indent = 1;
      const hasNumbering = /^[0-9A-Z\.]+[\s\.]/.test(name);
      const prefix = hasNumbering ? "" : `${sectionCount}.${subsectionCount} `;
      list.push({ name: `${prefix}${name}`, indent });
    } else if (type === "subsubsection") {
      subsubsectionCount++;
      indent = 2;
      const hasNumbering = /^[0-9A-Z\.]+[\s\.]/.test(name);
      const prefix = hasNumbering ? "" : `${sectionCount}.${subsectionCount}.${subsubsectionCount} `;
      list.push({ name: `${prefix}${name}`, indent });
    }
  }

  return list;
}

export default function SidebarNew({
  isOpen,
  activeTab,
  onTabChange,
  activeActivityItem,
  projectName,
  files = [],
  activeFileId,
  onFileSelect,
  onFileCreate,
  collaborators = [],
  readOnly = false,
  onInsertText,
  onGetEditorContext,
  onReplaceDocument,
  projectId,
}: SidebarNewProps) {
  const [foldersExpanded, setFoldersExpanded] = useState(true);

  if (!isOpen) return null;

  const activeFile = files.find((f) => f.id === activeFileId);
  const dynamicOutline = parseOutline(activeFile?.content || "");

  return (
    <aside className="w-[200px] shrink-0 bg-bg-secondary border-r border-border-secondary flex flex-col overflow-hidden transition-all duration-200 text-text-primary select-none">
      {activeActivityItem === 2 ? (
        /* Dedicated Collaborators Panel */
        <div className="flex-1 flex flex-col min-h-0 py-2">
          <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary border-b border-border-secondary mb-2 pb-2 shrink-0">
            Collaborators
          </div>
          <div className="flex-1 overflow-y-auto">
            {collaborators.map((collab, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:bg-bg-primary transition-colors"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                  style={{ background: collab.color }}
                >
                  {collab.initials}
                </div>
                <span className="truncate flex-1 font-medium">{collab.name}</span>
                {collab.online ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="Online" />
                ) : (
                  <span className="text-[9px] text-text-tertiary shrink-0">Offline</span>
                )}
              </div>
            ))}
            {collaborators.length === 0 && (
              <div className="px-3 text-[10px] text-text-tertiary italic">
                No other collaborators.
              </div>
            )}
          </div>
        </div>
      ) : activeActivityItem === 1 ? (
        /* Dedicated Search Panel */
        <div className="flex-1 flex flex-col py-2">
          <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary border-b border-border-secondary mb-2 pb-2">
            Search
          </div>
          <div className="px-3 text-xs text-text-secondary">
            Use Alt+F (Option+F) to search across the editor.
          </div>
        </div>
      ) : activeActivityItem === 3 ? (
        /* Dedicated History Panel */
        <div className="flex-1 flex flex-col py-2">
          <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary border-b border-border-secondary mb-2 pb-2">
            History
          </div>
          <div className="px-3 text-xs text-text-tertiary italic">
            No revision history available.
          </div>
        </div>
      ) : activeActivityItem === 4 ? (
        /* Dedicated AI Assistant Panel */
        <SidebarAiPanel
          projectId={projectId}
          onInsertText={onInsertText}
          onGetEditorContext={onGetEditorContext}
          onReplaceDocument={onReplaceDocument}
        />
      ) : (
        /* Explorer Tab: original Files and Outline tabs (WITHOUT collaborators at the bottom!) */
        <>
          {/* Tabs */}
          <div className="flex border-b border-border-secondary shrink-0">
            <button
              onClick={() => onTabChange(0)}
              className={`flex-1 h-8 flex items-center justify-center text-[10px] font-medium tracking-wider uppercase transition-colors border-b-2 cursor-pointer ${
                activeTab === 0
                  ? "text-text-primary border-accent"
                  : "text-text-tertiary border-transparent hover:text-text-primary"
              }`}
            >
              Files
            </button>
            <button
              onClick={() => onTabChange(1)}
              className={`flex-1 h-8 flex items-center justify-center text-[10px] font-medium tracking-wider uppercase transition-colors border-b-2 cursor-pointer ${
                activeTab === 1
                  ? "text-text-primary border-accent"
                  : "text-text-tertiary border-transparent hover:text-text-primary"
              }`}
            >
              Outline
            </button>
          </div>

          {/* Files Panel */}
          {activeTab === 0 && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="py-2 shrink-0">
                <div className="px-3 pb-1.5 flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase text-text-tertiary">
                  <span>Project</span>
                  {!readOnly && onFileCreate && (
                    <button
                      onClick={onFileCreate}
                      className="p-0.5 rounded hover:bg-bg-primary hover:text-text-primary transition-colors cursor-pointer"
                      title="Create new file"
                    >
                      <Plus size={10} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setFoldersExpanded(!foldersExpanded)}
                  className="w-full flex items-center gap-1.5 px-3 py-1 text-xs text-text-secondary hover:bg-bg-primary transition-colors cursor-pointer"
                >
                  {foldersExpanded ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                  <Folder size={13} className="text-accent" />
                  <span className="truncate font-medium">{projectName || "thesis-draft"}</span>
                </button>
                {foldersExpanded && (
                  <div className="pl-3 mt-0.5">
                    {files.map((file) => {
                      const isActive = file.id === activeFileId;
                      return (
                        <button
                          key={file.id}
                          onClick={() => onFileSelect(file.id)}
                          className={`w-full flex items-center gap-1.5 px-3 py-1 text-xs transition-all cursor-pointer ${
                            isActive
                              ? "bg-accent-bg text-accent font-semibold"
                              : "text-text-secondary hover:bg-bg-primary"
                          }`}
                        >
                          <FileText size={13} className={isActive ? "text-accent" : "text-text-tertiary"} />
                          <span className="truncate">{file.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Outline Panel */}
          {activeTab === 1 && (
            <div className="flex-1 overflow-y-auto">
              <div className="py-2">
                <div className="px-3 pb-1.5 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary">
                  Structure
                </div>
                {dynamicOutline.map((item, idx) => (
                  <button
                    key={idx}
                    className={`w-full flex items-center gap-1.5 text-xs text-text-secondary hover:bg-bg-primary transition-colors cursor-pointer ${
                      item.indent === 1 ? "pl-6" : item.indent === 2 ? "pl-9" : "pl-3"
                    } py-1 pr-3`}
                  >
                    <FileText size={13} className="text-text-tertiary shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </button>
                ))}
                {dynamicOutline.length === 0 && (
                  <div className="px-3 py-2 text-xs text-text-tertiary italic">
                    No sections found in this file.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  );
}

function SidebarAiPanel({
  projectId,
  onInsertText,
  onGetEditorContext,
  onReplaceDocument,
}: {
  projectId: string;
  onInsertText?: (text: string) => void;
  onGetEditorContext?: () => { fileContent: string; selectedText: string };
  onReplaceDocument?: (text: string) => void;
}) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string; code?: string }[]>([
    {
      sender: "ai",
      text: "Hi! I'm your LaTeX assistant. How can I help you write your document today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;
    
    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text: textToSend }]);
    setInput("");
    setIsTyping(true);

    try {
      const token = await getToken();
      const { fileContent, selectedText } = onGetEditorContext
        ? onGetEditorContext()
        : { fileContent: "", selectedText: "" };

      const response = await fetch(apiUrl(`/projects/${projectId}/ai`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: textToSend,
          fileContent,
          selectedText,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to contact AI server: ${response.statusText}`);
      }

      const data = await response.json();
      
      const aiResponseText = data.text || "";
      
      // Extract the first code block starting with ```latex or ```
      const codeBlockRegex = /```(?:latex|)\n([\s\S]*?)\n```/i;
      const match = aiResponseText.match(codeBlockRegex);
      const aiCode = match ? match[1].trim() : undefined;
      
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: aiResponseText,
          code: aiCode,
        },
      ]);
    } catch (err: any) {
      console.error("AI Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `⚠️ **Error calling AI Assistant:** ${err.message || "Unknown error"}`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const promptTemplates = [
    { label: "Abstract Template", prompt: "Generate a LaTeX abstract template." },
    { label: "Insert Table", prompt: "Write a LaTeX table template using booktabs." },
    { label: "Math Equation", prompt: "Generate an align environment equation." },
    { label: "Fix Image Error", prompt: "How do I fix missing image errors?" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg-secondary text-xs">
      {/* Header */}
      <div className="px-3 py-2 text-[10px] font-semibold tracking-wider uppercase text-text-tertiary border-b border-border-secondary shrink-0 flex items-center gap-1.5">
        <Sparkles size={11} className="text-accent" />
        <span>AI Assistant</span>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-0">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`p-2.5 rounded-lg max-w-[90%] leading-relaxed ${
                msg.sender === "user"
                  ? "bg-accent text-white rounded-tr-none font-medium"
                  : "bg-bg-primary border border-border-secondary text-text-secondary rounded-tl-none"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
              
              {msg.code && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <pre className="bg-[#1e1e1e] text-orange-200 p-2 rounded text-[10px] overflow-x-auto font-mono select-text border border-border-secondary">
                    {msg.code}
                  </pre>
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={() => handleCopy(msg.code!, idx)}
                      className="px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary hover:text-text-primary border border-border-secondary flex items-center gap-1 cursor-pointer text-[9px] transition-colors"
                    >
                      {copiedIndex === idx ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                      <span>{copiedIndex === idx ? "Copied" : "Copy"}</span>
                    </button>
                    {onInsertText && (
                      <button
                        onClick={() => onInsertText(msg.code!)}
                        className="px-1.5 py-0.5 rounded bg-accent text-white hover:bg-accent-hover flex items-center gap-1 cursor-pointer text-[9px] font-semibold transition-colors"
                        title="Insert at cursor or replace selection"
                      >
                        <Plus size={10} />
                        <span>Insert</span>
                      </button>
                    )}
                    {onReplaceDocument && (
                      <button
                        onClick={() => onReplaceDocument(msg.code!)}
                        className="px-1.5 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-1 cursor-pointer text-[9px] font-semibold transition-colors"
                        title="Replace entire document with this code"
                      >
                        <Check size={10} />
                        <span>Replace All</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-1 px-3 py-1.5 text-text-tertiary">
            <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
            <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
            <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
          </div>
        )}
      </div>

      {/* Prompt templates suggestions */}
      {messages.length === 1 && !isTyping && (
        <div className="px-3 pb-2 flex flex-col gap-1.5 shrink-0">
          <p className="text-[10px] text-text-tertiary uppercase font-semibold tracking-wider">Quick Prompts</p>
          <div className="grid grid-cols-2 gap-1.5">
            {promptTemplates.map((tpl, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(tpl.prompt)}
                className="px-2 py-1.5 rounded bg-bg-primary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary text-[10px] border border-border-secondary text-left transition-all cursor-pointer font-medium"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box */}
      <div className="p-2.5 border-t border-border-secondary shrink-0 flex gap-1.5 bg-bg-primary">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
          placeholder="Ask AI..."
          className="flex-1 px-2.5 py-1.5 rounded bg-bg-secondary border border-border-secondary text-text-primary outline-none focus:border-accent text-xs"
        />
        <button
          onClick={() => handleSend(input)}
          disabled={!input.trim() || isTyping}
          className="p-1.5 rounded bg-accent hover:bg-accent-hover disabled:bg-bg-tertiary disabled:text-text-tertiary text-white transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}