"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight,
  GitBranch,
  Code2,
  Bot,
  Zap,
  Wallet,
  FolderOpen,
  FolderTree,
  MousePointerClick,
  Terminal,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ICLogo } from "@/components/ICLogo";

// ── Grainy background (film noise + soft glow, like the reference image) ──

function GrainBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {/* SVG noise grain — subtle texture on dark background */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg"
        style={{ opacity: 0.18 }}>
        <filter id="grain-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-filter)" />
      </svg>

      {/* Soft glow — bottom-left, like reference image but dark */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 60% 55% at 18% 78%, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.01) 50%, transparent 70%)",
      }} />
      {/* Subtle top-right dark vignette */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 70% 60% at 85% 20%, rgba(0,0,0,0.35) 0%, transparent 60%)",
      }} />
    </div>
  );
}

// ── Typing animation ──────────────────────────────────────────────────────

const CODE_LINES = [
  "#[entry_point]",
  "pub fn instantiate(",
  "    deps: DepsMut,",
  "    msg: InstantiateMsg,",
  ") -> StdResult<Response> {",
  "    STATE.save(deps.storage,",
  "        &State { count: 0 })?;",
  "    Ok(Response::new())",
  "}",
];

function useTyping(lines: string[]) {
  const [rows, setRows] = useState<string[]>([]);
  const [li, setLi] = useState(0);
  const [ci, setCi] = useState(0);
  useEffect(() => {
    if (li >= lines.length) return;
    const line = lines[li];
    const t = setTimeout(() => {
      if (ci === 0) setRows((r) => [...r, ""]);
      setRows((r) => { const n = [...r]; n[li] = line.slice(0, ci + 1); return n; });
      if (ci < line.length - 1) { setCi((c) => c + 1); }
      else { setTimeout(() => { setLi((l) => l + 1); setCi(0); }, 80); }
    }, 22);
    return () => clearTimeout(t);
  }, [li, ci, lines]);
  return rows;
}

// ── Deploy cursor animation ───────────────────────────────────────────────

function DeployStep() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-[10px] text-white/20 tracking-[0.18em] uppercase mb-1">03</div>
      <div className="h-[18px]" />
      <div className="relative w-32 h-28">
        <div className="w-full h-full rounded-xl border border-white/25 bg-white/5 flex flex-col items-center justify-center gap-2">
          <span className="text-white text-sm font-semibold">Deploy</span>
          <span className="text-[10px] text-white/35 tracking-wide">one click</span>
        </div>
        <div className="cursor-deploy absolute inset-0 flex items-center justify-center pointer-events-none">
          <MousePointerClick className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// ── Dashed arrow ──────────────────────────────────────────────────────────

function DashArrow() {
  return (
    <div className="flex-1 flex items-center justify-center px-1" style={{ paddingBottom: "2.5rem" }}>
      <svg width="64" height="20" viewBox="0 0 64 20" fill="none" overflow="visible">
        <line x1="4" y1="10" x2="52" y2="10"
          stroke="white" strokeOpacity="0.25" strokeWidth="1.5"
          strokeDasharray="5 4" strokeLinecap="round" className="dash-line" />
        <polygon points="50,6 61,10 50,14" fill="white" fillOpacity="0.25" />
      </svg>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────

const FEATURES = [
  { Icon: Code2,      title: "Monaco Editor",    desc: "Full Rust / CosmWasm IDE with syntax highlighting, autocomplete, and live error detection." },
  { Icon: Bot,        title: "AI Assistant",     desc: "Claude-powered assistant that audits, explains, and generates CosmWasm code on demand." },
  { Icon: Zap,        title: "One-Click Deploy", desc: "Compile and deploy contracts to Initia Testnet with streaming live logs in the terminal." },
  { Icon: Wallet,     title: "Dev Wallet",       desc: "Pre-funded server wallet included. Or connect your own init1 address — zero setup required." },
  { Icon: FolderOpen, title: "6 Templates",      desc: "Counter, CW20 Token, NFT, Escrow, Staking, and DAO Voting contracts ready to deploy." },
  { Icon: FolderTree, title: "File Explorer",    desc: "Full project tree with create, rename, delete, and one-click template loading." },
];

function FeatureCard({ Icon, title, desc, index }: { Icon: React.ElementType; title: string; desc: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const fromLeft = index % 2 === 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 60) { setVisible(true); return true; }
      return false;
    };
    if (check()) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { rootMargin: "-60px 0px 0px 0px" });
    obs.observe(el);
    const onScroll = () => { if (check()) window.removeEventListener("scroll", onScroll); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { obs.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : `translateX(${fromLeft ? -32 : 32}px)`,
        transition: `opacity 0.55s ease ${index * 0.07}s, transform 0.55s cubic-bezier(0.22,1,0.36,1) ${index * 0.07}s`,
      }}
    >
      <div className="h-full p-5 rounded-xl border border-white/10 bg-[#0a0a0a] hover:border-white/18 hover:bg-[#0f0f0f] transition-colors duration-300">
        <div className="mb-3 text-white/35">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
        <p className="text-[13px] text-white/38 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── Terminal mockup ───────────────────────────────────────────────────────

const LOG_STEPS = [
  { type: "info",    text: "Starting deployment for Counter..." },
  { type: "info",    text: "cargo build --release --target wasm32..." },
  { type: "muted",   text: "   Compiling cosmwasm-std v2.2.0" },
  { type: "muted",   text: "   Compiling cw-storage-plus v2.0.0" },
  { type: "success", text: "   Finished release [optimized] in 3.2s" },
  { type: "info",    text: "Broadcasting MsgStoreCode on initiation-2..." },
  { type: "success", text: "✓ Contract stored — Code ID: 2847" },
  { type: "info",    text: "Instantiating contract..." },
  { type: "success", text: "✓ Contract deployed to init1xq7f...d9k2" },
];

function TerminalMockup() {
  const [logs, setLogs] = useState<typeof LOG_STEPS>([]);
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);

  const run = useCallback(() => {
    if (running) return;
    setLogs([]); setIdx(0); setRunning(true);
  }, [running]);

  useEffect(() => { const t = setTimeout(run, 1000); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) return;
    if (idx >= LOG_STEPS.length) { setRunning(false); return; }
    const delay = idx === 0 ? 100 : idx < 4 ? 400 : 650;
    const t = setTimeout(() => { setLogs((l) => [...l, LOG_STEPS[idx]]); setIdx((i) => i + 1); }, delay);
    return () => clearTimeout(t);
  }, [running, idx]);

  useEffect(() => {
    if (!running && logs.length === LOG_STEPS.length) {
      const t = setTimeout(() => { setLogs([]); setIdx(0); setRunning(true); }, 3200);
      return () => clearTimeout(t);
    }
  }, [running, logs.length]);

  const colorMap: Record<string, string> = {
    info: "text-sky-400/90", success: "text-emerald-400/90", muted: "text-white/28", error: "text-red-400/90",
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/8 bg-[#0f0f0f]">
        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
        <div className="flex items-center gap-1.5 ml-2">
          <Terminal className="w-3 h-3 text-white/18" />
          <span className="text-[10px] text-white/18 font-mono">Terminal — InitCode IDE</span>
        </div>
        <button onClick={run} disabled={running}
          className="ml-auto text-[10px] text-white/18 hover:text-white/50 transition-colors disabled:opacity-30">
          ↺ replay
        </button>
      </div>
      <div className="px-4 py-3 font-mono text-[11px] leading-[20px] min-h-[180px] space-y-0.5">
        <AnimatePresence>
          {logs.map((log, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className={colorMap[log.type] || "text-white/50"}
            >
              <span className="text-white/15 mr-2 select-none">$</span>{log.text}
            </motion.div>
          ))}
        </AnimatePresence>
        {running && (
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
            className="inline-block w-[2px] h-3 bg-white/35 ml-1 align-middle"
          />
        )}
      </div>
    </div>
  );
}

// ── Scroll fade-up wrapper ────────────────────────────────────────────────

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 50) { setVisible(true); return true; }
      return false;
    };
    if (check()) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { rootMargin: "-50px 0px 0px 0px" });
    obs.observe(el);
    const onScroll = () => { if (check()) window.removeEventListener("scroll", onScroll); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { obs.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
      className={className}
    >
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const rows = useTyping(CODE_LINES);

  return (
    <div className="min-h-screen bg-black text-white relative" style={{ fontFamily: "Inter, -apple-system, sans-serif" }}>
      <style>{`
        .dot-bg {
          background-image: radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0; }
        }
        .cursor-blink { animation: cursor-blink 1s step-end infinite; }
        @keyframes cursor-deploy {
          0%   { transform: translate(0, -44px) scale(1);    opacity: 0;   }
          20%  { transform: translate(0, -44px) scale(1);    opacity: 0.7; }
          55%  { transform: translate(0,   0px) scale(1);    opacity: 0.9; }
          68%  { transform: translate(0,   0px) scale(0.75); opacity: 1;   }
          80%  { transform: translate(0,   0px) scale(1);    opacity: 0.6; }
          100% { transform: translate(0, -44px) scale(1);    opacity: 0;   }
        }
        .cursor-deploy { animation: cursor-deploy 2.6s ease-in-out infinite; }
        @keyframes dash-flow {
          from { stroke-dashoffset: 18; } to { stroke-dashoffset: 0; }
        }
        .dash-line { animation: dash-flow 0.9s linear infinite; }
        /* Hero CSS animations — no JS needed, no hydration issues */
        @keyframes hero-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-1 { animation: hero-fade-up 0.7s ease forwards; animation-delay: 0.05s; opacity: 0; }
        .hero-2 { animation: hero-fade-up 0.7s ease forwards; animation-delay: 0.18s; opacity: 0; }
        .hero-3 { animation: hero-fade-up 0.6s ease forwards; animation-delay: 0.30s; opacity: 0; }
        .hero-4 { animation: hero-fade-up 0.6s ease forwards; animation-delay: 0.42s; opacity: 0; }
        .hero-5 { animation: hero-fade-up 0.8s ease forwards; animation-delay: 0.50s; opacity: 0; }
      `}</style>

      <GrainBackground />

      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-black/85 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <ICLogo className="w-10 h-7 text-white" />
          <div className="flex items-center gap-7 text-sm text-white/38">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="https://github.com/CodeswithrohStudio/initcode" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors">
              <GitBranch className="w-3.5 h-3.5" />Github
            </a>
          </div>
          <Link href="/ide"
            className="flex items-center gap-1 px-4 py-1.5 rounded-md bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors">
            Launch <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* ── Hero — CSS animations only ── */}
      <section className="dot-bg relative max-w-3xl mx-auto px-6 pt-24 pb-20">
        <div className="text-center mb-14">
          <div className="hero-1 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/12 text-xs text-white/38 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            Built for INITIATE Hackathon · Initia Testnet
          </div>

          <h1 className="hero-2 text-5xl md:text-6xl font-bold tracking-tight text-white mb-5 leading-tight">
            The IDE for
            <br />
            <span className="text-white/25">Initia smart contracts</span>
          </h1>

          <p className="hero-3 text-white/35 text-base max-w-sm mx-auto leading-relaxed">
            Write, deploy, and test CosmWasm contracts in your browser.
            No CLI. No wallet setup. Just code.
          </p>

          <div className="hero-4 mt-8 flex items-center justify-center gap-3">
            <Link href="/ide"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all">
              Open IDE <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <a href="#how-it-works"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg border border-white/15 text-white/55 text-sm hover:text-white hover:border-white/28 transition-all">
              See how it works
            </a>
          </div>
        </div>

        {/* Browser mockup */}
        <div className="hero-5 rounded-xl border border-white/10 bg-[#0d0d0d] overflow-hidden shadow-[0_0_80px_rgba(110,50,240,0.07)]">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/8 bg-[#111]">
            <div className="w-3 h-3 rounded-full bg-[#2a2a2a]" />
            <div className="w-3 h-3 rounded-full bg-[#2a2a2a]" />
            <div className="w-3 h-3 rounded-full bg-[#2a2a2a]" />
            <div className="flex items-center gap-1.5 ml-2">
              <Layers className="w-3 h-3 text-white/15" />
              <span className="text-white/18 text-[11px] font-mono">initcode.xyz/ide</span>
            </div>
          </div>
          <div className="px-6 pt-5 pb-4 font-mono text-[12px] leading-[22px] min-h-[190px]">
            {rows.map((row, i) => (
              <div key={i} className="flex">
                <span className="w-7 text-white/12 select-none shrink-0">{i + 1}</span>
                <span className={
                  row.startsWith("#[") || row.startsWith("pub") ? "text-[#7dd3fc]"
                    : row.includes("Ok(") || row.includes("?;") ? "text-emerald-400/80"
                    : "text-white/48"
                }>
                  {row}
                  {i === rows.length - 1 && (
                    <span className="cursor-blink inline-block w-[2px] h-[13px] bg-white/55 ml-[1px] align-middle" />
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="px-6 pb-5">
            <div className="border-t border-white/6 pt-4">
              <Link href="/ide"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/15 bg-white/4 text-sm font-medium text-white hover:bg-white/8 hover:border-white/28 transition-all">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Ready to Deploy
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="border-t border-white/6 py-28 dot-bg">
        <div className="max-w-4xl mx-auto px-6">
          <FadeUp className="text-center mb-20">
            <p className="text-xs text-white/22 tracking-[0.2em] uppercase mb-3">The workflow</p>
            <h2 className="text-3xl font-bold text-white mb-3">From idea to deployed contract</h2>
            <p className="text-white/30 text-sm max-w-xs mx-auto">
              Three steps. No toolchain. No wallet setup. Just open your browser.
            </p>
          </FadeUp>

          <div className="flex items-end justify-center gap-0">
            <FadeUp delay={0} className="flex flex-col items-center gap-4">
              <div className="text-[10px] text-white/18 tracking-[0.18em] uppercase mb-1">01</div>
              <div className="h-[18px]" />
              <div className="w-32 h-28 rounded-xl border border-white/12 bg-[#0a0a0a] flex flex-col items-center justify-center gap-2">
                <Code2 className="w-7 h-7 text-white/42" />
                <span className="text-[10px] text-white/25 tracking-wide">write contract</span>
              </div>
            </FadeUp>

            <DashArrow />

            <FadeUp delay={0.13} className="flex flex-col items-center gap-4">
              <div className="text-[10px] text-white/18 tracking-[0.18em] uppercase mb-1">02</div>
              <div className="h-[18px]" />
              <div className="w-32 h-28 rounded-xl border border-white/12 bg-[#0a0a0a] flex flex-col items-center justify-center gap-2">
                <Wallet className="w-7 h-7 text-white/42" />
                <span className="text-[10px] text-white/25 tracking-wide">connect wallet</span>
              </div>
            </FadeUp>

            <DashArrow />

            <FadeUp delay={0.26}>
              <DeployStep />
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Live terminal ── */}
      <section className="border-t border-white/6 py-28">
        <div className="max-w-3xl mx-auto px-6">
          <FadeUp className="text-center mb-12">
            <p className="text-xs text-white/22 tracking-[0.2em] uppercase mb-3">Live deployment</p>
            <h2 className="text-3xl font-bold text-white mb-3">Watch your contract go on-chain</h2>
            <p className="text-white/30 text-sm max-w-sm mx-auto">
              Streaming terminal logs so you see exactly what happens — from compile to contract address.
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <TerminalMockup />
          </FadeUp>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="border-t border-white/6 py-28 dot-bg">
        <div className="max-w-5xl mx-auto px-6">
          <FadeUp className="text-center mb-14">
            <p className="text-xs text-white/22 tracking-[0.2em] uppercase mb-3">Capabilities</p>
            <h2 className="text-3xl font-bold text-white mb-3">Everything you need</h2>
            <p className="text-white/32 text-sm max-w-sm mx-auto">
              A complete dev environment for building on Initia — right in your browser.
            </p>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ Icon, title, desc }, i) => (
              <FeatureCard key={title} Icon={Icon} title={title} desc={desc} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-white/6 py-28">
        <FadeUp>
          <div className="max-w-xl mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold text-white mb-4">Ready to build?</h2>
            <p className="text-white/32 mb-8 text-sm leading-relaxed">
              Open the IDE and ship your first Initia smart contract.
              Pre-funded deployer wallet included.
            </p>
            <Link href="/ide"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition-all text-sm">
              Launch InitCode IDE <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </FadeUp>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/6 py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ICLogo className="w-8 h-5 text-white/28" />
            <span className="text-white/22 text-xs">InitCode · Built for Initia Hackathon</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-white/20">
            <Link href="/ide" className="hover:text-white/55 transition-colors">IDE</Link>
            <a href="https://github.com/CodeswithrohStudio/initcode" target="_blank" rel="noopener noreferrer" className="hover:text-white/55 transition-colors">GitHub</a>
            <a href="https://initia.xyz" target="_blank" rel="noopener noreferrer" className="hover:text-white/55 transition-colors">Initia</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
