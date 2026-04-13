"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './landing.css';
import Image from 'next/image';

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    // If the user already has a token, we could auto-redirect them to the dashboard.
    // Uncomment if auto-redirect is desired:
    // const token = localStorage.getItem("glyph_token");
    // if (token) {
    //   router.push("/dashboard");
    // }
  }, [router]);

  return (
    <div className="landing-page">
      <nav className="nav">
        <div className="logo">
          <Image src="/logo.png" alt="Glyph Logo" width={28} height={28} className="rounded-[6px]" />
          Glyph
        </div>
        <div className="nav-links">
          <Link href="/login" className="btn-ghost" style={{ textDecoration: 'none' }}>Sign in</Link>
          <Link href="/register" className="btn-primary" style={{ textDecoration: 'none' }}>Sign up free</Link>
        </div>
      </nav>

      <div className="hero">
        <div className="badge"><span className="badge-dot"></span>Now in beta — free to use</div>
        <h1>Collaborative <span>LaTeX editing</span>, reimagined</h1>
        <p>A lightweight, real-time LaTeX editor built on Rust and Next.js. Write, compile, and collaborate — all in your browser or on your desktop.</p>
        <div className="hero-actions">
          <Link href="/register" className="btn-large btn-large-primary" style={{ textDecoration: 'none' }}>Get started for free</Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="btn-large btn-large-ghost" style={{ textDecoration: 'none' }}>View on GitHub</a>
        </div>
      </div>

      <div className="editor-preview">
        <div className="editor-bar">
          <div className="dot dot-r"></div>
          <div className="dot dot-y"></div>
          <div className="dot dot-g"></div>
          <div className="tab-bar">
            <div className="tab active">main.tex</div>
            <div className="tab">references.bib</div>
          </div>
          <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <div style={{fontSize: '11px', color: 'var(--color-text-tertiary)'}}>2 online</div>
            <button style={{background: '#534AB7', border: 'none', color: '#fff', fontSize: '11px', padding: '4px 12px', borderRadius: '4px'}}>Compile</button>
          </div>
        </div>
        <div className="editor-body">
          <div className="sidebar">
            <div className="sidebar-label">Project</div>
            <div className="file-item active"><div className="file-dot"></div>main.tex</div>
            <div className="file-item">references.bib</div>
            <div className="file-item">abstract.tex</div>
            <div className="file-item" style={{color: 'var(--color-text-tertiary)'}}>figures/</div>
            <div className="collab-section">
              <div className="sidebar-label" style={{marginTop: '12px'}}>Collaborators</div>
              <div className="avatar-row">
                <div className="avatar"><div className="av av-p">AN</div><span style={{fontSize: '11px', color: 'var(--color-text-secondary)'}}>Anik (you)</span><div className="online-dot"></div></div>
                <div className="avatar"><div className="av av-g">PR</div><span style={{fontSize: '11px', color: 'var(--color-text-secondary)'}}>Priya</span><div className="online-dot"></div></div>
                <div className="avatar"><div className="av av-a">KE</div><span style={{fontSize: '11px', color: 'var(--color-text-secondary)'}}>Keanu</span><span style={{fontSize: '10px', color: 'var(--color-text-tertiary)', marginLeft: 'auto'}}>2h ago</span></div>
              </div>
            </div>
          </div>
          <div className="editor-pane">
            <div><span className="kw">\documentclass</span>{'{article}'}</div>
            <div><span className="kw">\usepackage</span>{'{'}<span className="str">amsmath</span>{'}'}</div>
            <div><span className="kw">\usepackage</span>{'{'}<span className="str">graphicx</span>{'}'}</div>
            <div>&nbsp;</div>
            <div><span className="cm">% Main document</span></div>
            <div><span className="kw">\begin</span>{'{document}'}</div>
            <div>&nbsp;</div>
            <div><span className="kw">\title</span>{'{'}<span className="str">Research Paper</span>{'}'}</div>
            <div><span className="kw">\author</span>{'{'}<span className="str">Anik, Priya</span>{'}'}</div>
            <div><span className="kw">\maketitle</span></div>
            <div>&nbsp;</div>
            <div><span className="kw">\section</span>{'{Introduction}'}</div>
            <div>This paper presents...</div>
            <div>&nbsp;</div>
            <div><span className="kw">\bibliography</span>{'{references}'}</div>
            <div><span className="kw">\end</span>{'{document}'}</div>
          </div>
          <div className="preview-pane">
            <div className="preview-title">Research Paper</div>
            <div className="preview-body" style={{fontSize: '10px', color: 'var(--color-text-tertiary)'}}>Anik, Priya · April 2026</div>
            <div className="preview-section">
              <div className="preview-section-title">1. Introduction</div>
              <div className="preview-body">This paper presents a novel approach to collaborative document authoring using real-time operational transforms...</div>
            </div>
            <div className="preview-section">
              <div className="preview-section-title">2. Methodology</div>
              <div className="preview-body">We evaluate the system under concurrent edit conditions with up to 16 simultaneous authors across distributed networks...</div>
            </div>
          </div>
        </div>
        <div className="status-bar">
          <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}><div className="status-dot"></div>Connected · 2 online</div>
          <div>Auto-save on</div>
          <div>4,812 words</div>
          <div>LaTeX · UTF-8</div>
          <div style={{marginLeft: 'auto', color: '#639922', fontWeight: 500}}>Compiled</div>
        </div>
      </div>

      <div className="features">
        <div style={{textAlign: 'center'}}>
          <div className="section-label">Features</div>
          <div className="section-title">Everything you need to write LaTeX</div>
          <div className="section-sub">Built for researchers, students, and teams who take document quality seriously.</div>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{background: '#EEEDFE'}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="6" cy="9" r="2.5" fill="#534AB7"/><circle cx="12" cy="9" r="2.5" fill="#AFA9EC"/><path d="M8.5 9h1" stroke="#534AB7" strokeWidth="1.5"/></svg>
            </div>
            <h3>Real-time collaboration</h3>
            <p>Multiple authors, one document. Live cursors, presence indicators, and conflict-free editing via Yjs CRDTs.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{background: '#E1F5EE'}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="5" height="12" rx="1" fill="#1D9E75"/><rect x="10" y="6" width="5" height="9" rx="1" fill="#9FE1CB"/></svg>
            </div>
            <h3>Instant compilation</h3>
            <p>Sandboxed Docker workers compile your LaTeX on the fly. Preview updates as you type.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{background: '#E6F1FB'}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="4" width="14" height="10" rx="2" fill="#378ADD"/><path d="M6 8h6M6 11h4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </div>
            <h3>CodeMirror 6 editor</h3>
            <p>Syntax highlighting, autocomplete, and bracket matching — purpose-built for LaTeX workflows.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{background: '#FAECE7'}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="12" height="12" rx="2" fill="#D85A30"/><path d="M6 9l2 2 4-4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3>Desktop app via Tauri</h3>
            <p>Native desktop experience on Mac, Windows, and Linux — same codebase, zero compromise.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{background: '#EEEDFE'}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <h3>Rust backend</h3>
            <p>Axum + Tokio powers a fast, memory-safe API. PostgreSQL and Redis keep state in sync.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{background: '#EAF3DE'}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="11" width="14" height="4" rx="1" fill="#639922"/><rect x="2" y="3" width="14" height="6" rx="1" fill="#C0DD97"/></svg>
            </div>
            <h3>Open source</h3>
            <p>Fully open source monorepo. Self-host with Docker or contribute on GitHub.</p>
          </div>
        </div>
        <div className="stack-pills">
          <div className="pill">Rust</div><div className="pill">Axum</div><div className="pill">Tokio</div><div className="pill">Next.js 15</div><div className="pill">TypeScript</div><div className="pill">Tailwind CSS</div><div className="pill">Yjs</div><div className="pill">CodeMirror 6</div><div className="pill">Tauri</div><div className="pill">PostgreSQL</div><div className="pill">Redis</div><div className="pill">Docker</div>
        </div>
      </div>

      <div className="cta">
        <h2>Start writing better LaTeX today</h2>
        <p>Free during beta. No credit card required.</p>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap'}}>
          <Link href="/register" className="btn-large btn-large-primary" style={{background: '#534AB7', border: 'none', color: '#fff', textDecoration: 'none'}}>Create a free account</Link>
          <Link href="/login" className="btn-large btn-large-ghost" style={{textDecoration: 'none'}}>Sign in</Link>
        </div>
      </div>

      <footer className="footer">
        <div className="logo" style={{fontSize: '14px'}}>
          <Image src="/logo.png" alt="Glyph Logo" width={20} height={20} className="rounded-[4px]" />
          Glyph
        </div>
        <div>Built with Rust, Next.js & Tauri · Open source</div>
        <div style={{display: 'flex', gap: '16px'}}><span>Docs</span><span>GitHub</span><span>Status</span></div>
      </footer>
    </div>
  );
}
