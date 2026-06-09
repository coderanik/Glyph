'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, ShieldOff, Package, Zap, Trees, Key, RefreshCw, Clock, Globe, Server, Check, X, Github } from 'lucide-react'
import { SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/nextjs'
import { apiUrl } from '../lib/api'
import './landing.css'

function Show({ children, when }: { children: React.ReactNode; when: 'signed-in' | 'signed-out' }) {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (when === 'signed-in' && isSignedIn) return <>{children}</>;
  if (when === 'signed-out' && !isSignedIn) return <>{children}</>;
  return null;
}

export default function Home() {
  const scrollObserverRef = useRef<IntersectionObserver | null>(null)
  const router = useRouter()
  const { isSignedIn, isLoaded } = useAuth()
  const [isScrolled, setIsScrolled] = useState(false)
  const [emailInput, setEmailInput] = useState("")
  const [subscribing, setSubscribing] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [subscribeError, setSubscribeError] = useState("")

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard")
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    // Set up intersection observer for fade-up animations
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (!prefersReducedMotion) {
      scrollObserverRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animate-fade-up')
            }
          })
        },
        { threshold: 0.1 }
      )

      document.querySelectorAll('[data-animate-on-scroll]').forEach((el) => {
        scrollObserverRef.current?.observe(el)
      })
    }

    return () => {
      scrollObserverRef.current?.disconnect()
    }
  }, [])

  // To prevent flash of landing page content for logged-in users
  if (isLoaded && isSignedIn) {
    return null
  }

  return (
    <div className="landing-page min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* Floating Navbar Wrapper */}
      <div className="sticky top-4 z-50 w-full px-4 sm:px-6 flex justify-center">
        {/* Floating Glass Navbar */}
        <nav className={`w-full max-w-3xl flex items-center justify-between ${
          isScrolled 
            ? 'px-5 py-2' 
            : 'px-6 py-3'
        }`}>
          <Link href="/" className="flex items-center gap-2 group cursor-pointer select-none">
            <Image 
              src="/logo.png" 
              alt="Glyph Logo" 
              width={34} 
              height={34} 
              className="rounded-[6px] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3" 
            />
            <span className="font-mono text-xl font-bold transition-colors duration-300 group-hover:text-[var(--accent)]">
              glyph
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Show when="signed-out">
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="nav-link font-mono text-sm text-[var(--muted)] cursor-pointer">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="btn-primary px-4 py-2 text-sm cursor-pointer">
                  <span className="flex items-center gap-1">
                    Sign Up <span className="arrow ml-1">→</span>
                  </span>
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="btn-secondary px-4 py-2 text-sm"
              >
                <span className="flex items-center gap-1">
                  Dashboard <span className="arrow ml-1">→</span>
                </span>
              </Link>
              <UserButton />
            </Show>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl grid gap-12 px-6 py-20 md:grid-cols-2 md:py-32">
        {/* Ambient Glow Orb */}
        <div className="glow-orb orb-mint absolute -top-20 -left-40" />
        <div className="space-y-6 self-center">
          <div
            className="font-mono text-xs uppercase tracking-widest"
            style={{ color: 'var(--accent)' }}
          >
            Open Source · Self-Hostable · Free Forever
          </div>

          <h1 className="font-mono text-5xl font-bold leading-tight md:text-6xl">
            LaTeX collaboration
            <br />
            without the paywall.
          </h1>

          <p className="max-w-lg text-lg leading-relaxed text-[var(--muted)]">
            Glyph is a real-time collaborative LaTeX editor that compiles
            documents inside a sandboxed Docker container — no subscriptions, no
            security compromises, no 5GB installs.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Show when="signed-out">
              <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="btn-primary px-6 py-3 text-base cursor-pointer">
                  <span className="flex items-center gap-1.5">
                    Get Started  <span className="arrow">→</span>
                  </span>
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="btn-primary px-6 py-3 text-base text-center"
              >
                <span className="flex items-center justify-center gap-1.5 w-full">
                  Go to Dashboard <span className="arrow">→</span>
                </span>
              </Link>
            </Show>
          </div>

          <p className="text-sm text-[var(--muted)]">
            Works in your browser. Deploy with one Docker command.
          </p>
        </div>

        {/* Hero Editor Mock */}
        <div className="w-full">
          <EditorMock />
        </div>
      </section>

      {/* Social Proof Bar
      <section className="border-y border-[var(--border-color)] px-6 py-12">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm uppercase tracking-widest text-[var(--muted)]">
            Trusted by researchers at MIT · IIT Bombay · TU Berlin · ETH Zürich
          </p>
        </div>
      </section> */}

      {/* Problem Section */}
      <section className="relative mx-auto max-w-7xl px-6 py-20 md:py-32">
        {/* Ambient Glow Orb */}
        <div className="glow-orb orb-purple absolute -bottom-20 -right-40" />

        <div className="relative z-10 space-y-16">
          <div className="space-y-4 text-center">
            <h2 className="font-mono text-4xl font-bold md:text-5xl">
              Other editors are fine.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-accent2 to-accent">
                Until they aren&apos;t.
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-[var(--muted)]">
              The moment your team grows past two, or you handle sensitive
              research, or you just refuse to pay $21/month per user — you hit a
              wall.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1 */}
            <div
              className="problem-card glow-accent"
              data-animate-on-scroll
            >
              <div
                className="card-indicator"
                style={{ backgroundColor: 'var(--accent)' }}
              />
              <div className="icon-container accent">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-mono font-bold text-lg text-[var(--text)]">
                Collaboration locked behind Pro
              </h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                Real-time editing, track changes, comments, revision history —
                all paywalled. Other free plans cap you at one collaborator.
              </p>
            </div>

            {/* Card 2 */}
            <div
              className="problem-card glow-error"
              data-animate-on-scroll
            >
              <div
                className="card-indicator"
                style={{ backgroundColor: 'var(--error)' }}
              />
              <div className="icon-container error">
                <ShieldOff className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-mono font-bold text-lg text-[var(--text)]">
                Self-hosting is a security gamble
              </h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                User-submitted .tex files can execute arbitrary shell commands
                via \write18. Running LaTeX directly on your server puts your
                host at risk.
              </p>
            </div>

            {/* Card 3 */}
            <div
              className="problem-card glow-accent2"
              data-animate-on-scroll
            >
              <div
                className="card-indicator"
                style={{ backgroundColor: 'var(--accent2)' }}
              />
              <div className="icon-container accent2">
                <Package className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-mono font-bold text-lg text-[var(--text)]">
                Local installs are a 5GB weekend project
              </h3>
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                texlive-full is massive. Getting PATH variables right across
                macOS, Linux, and Windows on your team is an exercise in
                frustration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-32">
        <div className="space-y-20">
          <div className="space-y-4">
            <h2 className="font-mono text-4xl font-bold md:text-5xl">
              Glyph fixes all three.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent2">
                Completely free. Completely open.
              </span>
            </h2>
          </div>

          {/* Row 1: Live Editing */}
          <div className="grid gap-12 md:grid-cols-2">
            <div className="space-y-4 self-center" data-animate-on-scroll>
              <div
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: 'var(--accent)' }}
              >
                Live Editing
              </div>
              <h3 className="text-3xl font-bold">
                See every keystroke. No lag. No conflicts.
              </h3>
              <p className="text-[var(--muted)]">
                Glyph uses Yjs CRDTs over WebSockets — the same technology
                powering Notion and Linear. Collaborator cursors appear in real
                time. Changes sync conflict-free, even on poor connections.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs font-mono">
                  Yjs CRDTs
                </span>
                <span className="rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs font-mono">
                  WebSocket
                </span>
                <span className="rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs font-mono">
                  Cursor Presence
                </span>
              </div>
            </div>

            <div
              className="flex items-center"
              data-animate-on-scroll
            >
              <LiveEditingFeatureMock />
            </div>
          </div>

          {/* Row 2: Safe Compilation */}
          <div className="grid gap-12 md:grid-cols-2">
            <div
              className="md:order-2 flex items-center justify-center"
              data-animate-on-scroll
            >
              <SafeCompilationDiagram />
            </div>

            <div className="space-y-4 md:order-1 self-center" data-animate-on-scroll>
              <div
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: 'var(--accent)' }}
              >
                Safe Compilation
              </div>
              <h3 className="text-3xl font-bold">
                User LaTeX. Your server stays clean.
              </h3>
              <p className="text-[var(--muted)]">
                Every compile job runs inside an isolated Docker container with
                restricted privileges. No shell escapes. No \write18 surprises.
                A database-backed job queue ensures zero race conditions under
                concurrent load.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs font-mono">
                  Docker sandbox
                </span>
                <span className="rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs font-mono">
                  Restricted privileges
                </span>
                <span className="rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs font-mono">
                  Compile queue
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Zero Setup */}
          <div className="grid gap-12 md:grid-cols-2">
            <div className="space-y-4 self-center" data-animate-on-scroll>
              <div
                className="font-mono text-xs uppercase tracking-widest"
                style={{ color: 'var(--accent)' }}
              >
                Zero Setup
              </div>
              <h3 className="text-3xl font-bold">
                Running in 60 seconds.
              </h3>
              <p className="text-[var(--muted)]">
                No local TeX install. No environment variables. No version
                conflicts. Glyph bundles everything. If you already have latexmk
                installed locally, it uses that. If not, it falls back to Docker
                — automatically.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs font-mono">
                  docker compose up
                </span>
                <span className="rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs font-mono">
                  Hybrid compile
                </span>
                <span className="rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1 text-xs font-mono">
                  Self-hostable
                </span>
              </div>
            </div>

            <div
              className="flex items-center"
              data-animate-on-scroll
            >
              <ZeroSetupTerminal />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-32">
        <div className="space-y-12">
          <h2 className="text-center font-mono text-4xl font-bold md:text-5xl">
            Everything a LaTeX team actually needs.
          </h2>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Zap,
                title: 'Split-screen preview',
                desc: 'Live PDF or HTML output beside your source. No waiting for manual compiles.',
              },
              {
                icon: Trees,
                title: 'File explorer',
                desc: 'Tree-structured workspace with nested folders, persisted in PostgreSQL.',
              },
              {
                icon: Key,
                title: 'Access control',
                desc: 'Share read-only or write-access links. Manage permissions via Clerk-integrated tokens.',
              },
              {
                icon: RefreshCw,
                title: 'Hybrid compile',
                desc: 'Detects your local latexmk. Falls back to Docker. You never have to configure anything.',
              },
              {
                icon: Clock,
                title: 'Compile queue',
                desc: 'Database-backed job queue. Handles multiple simultaneous compile jobs without race conditions.',
              },
              {
                icon: Globe,
                title: 'Browser-native',
                desc: 'Nothing to install. Works on any device with a modern browser.',
              },
            ].map((feature, idx) => {
              const Icon = feature.icon
              const isMint = idx % 2 === 0
              const themeClass = isMint ? 'theme-mint' : 'theme-purple'
              const indicatorColor = isMint ? 'var(--accent)' : 'var(--accent2)'
              
              return (
                <div
                  key={idx}
                  className={`feature-card ${themeClass}`}
                  data-animate-on-scroll
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const y = e.clientY - rect.top
                    e.currentTarget.style.setProperty('--x', `${x}px`)
                    e.currentTarget.style.setProperty('--y', `${y}px`)
                  }}
                >
                  <div
                    className="feature-card-indicator"
                    style={{ backgroundColor: indicatorColor }}
                  />
                  <div className="feature-icon-wrapper">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 font-mono font-bold text-lg text-[var(--text)] transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="mx-auto max-w-4xl px-6 py-20 md:py-32">
        <div className="space-y-12">
          <div className="space-y-4 text-center">
            <h2 className="font-mono text-4xl font-bold md:text-5xl">
              How Glyph stacks up.
            </h2>
            <p className="mx-auto max-w-xl text-lg text-[var(--muted)]">
              We compared Glyph against standard paywalled LaTeX platforms. 
              The difference is clear.
            </p>
          </div>

          <div className="comparison-table-wrapper">
            <table className="w-full text-sm comparison-table">
              <thead>
                <tr>
                  <th className="text-left font-bold w-1/3">Feature</th>
                  <th className="text-center font-bold w-1/3 text-[var(--accent)] bg-accent/5">
                    Glyph
                  </th>
                  <th className="text-center font-bold w-1/3">
                    Other Editors
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    feature: 'Real-time collaboration',
                    glyph: { text: 'Unlimited free', isGood: true },
                    others: { text: 'Paywalled / 1 user cap', isGood: false }
                  },
                  {
                    feature: 'Self-hostable',
                    glyph: { text: 'Yes (MIT License)', isGood: true },
                    others: { text: 'No (Cloud-only)', isGood: false }
                  },
                  {
                    feature: 'Sandboxed compilation',
                    glyph: { text: 'Yes (Docker)', isGood: true },
                    others: { text: 'Unknown', isGood: false }
                  },
                  {
                    feature: 'Price',
                    glyph: { text: 'Free forever', isGood: true },
                    others: { text: 'Up to $28/mo per user', isGood: false }
                  },
                  {
                    feature: 'Open source',
                    glyph: { text: 'Yes', isGood: true },
                    others: { text: 'No (Proprietary)', isGood: false }
                  },
                  {
                    feature: 'Offline / local compile',
                    glyph: { text: 'Yes', isGood: true },
                    others: { text: 'No', isGood: false }
                  }
                ].map((row, idx) => (
                  <tr key={idx}>
                    <td className="font-mono font-medium text-[var(--text)]">
                      {row.feature}
                    </td>
                    <td className="text-center glyph-col-standout font-semibold">
                      <span className="feature-tag check-tag">
                        <Check className="w-4 h-4 shrink-0" />
                        {row.glyph.text}
                      </span>
                    </td>
                    <td className="text-center font-medium">
                      <span className="feature-tag cross-tag">
                        <X className="w-4 h-4 shrink-0" />
                        {row.others.text}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Open Source CTA */}
      <section
        className="px-6 py-20 md:py-32 relative overflow-hidden"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(42, 45, 52, 0.3) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {/* Glow Orbs behind glass panel */}
        <div className="glow-orb orb-mint absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2" style={{ width: '300px', height: '300px', opacity: 0.1 }} />
        <div className="glow-orb orb-purple absolute top-1/2 left-2/3 -translate-y-1/2 -translate-x-1/2" style={{ width: '250px', height: '250px', opacity: 0.08 }} />

        <div className="relative mx-auto max-w-4xl px-8 py-16 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]/25 backdrop-blur-md overflow-hidden text-center z-10">
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20" style={{
            backgroundImage: 'radial-gradient(circle, rgba(110, 231, 183, 0.15) 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }} />
          
          <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
            <h2 className="font-mono text-4xl font-bold md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-[var(--text)] via-[var(--accent)] to-[var(--text)]">
              Built in the open.
              <br />
              Meant to stay that way.
            </h2>

            <p className="text-lg text-[var(--muted)] leading-relaxed">
              Glyph is MIT licensed. Inspect the code, self-host on your
              university server, suggest a feature, or open a PR. No telemetry.
              No usage limits. No surprises.
            </p>

            <div className="flex flex-col gap-3 sm:justify-center sm:flex-row">
              <Show when="signed-out">
                <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="btn-primary px-6 py-3 text-base cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      Create Free Account <span className="arrow">→</span>
                    </span>
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  className="btn-primary px-6 py-3 text-base text-center"
                >
                  <span className="flex items-center justify-center gap-1.5 w-full">
                    Go to Dashboard <span className="arrow">→</span>
                  </span>
                </Link>
              </Show>
              <a
                href="https://github.com/coderanik/Glyph"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary px-6 py-3 text-base text-center"
              >
                <span>★ Star on GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] px-6 py-16 text-sm bg-[var(--bg)] relative z-10">
        <div className="mx-auto max-w-7xl space-y-12">
          <div className="grid gap-12 md:grid-cols-3">
            {/* Column 1: Brand details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Image src="/logo.png" alt="Glyph Logo" width={28} height={28} className="rounded-[5px]" />
                <span className="font-mono font-bold text-lg">glyph</span>
              </div>
              {/* Real-time status indicator */}
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)] bg-[var(--surface)]/50 border border-[var(--border-color)] rounded-full px-3.5 py-1.5 w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]"></span>
                </span>
                <span>All systems operational</span>
              </div>
            </div>

            {/* Column 2: Navigation Links */}
            <div className="space-y-4">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text)]">Community</div>
              <div className="flex flex-col gap-3">
                <a
                  href="https://github.com/coderanik/Glyph"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--muted)] transition hover:text-[var(--text)] hover:translate-x-1 inline-flex items-center gap-1.5 duration-200 w-fit"
                >
                  <Github className="w-4 h-4 shrink-0" />
                  GitHub
                </a>
                <a
                  href="#"
                  className="text-[var(--muted)] transition hover:text-[var(--text)] hover:translate-x-1 inline-block duration-200 w-fit"
                >
                  Terms & Conditions
                </a>
                <a
                  href="https://github.com/coderanik/Glyph/blob/main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--muted)] transition hover:text-[var(--text)] hover:translate-x-1 inline-block duration-200 w-fit"
                >
                  Contributing
                </a>
              </div>
            </div>

            {/* Column 3: Interactive Newsletter Subscription */}
            <div className="space-y-4">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text)]">Stay Updated</div>
              <p className="text-xs text-[var(--muted)] leading-relaxed">
                Subscribe for self-hosting updates and new features. No spam.
              </p>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!emailInput) return
                  setSubscribing(true)
                  setSubscribeError("")
                  setSubscribed(false)
                  try {
                    const res = await fetch(apiUrl('/subscribe'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: emailInput }),
                    })
                    const data = await res.json()
                    if (res.ok && data.success) {
                      setSubscribed(true)
                      setEmailInput("")
                    } else {
                      setSubscribeError(data.error || 'Failed to subscribe')
                    }
                  } catch (err) {
                    console.error('Subscription error:', err)
                    setSubscribeError('Failed to subscribe. Please try again.')
                  } finally {
                    setSubscribing(false)
                  }
                }} 
                className="flex gap-2 max-w-sm"
              >
                <input
                  type="email"
                  required
                  disabled={subscribing}
                  placeholder="name@university.edu"
                  className="footer-input w-full"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={subscribing}
                  className="btn-primary px-4 py-2 text-xs whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  <span>{subscribing ? 'Subscribing...' : 'Subscribe'}</span>
                </button>
              </form>

              {/* Feedback messages */}
              {subscribed && (
                <div className="text-xs text-[var(--accent)] font-mono animate-fade-up">
                  ✓ Thank you! You&apos;ve been subscribed.
                </div>
              )}
              {subscribeError && (
                <div className="text-xs text-[var(--error)] font-mono animate-fade-up">
                  ✗ {subscribeError}
                </div>
              )}
            </div>
          </div>

          {/* Bottom row: copyleft */}
          <div className="pt-8 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--muted)]">
            <div>
              © {new Date().getFullYear()} Glyph. Open-source, copyleft.
            </div>
            <div>
              No tracking · No telemetry · Fully transparent
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function CollaboratorCursor({ name, color }: { name: string; color: "accent" | "accent2" }) {
  const bg = color === "accent" ? "bg-accent" : "bg-accent2";
  return (
    <span className="relative inline-flex items-center select-none ml-0.5">
      {/* Caret Line */}
      <span className={`w-[2px] h-[17px] ${bg} animate-blink`} />
      {/* Floating Flag */}
      <span className={`absolute left-0 bottom-[15px] px-1.5 py-0.5 rounded text-[8px] font-bold font-sans whitespace-nowrap shadow-lg translate-y-[-2px] text-[#0E0F11] ${bg} z-10`}>
        {name}
      </span>
    </span>
  );
}

function EditorMock({ compact = false }: { compact?: boolean }) {
  const [activeTab, setActiveTab] = useState<"main.tex" | "references.bib">("main.tex");
  const [badge, setBadge] = useState<"compiled" | "compiling">("compiled");
  const [line8Text, setLine8Text] = useState("  We revisit the");
  const [line14Text, setLine14Text] = useState("");
  const [pdfVersion, setPdfVersion] = useState(1);
  const [cursorAKVisible, setCursorAKVisible] = useState(false);
  const [cursorSRVisible, setCursorSRVisible] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let typeInterval: NodeJS.Timeout;
    let typeIntervalSR: NodeJS.Timeout;
    
    const runTimeline = () => {
      // 0s: Reset
      setLine8Text("  We revisit the");
      setLine14Text("");
      setPdfVersion(1);
      setBadge("compiled");
      setCursorAKVisible(false);
      setCursorSRVisible(false);

      // 1.5s: AK starts typing
      timeoutId = setTimeout(() => {
        setCursorAKVisible(true);
        const textToType = " relation";
        let currentText = "  We revisit the";
        let charIndex = 0;
        
        typeInterval = setInterval(() => {
          if (charIndex < textToType.length) {
            currentText += textToType[charIndex];
            setLine8Text(currentText);
            charIndex++;
          } else {
            clearInterval(typeInterval);
            setCursorAKVisible(false);
            
            // Trigger compile
            setBadge("compiling");
            timeoutId = setTimeout(() => {
              setBadge("compiled");
              setPdfVersion(2);
              
              // 5s: SR starts typing
              timeoutId = setTimeout(() => {
                setCursorSRVisible(true);
                const textToTypeSR = "  This is consistent with";
                let currentTextSR = "";
                let charIndexSR = 0;
                
                typeIntervalSR = setInterval(() => {
                  if (charIndexSR < textToTypeSR.length) {
                    currentTextSR += textToTypeSR[charIndexSR];
                    setLine14Text(currentTextSR);
                    charIndexSR++;
                  } else {
                    clearInterval(typeIntervalSR);
                    setCursorSRVisible(false);
                    
                    // Trigger compile
                    setBadge("compiling");
                    timeoutId = setTimeout(() => {
                      setBadge("compiled");
                      setPdfVersion(3);
                      
                      // Wait before repeating
                      timeoutId = setTimeout(runTimeline, 4000);
                    }, 1000);
                  }
                }, 80);
              }, 2000);
              
            }, 1000);
          }
        }, 120);
      }, 1500);
    };

    runTimeline();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(typeInterval);
      clearInterval(typeIntervalSR);
    };
  }, []);

  return (
    <div className="mint-glow rounded-xl border border-default bg-surface overflow-hidden transition-all duration-300">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-default bg-[color:var(--bg)] select-none">
        <div className="flex items-center gap-4">
          {/* macOS window controls */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab("main.tex")}
              className={`px-3 py-1.5 rounded-t-md font-medium transition-all ${
                activeTab === "main.tex"
                  ? "bg-surface text-[color:var(--text)] border-t-2 border-t-accent border-x border-default"
                  : "text-muted hover:text-[color:var(--text)] cursor-pointer"
              }`}
            >
              main.tex
            </button>
            <button
              onClick={() => setActiveTab("references.bib")}
              className={`px-3 py-1.5 rounded-t-md font-medium transition-all ${
                activeTab === "references.bib"
                  ? "bg-surface text-[color:var(--text)] border-t-2 border-t-accent border-x border-default"
                  : "text-muted hover:text-[color:var(--text)] cursor-pointer"
              }`}
            >
              references.bib
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] font-mono px-2 py-1 rounded-full border flex items-center gap-1.5 transition-all duration-300 ${
              badge === "compiled"
                ? "text-accent border-accent/30 bg-accent/10"
                : "text-accent2 border-accent2/30 bg-accent2/10"
            }`}
          >
            {badge === "compiled" ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Compiled ✓
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Compiling…
              </>
            )}
          </span>
          <span className="text-[11px] font-mono px-2 py-1 rounded-full border border-default text-muted flex items-center gap-1.5">
            <span className="flex -space-x-1">
              <span className="w-2 h-2 rounded-full bg-accent inline-block border border-[color:var(--bg)]" />
              <span className="w-2 h-2 rounded-full bg-accent2 inline-block border border-[color:var(--bg)] -ml-1.5" />
            </span>
            2 collaborators
          </span>
        </div>
      </div>

      {/* Split */}
      <div className="grid grid-cols-1 sm:grid-cols-2 min-h-[360px]">
        {/* Code */}
        <div className="bg-code p-4 font-mono text-[12.5px] leading-6 border-b sm:border-b-0 sm:border-r border-default relative overflow-y-auto">
          {activeTab === "main.tex" ? (
            <>
              <CodeLine n={1}><span className="text-[#6EE7B7]">\documentclass</span>{"{article}"}</CodeLine>
              <CodeLine n={2}><span className="text-[#A78BFA]">\usepackage</span>{"{amsmath}"}</CodeLine>
              <CodeLine n={3}><span className="text-[#A78BFA]">\title</span>{"{On the Mass-Energy Equivalence}"}</CodeLine>
              <CodeLine n={4}><span className="text-[#A78BFA]">\author</span>{"{A. Kumar, S. Rao}"}</CodeLine>
              <CodeLine n={5}>&nbsp;</CodeLine>
              <CodeLine n={6}><span className="text-[#6EE7B7]">\begin</span>{"{document}"}</CodeLine>
              <CodeLine n={7}>&nbsp;&nbsp;<span className="text-[#A78BFA]">\maketitle</span></CodeLine>
              <CodeLine n={8}>
                <span className="relative inline-flex items-center">
                  <span>{line8Text}</span>
                  {cursorAKVisible && <CollaboratorCursor name="A. Kumar" color="accent" />}
                </span>
              </CodeLine>
              <CodeLine n={9}>&nbsp;&nbsp;between mass and energy.</CodeLine>
              <CodeLine n={10}>&nbsp;</CodeLine>
              <CodeLine n={11}>&nbsp;&nbsp;<span className="text-[#6EE7B7]">\begin</span>{"{equation}"}</CodeLine>
              <CodeLine n={12}>&nbsp;&nbsp;&nbsp;&nbsp;E = mc^2</CodeLine>
              <CodeLine n={13}>&nbsp;&nbsp;<span className="text-[#6EE7B7]">\end</span>{"{equation}"}</CodeLine>
              <CodeLine n={14}>
                <span className="relative inline-flex items-center">
                  <span>{line14Text}</span>
                  {cursorSRVisible && <CollaboratorCursor name="S. Rao" color="accent2" />}
                </span>
              </CodeLine>
              <CodeLine n={15}>&nbsp;&nbsp;Einstein (1905).</CodeLine>
              <CodeLine n={16}><span className="text-[#6EE7B7]">\end</span>{"{document}"}</CodeLine>
            </>
          ) : (
            <>
              <CodeLine n={1}><span className="text-[#A78BFA]">@article</span>{"{einstein1905,"}</CodeLine>
              <CodeLine n={2}>&nbsp;&nbsp;author = <span className="text-[#6EE7B7]">{"{Einstein, Albert}"}</span>,</CodeLine>
              <CodeLine n={3}>&nbsp;&nbsp;title = <span className="text-[#6EE7B7]">{"{On the Electrodynamics of Moving Bodies}"}</span>,</CodeLine>
              <CodeLine n={4}>&nbsp;&nbsp;journal = <span className="text-[#6EE7B7]">{"{Annalen der Physik}"}</span>,</CodeLine>
              <CodeLine n={5}>&nbsp;&nbsp;volume = <span className="text-[#6EE7B7]">{"{17}"}</span>,</CodeLine>
              <CodeLine n={6}>&nbsp;&nbsp;pages = <span className="text-[#6EE7B7]">{"{891--921}"}</span>,</CodeLine>
              <CodeLine n={7}>&nbsp;&nbsp;year = <span className="text-[#6EE7B7]">{"{1905}"}</span></CodeLine>
              <CodeLine n={8}>{"}"}</CodeLine>
            </>
          )}
        </div>

        {/* PDF preview */}
        <div key={pdfVersion} className="bg-white text-[#111] p-6 text-[12px] leading-5 overflow-y-auto pdf-fade">
          {activeTab === "main.tex" ? (
            <>
              <div className="text-center">
                <div className="font-serif text-[16px] font-semibold">On the Mass-Energy Equivalence</div>
                <div className="text-[10px] text-gray-600 mt-1">A. Kumar, S. Rao</div>
                <div className="text-[10px] text-gray-500">June 2026</div>
              </div>
              <div className="mt-5 font-serif">
                <div className="text-[11px] uppercase tracking-wider text-gray-500 text-center mb-1">Abstract</div>
                <p className="text-[11.5px] text-gray-700 min-h-[3.5em] transition-all duration-300">
                  {pdfVersion === 1 && "We revisit the"}
                  {pdfVersion === 2 && "We revisit the relation"}
                  {pdfVersion >= 3 && "We revisit the relation between mass and energy. This is consistent with Einstein (1905)."}
                </p>
              </div>
              <div className="mt-5 font-serif">
                <p className="text-[11.5px] text-gray-800">
                  The mass-energy equivalence is expressed by the well-known equation:
                </p>
                <div className="my-4 text-center text-[18px] font-serif italic">
                  E = mc<sup className="text-[12px]">2</sup>
                </div>
                <p className="text-[11.5px] text-gray-800">
                  where <em>c</em> denotes the speed of light in vacuum.
                </p>
              </div>
              {!compact && (
                <div className="mt-6 text-[10px] text-gray-400 text-right">— 1 —</div>
              )}
            </>
          ) : (
            <div className="font-serif">
              <div className="text-center font-semibold text-[14px] mb-4">References</div>
              <div className="text-[11px] text-gray-800 leading-relaxed pl-4 -indent-4">
                [1] A. Einstein. Ist die Trägheit eines Körpers von seinem Energieinhalt abhängig? <em>Annalen der Physik</em>, 18:639–641, 1905.
              </div>
              <div className="text-[11px] text-gray-800 leading-relaxed pl-4 -indent-4 mt-2">
                [2] A. Einstein. Zur Elektrodynamik bewegter Körper. <em>Annalen der Physik</em>, 17:891–921, 1905.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CodeLine({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex">
      <span className="w-6 text-right pr-3 text-muted select-none">{n}</span>
      <span className="text-[color:var(--text)] flex-1 whitespace-pre">{children}</span>
    </div>
  );
}

function LiveEditingFeatureMock() {
  const [line4Text, setLine4Text] = useState("  Glyph is ");
  const [line5Text, setLine5Text] = useState("");
  const [cursorAKVisible, setCursorAKVisible] = useState(false);
  const [cursorSRVisible, setCursorSRVisible] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let typeIntervalAK: NodeJS.Timeout;
    let typeIntervalSR: NodeJS.Timeout;

    const runTimeline = () => {
      setLine4Text("  Glyph is ");
      setLine5Text("");
      setCursorAKVisible(false);
      setCursorSRVisible(false);

      // 1s: AK starts typing
      timeoutId = setTimeout(() => {
        setCursorAKVisible(true);
        const textToType = "real-time collaborative.";
        let currentText = "  Glyph is ";
        let charIndex = 0;

        typeIntervalAK = setInterval(() => {
          if (charIndex < textToType.length) {
            currentText += textToType[charIndex];
            setLine4Text(currentText);
            charIndex++;
          } else {
            clearInterval(typeIntervalAK);
            setCursorAKVisible(false);

            // 4.5s: SR starts typing
            timeoutId = setTimeout(() => {
              setCursorSRVisible(true);
              const textToTypeSR = "  No conflict sync!";
              let currentTextSR = "";
              let charIndexSR = 0;

              typeIntervalSR = setInterval(() => {
                if (charIndexSR < textToTypeSR.length) {
                  currentTextSR += textToTypeSR[charIndexSR];
                  setLine5Text(currentTextSR);
                  charIndexSR++;
                } else {
                  clearInterval(typeIntervalSR);
                  setCursorSRVisible(false);

                  // Wait 4s before repeating
                  timeoutId = setTimeout(runTimeline, 4000);
                }
              }, 100);
            }, 800);
          }
        }, 85);
      }, 1000);
    };

    runTimeline();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(typeIntervalAK);
      clearInterval(typeIntervalSR);
    };
  }, []);

  return (
    <div className="solution-glass-card w-full font-mono text-xs select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg)]/50">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          <span className="ml-2.5 text-[var(--muted)] text-[11px]">document.tex</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Presence Indicator */}
          <span className="flex items-center gap-1.5 text-[var(--muted)] text-[10px]">
            <span className="pulse-dot" /> 2 typing
          </span>
          {/* Avatar stack */}
          <div className="avatar-stack ml-2">
            <span className="avatar-bubble bg-[var(--accent)] text-[#0e0f11] shadow-[0_0_8px_rgba(110,231,183,0.3)]">AK</span>
            <span className="avatar-bubble bg-[var(--accent2)] text-[#0e0f11] shadow-[0_0_8px_rgba(167,139,250,0.3)]">SR</span>
          </div>
        </div>
      </div>
      
      {/* Editor Lines */}
      <div className="p-4 space-y-1 bg-[#15171a]/30 min-h-[160px] leading-5">
        <div className="flex"><span className="w-6 text-right pr-3 text-[var(--muted)]">1</span><span className="text-[var(--accent)]">\documentclass{'{'}article{'}'}</span></div>
        <div className="flex"><span className="w-6 text-right pr-3 text-[var(--muted)]">2</span><span className="text-[var(--accent)]">\begin{'{'}document{'}'}</span></div>
        <div className="flex"><span className="w-6 text-right pr-3 text-[var(--muted)]">3</span><span className="text-[var(--accent2)]">\section{'{'}Real-Time Collaboration{'}'}</span></div>
        <div className="flex">
          <span className="w-6 text-right pr-3 text-[var(--muted)]">4</span>
          <span className="text-[var(--text)] relative inline-flex items-center">
            {line4Text}
            {cursorAKVisible && <CollaboratorCursor name="A. Kumar" color="accent" />}
          </span>
        </div>
        <div className="flex">
          <span className="w-6 text-right pr-3 text-[var(--muted)]">5</span>
          <span className="text-[var(--text)] relative inline-flex items-center">
            {line5Text}
            {cursorSRVisible && <CollaboratorCursor name="S. Rao" color="accent2" />}
          </span>
        </div>
        <div className="flex"><span className="w-6 text-right pr-3 text-[var(--muted)]">6</span><span className="text-[var(--accent)]">\end{'{'}document{'}'}</span></div>
      </div>
    </div>
  );
}

function SafeCompilationDiagram() {
  const [step, setStep] = useState(0); // 0: Idle/Send, 1: Process, 2: Sandbox, 3: Return/Success

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="solution-glass-card w-full p-8 flex flex-col justify-between min-h-[260px] select-none">
      <div className="text-[11px] font-mono text-[var(--muted)] flex items-center justify-between mb-4 border-b border-[var(--border-color)] pb-2.5">
        <span>SECURITY ISOLATION ENVIRONMENT</span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${step === 2 ? 'bg-[#ffbd2e] animate-pulse' : 'bg-[var(--accent)]'}`} />
          {step === 0 && "Client Request"}
          {step === 1 && "Routing & Queue"}
          {step === 2 && "Docker Compiling..."}
          {step === 3 && "Secure Delivery"}
        </span>
      </div>

      <div className="relative flex items-center justify-between w-full py-6">
        {/* SVG Connectors behind nodes */}
        <div className="absolute inset-0 flex items-center z-0">
          <svg className="w-full h-8" fill="none" viewBox="0 0 400 32" preserveAspectRatio="none">
            {/* Forward Flow Line 1 (Client -> Server) */}
            <path
              d="M 50 16 L 150 16"
              strokeWidth="2"
              className={`flow-line-animated ${step === 0 ? 'flow-line-active' : ''}`}
            />
            {/* Forward Flow Line 2 (Server -> Sandbox) */}
            <path
              d="M 210 16 L 310 16"
              strokeWidth="2"
              className={`flow-line-animated ${step === 2 ? 'flow-line-active-2' : ''}`}
            />
            {/* Success Pulse Line (Sandbox -> Client) */}
            {step === 3 && (
              <path
                d="M 310 16 L 50 16"
                strokeWidth="2"
                className="flow-line-animated flow-line-active"
                style={{ strokeDasharray: '6 4' }}
              />
            )}
          </svg>
        </div>

        {/* Node 1: Client */}
        <div className="flex flex-col items-center gap-2 z-10">
          <div className={`diagram-node ${step === 0 || step === 3 ? 'active-mint' : ''}`}>
            <Globe className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-mono text-[var(--muted)] mt-1">Browser</span>
        </div>

        {/* Node 2: Server */}
        <div className="flex flex-col items-center gap-2 z-10">
          <div className={`diagram-node ${step === 1 ? 'active-purple' : ''}`}>
            <Server className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-mono text-[var(--muted)] mt-1">Glyph Server</span>
        </div>

        {/* Node 3: Docker Sandbox */}
        <div className="flex flex-col items-center gap-2 z-10">
          <div className={`diagram-node ${step === 2 ? 'active-mint' : step === 3 ? 'active-mint shadow-[0_0_20px_var(--accent)] border-[var(--accent)] text-[var(--accent)]' : ''}`}>
            {step === 2 ? (
              <RefreshCw className="w-6 h-6 animate-spin text-[#ffbd2e]" />
            ) : step === 3 ? (
              <Lock className="w-6 h-6 text-[var(--accent)]" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          <span className="text-[10px] font-mono text-[var(--muted)] mt-1">Docker Sandbox</span>
        </div>
      </div>

      {/* Log outputs for compiling details */}
      <div className="bg-[#0e0f11]/60 rounded-lg p-3 border border-[var(--border-color)] font-mono text-[10.5px] mt-4 min-h-[56px] flex flex-col justify-center">
        {step === 0 && <span className="text-[var(--muted)]">Incoming compilation request from client...</span>}
        {step === 1 && <span className="text-[var(--accent2)]">Adding task to compilation queue; spawning worker...</span>}
        {step === 2 && (
          <span className="text-[#ffbd2e] animate-pulse">
            [DOCKER] Spawning container with user isolation; running pdfLaTeX...
          </span>
        )}
        {step === 3 && (
          <span className="text-[var(--accent)] flex items-center gap-1">
            ✓ Compiles complete. Container destroyed. Returning PDF (24.2 KB).
          </span>
        )}
      </div>
    </div>
  );
}

function ZeroSetupTerminal() {
  const [terminalStep, setTerminalStep] = useState(0);
  const [cmd1Text, setCmd1Text] = useState("");
  const [cmd2Text, setCmd2Text] = useState("");

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let typeInterval1: NodeJS.Timeout;
    let typeInterval2: NodeJS.Timeout;

    const runTimeline = () => {
      setTerminalStep(0);
      setCmd1Text("");
      setCmd2Text("");

      // Step 1: Type command 1
      timeoutId = setTimeout(() => {
        setTerminalStep(1);
        const textToType = "git clone https://github.com/coderanik/Glyph.git";
        let currentText = "";
        let charIndex = 0;

        typeInterval1 = setInterval(() => {
          if (charIndex < textToType.length) {
            currentText += textToType[charIndex];
            setCmd1Text(currentText);
            charIndex++;
          } else {
            clearInterval(typeInterval1);
            
            // Step 2: Show cloning output
            timeoutId = setTimeout(() => {
              setTerminalStep(2);

              // Step 3: Type command 2
              timeoutId = setTimeout(() => {
                setTerminalStep(3);
                const textToType2 = "cd Glyph && docker compose up -d";
                let currentText2 = "";
                let charIndex2 = 0;

                typeInterval2 = setInterval(() => {
                  if (charIndex2 < textToType2.length) {
                    currentText2 += textToType2[charIndex2];
                    setCmd2Text(currentText2);
                    charIndex2++;
                  } else {
                    clearInterval(typeInterval2);

                    // Step 4: Show compose outputs
                    timeoutId = setTimeout(() => {
                      setTerminalStep(4);

                      // Step 5: Show success URL
                      timeoutId = setTimeout(() => {
                        setTerminalStep(5);

                        // Wait before repeating
                        timeoutId = setTimeout(runTimeline, 6000);
                      }, 1500);
                    }, 800);
                  }
                }, 60);
              }, 1200);
            }, 800);
          }
        }, 40);
      }, 800);
    };

    runTimeline();

    return () => {
      clearTimeout(timeoutId);
      clearInterval(typeInterval1);
      clearInterval(typeInterval2);
    };
  }, []);

  return (
    <div className="solution-glass-card w-full font-mono text-xs select-none">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg)]/50">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          <span className="ml-2.5 text-[var(--muted)] text-[11px]">sh — bash</span>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-4 space-y-2.5 bg-[#0e0f11]/40 min-h-[220px] leading-5 text-[var(--muted)]">
        {/* Command 1 Line */}
        {terminalStep >= 1 && (
          <div>
            <span className="text-[var(--accent)]">$ </span>
            <span className="text-[var(--text)]">{cmd1Text}</span>
            {terminalStep === 1 && <span className="w-[8px] h-[14px] bg-[var(--accent)] inline-block ml-0.5 animate-blink" />}
          </div>
        )}

        {/* Command 1 Output */}
        {terminalStep >= 2 && (
          <div className="text-[11px] text-[var(--muted)]/80 leading-relaxed pl-3 border-l border-[var(--border-color)]">
            Cloning into &apos;Glyph&apos;...
            <br />
            remote: Enumerating objects: 1842, done.
            <br />
            Receiving objects: 100% (1842/1842), 4.21 MiB, done.
          </div>
        )}

        {/* Command 2 Line */}
        {terminalStep >= 3 && (
          <div>
            <span className="text-[var(--accent)]">$ </span>
            <span className="text-[var(--text)]">{cmd2Text}</span>
            {terminalStep === 3 && <span className="w-[8px] h-[14px] bg-[var(--accent)] inline-block ml-0.5 animate-blink" />}
          </div>
        )}

        {/* Command 2 Output (Compose status) */}
        {terminalStep >= 4 && (
          <div className="text-[11px] space-y-0.5 pl-3 border-l border-[var(--border-color)]">
            <div className="text-[var(--muted)]/80">[+] Running 4/4</div>
            <div className="text-[var(--accent)]">✔ Network glyph_network  Created</div>
            <div className="text-[var(--accent)]">✔ Container glyph_db     Started</div>
            <div className="text-[var(--accent)]">✔ Container glyph_worker Started</div>
            <div className="text-[var(--accent)]">✔ Container glyph_web    Started</div>
          </div>
        )}

        {/* Successful URL message */}
        {terminalStep >= 5 && (
          <div className="pt-2 text-[var(--accent)] font-bold text-center border-t border-[var(--border-color)] animate-fade-up">
            🚀 Glyph is ready! Listening at http://localhost:3000
          </div>
        )}
      </div>
    </div>
  );
}


