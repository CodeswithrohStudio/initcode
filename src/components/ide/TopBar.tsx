"use client";

import { useState } from "react";
import { useIDEStore } from "@/store/ideStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Rocket,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  Loader2,
  Zap,
  Code2,
  Droplets,
  Check,
  Copy,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onDeploy: () => void;
}

export function TopBar({ onDeploy }: TopBarProps) {
  const {
    walletAddress,
    initUsername,
    isDeploying,
    projectName,
    leftPanelOpen,
    rightPanelOpen,
    walletBalance,
    selectedAccountIndex,
    devAccounts,
    setLeftPanelOpen,
    setRightPanelOpen,
    setProjectName,
    selectAccount,
    requestFaucet,
  } = useIDEStore();

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleNameSave = () => {
    setProjectName(tempName.trim() || "my-initia-project");
    setEditingName(false);
  };

  const handleFaucet = async () => {
    setFaucetLoading(true);
    // Simulate network call
    await new Promise((r) => setTimeout(r, 1200));
    requestFaucet();
    setFaucetLoading(false);
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-6)}`
    : "";

  return (
    <header className="flex items-center h-12 px-3 border-b border-[#2a2a2a] bg-[#0f0f0f] shrink-0 gap-2 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-violet-600">
          <Code2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-sm text-white">InitCode</span>
      </div>

      <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

      {/* Panel toggles */}
      <div className="flex items-center gap-1">
        <button
          title={leftPanelOpen ? "Hide file explorer" : "Show file explorer"}
          className="h-7 w-7 flex items-center justify-center rounded text-[#6b7280] hover:text-white hover:bg-[#1e1e1e] transition-colors"
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        >
          {leftPanelOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
        </button>
        <button
          title={rightPanelOpen ? "Hide AI assistant" : "Show AI assistant"}
          className="h-7 w-7 flex items-center justify-center rounded text-[#6b7280] hover:text-white hover:bg-[#1e1e1e] transition-colors"
          onClick={() => setRightPanelOpen(!rightPanelOpen)}
        >
          {rightPanelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="w-px h-5 bg-[#2a2a2a] mx-1" />

      {/* Project name */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {editingName ? (
          <Input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSave();
              if (e.key === "Escape") setEditingName(false);
            }}
            className="h-6 text-xs bg-[#1e1e1e] border-violet-500 text-white w-48 px-2"
            autoFocus
          />
        ) : (
          <button
            onClick={() => { setTempName(projectName); setEditingName(true); }}
            className="text-sm text-[#a8a8a8] hover:text-white truncate max-w-[200px] text-left"
          >
            {projectName}
          </button>
        )}
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#2a2a2a] text-[#6b7280] shrink-0">
          testnet
        </Badge>
      </div>

      {/* Right side — wallet + deploy */}
      <div className="flex items-center gap-2 shrink-0">

        {/* .init username badge */}
        {initUsername && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1e1e1e] border border-[#2a2a2a]">
            <Zap className="w-3 h-3 text-violet-400" />
            <span className="text-xs text-violet-300 font-mono">{initUsername}</span>
          </div>
        )}

        {/* Account selector — Remix-style */}
        <div className="relative">
          <button
            className="flex items-center gap-2 h-7 px-2.5 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#242424] hover:border-[#3a3a3a] transition-all"
            onClick={() => setShowAccountMenu(!showAccountMenu)}
          >
            {/* Green dot — always connected */}
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-[11px] font-mono text-[#c8c8c8]">{shortAddress}</span>
            </div>

            {/* Balance */}
            <div className="flex items-center gap-1 pl-2 border-l border-[#2a2a2a]">
              <span className="text-[11px] font-semibold text-emerald-400">
                {walletBalance.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </span>
              <span className="text-[10px] text-[#6b7280]">INIT</span>
            </div>

            <ChevronDown className="w-3 h-3 text-[#6b7280] shrink-0" />
          </button>

          {showAccountMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAccountMenu(false)} />
              <div className="absolute right-0 top-9 z-50 w-80 rounded-lg border border-[#2a2a2a] bg-[#141414] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#1a1a1a]">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-xs font-semibold text-white">Dev Accounts</span>
                  </div>
                  <span className="text-[10px] text-[#6b7280]">Initia Testnet · Pre-funded</span>
                </div>

                {/* Current account detail */}
                <div className="p-3 border-b border-[#2a2a2a] bg-[#0f0f0f]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">Active Account</span>
                    <button
                      onClick={handleCopyAddress}
                      className="flex items-center gap-1 text-[10px] text-[#6b7280] hover:text-white transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-[11px] font-mono text-violet-300 break-all">{walletAddress}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-emerald-400">
                        {walletBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-[#6b7280]">INIT</span>
                    </div>
                    <button
                      onClick={handleFaucet}
                      disabled={faucetLoading}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-900/40 border border-violet-700/50 text-violet-300 text-[11px] hover:bg-violet-900/60 transition-colors disabled:opacity-50"
                    >
                      {faucetLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Droplets className="w-3 h-3" />
                      )}
                      {faucetLoading ? "Requesting..." : "+100 INIT"}
                    </button>
                  </div>
                </div>

                {/* Account list */}
                <div className="max-h-48 overflow-y-auto">
                  {devAccounts.map((account) => (
                    <button
                      key={account.index}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 transition-colors text-left",
                        "hover:bg-[#1e1e1e] border-b border-[#1e1e1e]",
                        selectedAccountIndex === account.index && "bg-[#1a1a1a]"
                      )}
                      onClick={() => {
                        selectAccount(account.index);
                        setShowAccountMenu(false);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          selectedAccountIndex === account.index ? "bg-emerald-400" : "bg-[#3a3a3a]"
                        )} />
                        <div className="min-w-0">
                          <p className="text-[11px] text-[#a8a8a8]">{account.label}</p>
                          <p className="text-[10px] font-mono text-[#6b7280] truncate">
                            {account.address.slice(0, 14)}...{account.address.slice(-6)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1 shrink-0 ml-2">
                        <span className="text-[11px] font-semibold text-emerald-400">
                          {account.balance.toLocaleString()}
                        </span>
                        <span className="text-[9px] text-[#6b7280]">INIT</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Footer hint */}
                <div className="px-3 py-2 bg-[#1a1a1a] border-t border-[#2a2a2a]">
                  <p className="text-[10px] text-[#4b5563]">
                    These are dev accounts pre-loaded with testnet INIT. Use the faucet for more.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Deploy button */}
        <Button
          size="sm"
          className={cn(
            "h-7 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white border-0 font-semibold",
            !isDeploying && "deploy-btn-pulse"
          )}
          onClick={onDeploy}
          disabled={isDeploying}
        >
          {isDeploying ? (
            <><Loader2 className="w-3 h-3 animate-spin" />Deploying...</>
          ) : (
            <><Rocket className="w-3 h-3" />Deploy</>
          )}
        </Button>
      </div>
    </header>
  );
}
