"use client";

import React, { useEffect, useState } from "react";
import { FileText } from "lucide-react";

type LatexHtmlPreviewProps = {
  code: string;
};

export default function LatexHtmlPreview({ code }: LatexHtmlPreviewProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function parseLatex() {
      if (!code) {
        if (active) setHtmlContent("");
        return;
      }

      try {
        // Dynamically import latex.js on the client to prevent SSR window issues
        const { parse, HtmlGenerator } = await import("latex.js");

        const generator = new HtmlGenerator({ hyphenate: false });
        try {
          // Pre-process the code to strip out commands that latex.js can't handle.
          // The full original code stays in the database for the server's real LaTeX compiler.

          // 1. Replace unknown document classes with 'article' (latex.js only knows article, report, book, letter)
          const knownClasses = ['article', 'report', 'book', 'letter'];
          let cleanedCode = code.replace(
            /\\documentclass(?:\[[^\]]*\])?\{([^\}]*)\}/g,
            (_match, cls) => {
              const baseClass = cls.trim().toLowerCase();
              if (knownClasses.includes(baseClass)) return _match;
              // Preserve any options but swap the class to article
              return _match.replace(`{${cls}}`, '{article}');
            }
          );

          // 2. Strip \usepackage calls (dynamic module loading crashes)
          cleanedCode = cleanedCode.replace(/\\usepackage(?:\[[^\]]*\])?\{[^\}]*\}/g, '% [Live preview: package bypassed]');

          // 3. Strip other unsupported preamble commands that crash the parser
          cleanedCode = cleanedCode.replace(/\\geometry\{[^\}]*\}/g, '% [Live preview: geometry bypassed]');
          cleanedCode = cleanedCode.replace(/\\newcommand\{[^\}]*\}(?:\[[^\]]*\])?\{[^\}]*\}/g, '% [Live preview: newcommand bypassed]');
          cleanedCode = cleanedCode.replace(/\\setlength\{[^\}]*\}\{[^\}]*\}/g, '% [Live preview: setlength bypassed]');
          cleanedCode = cleanedCode.replace(/\\pagestyle\{[^\}]*\}/g, '% [Live preview: pagestyle bypassed]');

          parse(cleanedCode, { generator });
          const doc = generator.htmlDocument();
          
          // Inject stylesheet links for beautiful document layout styling
          const head = doc.head;

          // base.css (standard LaTeX.js formatting)
          const baseLink = doc.createElement("link");
          baseLink.rel = "stylesheet";
          baseLink.href = "https://cdn.jsdelivr.net/npm/latex.js@0.12.6/dist/css/base.css";
          baseLink.setAttribute("onerror", "this.onerror=null;this.href='/css/latex/base.css';");
          head.appendChild(baseLink);
 
          // article.css (standard paper document class layout style)
          const articleLink = doc.createElement("link");
          articleLink.rel = "stylesheet";
          articleLink.href = "https://cdn.jsdelivr.net/npm/latex.js@0.12.6/dist/css/article.css";
          articleLink.setAttribute("onerror", "this.onerror=null;this.href='/css/latex/article.css';");
          head.appendChild(articleLink);
 
          // katex.css (LaTeX math rendering formulas)
          const katexLink = doc.createElement("link");
          katexLink.rel = "stylesheet";
          katexLink.href = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css";
          katexLink.setAttribute("onerror", "this.onerror=null;this.href='/css/latex/katex.css';");
          head.appendChild(katexLink);

          // Customize style rules to match Inter sans-serif typeface and page padding
          const customStyle = doc.createElement("style");
          customStyle.textContent = `
            body {
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 3rem 2rem;
              max-width: 760px;
              margin: 0 auto;
              color: #1f2937;
              line-height: 1.625;
              background-color: #ffffff;
              box-shadow: 0 0 1px rgba(0,0,0,0.05);
            }
            .katex {
              font-size: 1.05em;
            }
            /* Clean up system headings or lists */
            h1, h2, h3, h4 {
              color: #111827;
              font-weight: 700;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
          `;
          head.appendChild(customStyle);

          if (active) {
            setHtmlContent(doc.documentElement.outerHTML);
            setError(null);
          }
        } catch (parseErr: unknown) {
          if (active) {
            setError(parseErr instanceof Error ? parseErr.message : "Failed to parse LaTeX syntax.");
          }
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Latex.js load failed.");
        }
      }
    }

    // Debounce compilation to limit browser overhead on consecutive keystrokes
    const timer = setTimeout(() => {
      parseLatex();
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [code]);

  if (error) {
    return (
      <div className="flex-1 overflow-auto bg-amber-50/40 p-6 flex items-center justify-center border-t border-amber-100">
        <div className="max-w-md w-full p-5 bg-white rounded-lg border border-amber-200 shadow-sm animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs tracking-wide uppercase mb-2">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Live Parser Warning
          </div>
          <p className="text-[11px] text-text-secondary font-mono bg-bg-tertiary p-3 rounded border border-border-secondary overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {error}
          </p>
          <p className="text-[10px] text-text-tertiary mt-3 leading-normal">
            Note: Standard PDF Compile is recommended to compile the full document or check syntax errors.
          </p>
        </div>
      </div>
    );
  }

  if (!htmlContent) {
    if (!code || !code.trim()) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-tertiary text-center">
          <div className="max-w-xs w-full p-5 bg-white rounded-xl border border-border-secondary shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="w-10 h-10 rounded-full bg-accent-bg flex items-center justify-center text-accent mx-auto mb-3">
              <FileText size={18} />
            </div>
            <h3 className="font-semibold text-[13px] text-text-primary mb-1">Empty Document</h3>
            <p className="text-[11px] text-text-secondary leading-relaxed mb-0">
              Type LaTeX in the editor (e.g. <code className="bg-bg-secondary px-1 py-0.5 rounded text-accent font-mono text-[10px]">\documentclass&#123;article&#125;</code>) to render it instantly.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-bg-tertiary">
        <div className="flex flex-col items-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-3" />
          <p className="font-medium text-xs text-text-secondary tracking-wide">Parsing document...</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      title="Live HTML preview"
      srcDoc={htmlContent}
      className="w-full flex-1 min-h-0 border-0 bg-white"
    />
  );
}
