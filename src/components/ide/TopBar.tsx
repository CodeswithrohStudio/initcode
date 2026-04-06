"use client";

import { useState, useEffect } from "react";
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
  Check,
  Copy,
  Wallet,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitUsername } from "@/lib/devWallets";
import { ICLogo } from "@/components/ICLogo";

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
    setLeftPanelOpen,
    setRightPanelOpen,
    setProjectName,
    setWallet,
    disconnectWallet,
    setWalletBalance,
    setWalletConnecting,
  } = useIDEStore();

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  // "connect own wallet" flow
  const [showConnectInput, setShowConnectInput] = useState(false);
  const [customAddress, setCustomAddress] = useState("");
  // Whether we're showing the deployer wallet or a custom one
  const [deployerAddress, setDeployerAddress] = useState<string | null>(null);
  const [deployerBalance, setDeployerBalance] = useState<number>(0);

  // Fetch deployer wallet from server on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/wallet-info");
        if (!res.ok) return;
        const { address, balanceINIT } = await res.json();
        setDeployerAddress(address);
        setDeployerBalance(balanceINIT);
        // Auto-connect deployer wallet if no custom wallet connected
        setWallet(address, getInitUsername(address));
        setWalletBalance(balanceINIT);
      } catch {
        // Ignore — leave wallet as null
        setWalletConnecting(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshBalance = async () => {
    setBalanceLoading(true);
    try {
      const res = await fetch("/api/wallet-info");
      if (res.ok) {
        const { balanceINIT } = await res.json();
        setDeployerBalance(balanceINIT);
        if (walletAddress === deployerAddress) setWalletBalance(balanceINIT);
      }
    } catch { /* ignore */ }
    setBalanceLoading(false);
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleConnectCustom = () => {
    const addr = customAddress.trim();
    if (!addr.startsWith("init1") || addr.length < 20) return;
    setWallet(addr, getInitUsername(addr));
    setWalletBalance(0); // can't know external balance
    setShowConnectInput(false);
    setCustomAddress("");
    setShowWalletMenu(false);
  };

  const handleSwitchToDeployer = () => {
    if (deployerAddress) {
      setWallet(deployerAddress, getInitUsername(deployerAddress));
      setWalletBalance(deployerBalance);
    }
    setShowWalletMenu(false);
  };

  const handleNameSave = () => {
    setProjectName(tempName.trim() || "my-initia-project");
    setEditingName(false);
  };

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-6)}`
    : "Loading...";

  const isDeployerWallet = walletAddress === deployerAddress;

  return (
    <header className="flex items-center h-12 px-3 border-b border-[#2a2a2a] bg-[#0f0f0f] shrink-0 gap-2 z-50">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <ICLogo className="w-10 h-7 text-white" />
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
            className="h-6 text-xs bg-[#1e1e1e] border-white/40 text-white w-48 px-2"
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

        {/* Wallet button */}
        <div className="relative">
          <button
            className="flex items-center gap-2 h-7 px-2.5 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#242424] hover:border-[#3a3a3a] transition-all"
            onClick={() => setShowWalletMenu(!showWalletMenu)}
          >
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "w-1.5 h-1.5 rounded-full shrink-0",
                walletAddress ? "bg-emerald-400" : "bg-[#6b7280] animate-pulse"
              )} />
              <span className="text-[11px] font-mono text-[#c8c8c8]">{shortAddress}</span>
            </div>
            {walletAddress && (
              <div className="flex items-center gap-1 pl-2 border-l border-[#2a2a2a]">
                <span className="text-[11px] font-semibold text-emerald-400">
                  {walletBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-[#6b7280]">INIT</span>
              </div>
            )}
            <ChevronDown className="w-3 h-3 text-[#6b7280] shrink-0" />
          </button>

          {showWalletMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setShowWalletMenu(false); setShowConnectInput(false); }} />
              <div className="absolute right-0 top-9 z-50 w-80 rounded-lg border border-[#2a2a2a] bg-[#141414] shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#1a1a1a]">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-[#a8a8a8]" />
                    <span className="text-xs font-semibold text-white">
                      {isDeployerWallet ? "Deployer Wallet" : "Connected Wallet"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#6b7280]">Initia Testnet</span>
                </div>

                {/* Active wallet */}
                {walletAddress && (
                  <div className="p-3 border-b border-[#2a2a2a]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">
                        {isDeployerWallet ? "Server Deployer" : "Your Wallet"}
                      </span>
                      <button
                        onClick={handleCopyAddress}
                        className="flex items-center gap-1 text-[10px] text-[#6b7280] hover:text-white transition-colors"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-[11px] font-mono text-[#c8c8c8] break-all">{walletAddress}</p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-emerald-400">
                          {walletBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </span>
                        <span className="text-xs text-[#6b7280]">INIT</span>
                      </div>
                      {isDeployerWallet && (
                        <button
                          onClick={handleRefreshBalance}
                          disabled={balanceLoading}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2a2a2a] border border-[#3a3a3a] text-[#c8c8c8] text-[11px] hover:bg-[#3a3a3a] transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={cn("w-3 h-3", balanceLoading && "animate-spin")} />
                          Refresh
                        </button>
                      )}
                    </div>

                    {/* Switch back to deployer if on custom wallet */}
                    {!isDeployerWallet && deployerAddress && (
                      <button
                        onClick={handleSwitchToDeployer}
                        className="mt-2 w-full text-[11px] text-[#6b7280] hover:text-white text-left transition-colors"
                      >
                        ← Switch back to deployer wallet
                      </button>
                    )}
                  </div>
                )}

                {/* Connect own wallet */}
                <div className="p-3">
                  {!showConnectInput ? (
                    <button
                      onClick={() => setShowConnectInput(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-dashed border-[#3a3a3a] text-[#6b7280] text-[11px] hover:border-[#5a5a5a] hover:text-[#a8a8a8] transition-colors"
                    >
                      <Wallet className="w-3 h-3" />
                      Connect your own wallet
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#6b7280] uppercase tracking-wider">Wallet address</span>
                        <button onClick={() => setShowConnectInput(false)}>
                          <X className="w-3 h-3 text-[#6b7280] hover:text-white" />
                        </button>
                      </div>
                      <Input
                        placeholder="init1..."
                        value={customAddress}
                        onChange={(e) => setCustomAddress(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleConnectCustom()}
                        className="h-7 text-[11px] bg-[#1e1e1e] border-[#3a3a3a] text-white font-mono placeholder:text-[#4b5563]"
                        autoFocus
                      />
                      <button
                        onClick={handleConnectCustom}
                        disabled={!customAddress.startsWith("init1") || customAddress.length < 20}
                        className="w-full px-3 py-1.5 rounded-md bg-white text-black text-[11px] font-semibold hover:bg-white/90 transition-colors disabled:opacity-40"
                      >
                        Connect
                      </button>
                      <p className="text-[10px] text-[#4b5563]">
                        Transactions are signed by the server deployer key regardless of the display address.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Deploy button */}
        <Button
          size="sm"
          className={cn(
            "h-7 text-xs gap-1.5 bg-white hover:bg-[#e0e0e0] text-black border-0 font-semibold",
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
