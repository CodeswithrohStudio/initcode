import Link from "next/link";
import {
  Code2,
  Rocket,
  Zap,
  Shield,
  Bot,
  ChevronRight,
  Terminal,
  Layers,
  GitBranch,
} from "lucide-react";

const features = [
  {
    icon: <Code2 className="w-5 h-5" />,
    title: "Monaco Editor",
    description:
      "Full-featured code editor with Rust syntax highlighting, autocomplete, and bracket matching — built for CosmWasm.",
  },
  {
    icon: <Rocket className="w-5 h-5" />,
    title: "One-Click Deploy",
    description:
      "Compile and deploy your contracts to Initia Testnet with a single click. Live streaming logs included.",
  },
  {
    icon: <Bot className="w-5 h-5" />,
    title: "AI Assistant",
    description:
      "Claude-powered AI assistant with context awareness. Audit, explain, and generate CosmWasm code on demand.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Dev Wallets",
    description:
      "Remix-style pre-funded dev accounts. Auto-connected with testnet INIT — no wallet setup required.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Contract Templates",
    description:
      "6 ready-to-use templates: Counter, CW20 Token, NFT, Escrow, Staking, and DAO Voting contracts.",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "File Explorer",
    description:
      "Full project file tree with create, rename, delete, and template loading. Everything you need in one panel.",
  },
];

const terminalLines = [
  { type: "muted", text: "$ initcode deploy --network testnet" },
  { type: "info", text: "→ Compiling contract.rs..." },
  { type: "info", text: "→ Running optimizer..." },
  { type: "info", text: "→ Uploading wasm binary..." },
  { type: "success", text: "✓ Code ID: 1247" },
  { type: "info", text: "→ Instantiating contract..." },
  { type: "success", text: "✓ Contract deployed at init1qyqs2rv...p6gq" },
  { type: "success", text: "✓ Tx Hash: A3F9BC12..." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white font-['Inter',sans-serif]">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
              <Code2 className="w-4 h-4 text-black" />
            </div>
            <span className="font-semibold text-white text-sm tracking-tight">InitCode</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#templates" className="hover:text-white transition-colors">Templates</a>
            <a
              href="https://github.com/CodeswithrohStudio/initcode"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
          </div>
          <Link
            href="/ide"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            Launch IDE
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-6xl mx-auto px-6 pt-24 pb-20 text-center overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/15 bg-white/5 text-xs text-white/60 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Built for INITIATE Hackathon · Initia Testnet
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight text-white mb-6">
            The IDE for
            <br />
            <span className="text-white/40">Initia smart contracts</span>
          </h1>

          <p className="text-lg text-white/40 max-w-xl mx-auto mb-10 leading-relaxed">
            Write, deploy, and test CosmWasm contracts directly in your browser.
            No setup. No config. Just code.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/ide"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition-all text-sm"
            >
              <Rocket className="w-4 h-4" />
              Open IDE
            </Link>
            <a
              href="https://github.com/CodeswithrohStudio/initcode"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-white/15 text-white/60 hover:text-white hover:border-white/30 transition-all text-sm"
            >
              <GitBranch className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Terminal preview */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="rounded-xl border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl">
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-[#111111]">
            <div className="w-3 h-3 rounded-full bg-[#2a2a2a]" />
            <div className="w-3 h-3 rounded-full bg-[#2a2a2a]" />
            <div className="w-3 h-3 rounded-full bg-[#2a2a2a]" />
            <div className="flex items-center gap-2 ml-4">
              <Terminal className="w-3.5 h-3.5 text-white/30" />
              <span className="text-[11px] text-white/30 font-mono">Terminal</span>
            </div>
          </div>
          <div className="p-5 font-mono text-[12px] leading-7 space-y-0.5">
            {terminalLines.map((line, i) => (
              <div
                key={i}
                className={
                  line.type === "success"
                    ? "text-emerald-400"
                    : line.type === "info"
                    ? "text-[#60a5fa]"
                    : "text-white/30"
                }
              >
                {line.text}
              </div>
            ))}
            <div className="flex items-center gap-1 mt-2">
              <span className="text-white/30">$</span>
              <span className="w-2 h-4 bg-white/60 animate-pulse rounded-sm" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Everything you need</h2>
          <p className="text-white/40 text-sm max-w-md mx-auto">
            A complete development environment for building on Initia — right in your browser.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="p-5 rounded-xl border border-white/8 bg-[#0a0a0a] hover:border-white/15 hover:bg-[#111111] transition-all group"
            >
              <div className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-white/50 group-hover:text-white group-hover:border-white/20 transition-all mb-4">
                {feat.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{feat.title}</h3>
              <p className="text-[13px] text-white/40 leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Templates section */}
      <section id="templates" className="border-t border-white/8 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-white mb-3">Start with a template</h2>
            <p className="text-white/40 text-sm max-w-md mx-auto">
              Pick a battle-tested contract template and ship your idea in minutes.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {[
              { name: "Counter", tag: "beginner" },
              { name: "CW20 Token", tag: "intermediate" },
              { name: "CW721 NFT", tag: "intermediate" },
              { name: "Escrow", tag: "intermediate" },
              { name: "Staking", tag: "advanced" },
              { name: "DAO Voting", tag: "advanced" },
            ].map((tpl) => (
              <Link
                key={tpl.name}
                href="/ide"
                className="flex items-center justify-between p-3.5 rounded-lg border border-white/8 bg-[#0a0a0a] hover:border-white/20 hover:bg-[#111111] transition-all group"
              >
                <span className="text-sm text-white/70 group-hover:text-white transition-colors font-medium">
                  {tpl.name}
                </span>
                <span className="text-[10px] text-white/25 group-hover:text-white/40 capitalize transition-colors">
                  {tpl.tag}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/8 py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to build?</h2>
          <p className="text-white/40 mb-8 text-sm leading-relaxed">
            Open the IDE and start writing your first Initia smart contract. Pre-funded dev wallet included.
          </p>
          <Link
            href="/ide"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-white text-black font-semibold hover:bg-white/90 transition-all text-sm"
          >
            <Code2 className="w-4 h-4" />
            Launch InitCode IDE
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-white flex items-center justify-center">
              <Code2 className="w-3 h-3 text-black" />
            </div>
            <span className="text-white/40 text-xs">InitCode · Built for Initia Hackathon</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/25">
            <Link href="/ide" className="hover:text-white/60 transition-colors">
              IDE
            </Link>
            <a
              href="https://github.com/CodeswithrohStudio/initcode"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://initia.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white/60 transition-colors"
            >
              Initia
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
