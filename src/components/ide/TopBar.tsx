"use client";

import { useState } from "react";
import { useIDEStore } from "@/store/ideStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Rocket,
  Wallet,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  Check,
  Loader2,
  Zap,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onDeploy: () => void;
}

export function TopBar({ onDeploy }: TopBarProps) {
  const {
    walletAddress,
    initUsername,
    isWalletConnecting,
    isDeploying,
    projectName,
    leftPanelOpen,
    rightPanelOpen,
    setLeftPanelOpen,
    setRightPanelOpen,
    setProjectName,
    setWallet,
    disconnectWallet,
    setWalletConnecting,
  } = useIDEStore();

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  const handleConnectWallet = async () => {
    if (walletAddress) {
      setShowWalletMenu(!showWalletMenu);
      return;
    }
    setWalletConnecting(true);
    // Simulate wallet connection
    await new Promise((r) => setTimeout(r, 1500));
    const mockAddress = "init1" + Math.random().toString(36).slice(2, 12);
    const mockUsername = "builder" + Math.floor(Math.random() * 999);
    setWallet(mockAddress, mockUsername + ".init");
  };

  const handleNameSave = () => {
    setProjectName(tempName.trim() || "my-initia-project");
    setEditingName(false);
  };

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
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#6b7280] hover:text-white hover:bg-[#1e1e1e]"
              onClick={() => setLeftPanelOpen(!leftPanelOpen)}
            >
              {leftPanelOpen ? (
                <PanelLeftClose className="w-3.5 h-3.5" />
              ) : (
                <PanelLeftOpen className="w-3.5 h-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {leftPanelOpen ? "Hide" : "Show"} file explorer
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#6b7280] hover:text-white hover:bg-[#1e1e1e]"
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
            >
              {rightPanelOpen ? (
                <PanelRightClose className="w-3.5 h-3.5" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {rightPanelOpen ? "Hide" : "Show"} AI assistant
          </TooltipContent>
        </Tooltip>
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
            onClick={() => {
              setTempName(projectName);
              setEditingName(true);
            }}
            className="text-sm text-[#a8a8a8] hover:text-white truncate max-w-[200px] text-left"
          >
            {projectName}
          </button>
        )}

        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-[#2a2a2a] text-[#6b7280] shrink-0"
        >
          testnet
        </Badge>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* .init identity */}
        {initUsername && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1e1e1e] border border-[#2a2a2a]">
            <Zap className="w-3 h-3 text-violet-400" />
            <span className="text-xs text-violet-300 font-mono">{initUsername}</span>
          </div>
        )}

        {/* Wallet button */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 text-xs gap-1.5 border-[#2a2a2a] bg-[#1a1a1a] hover:bg-[#2a2a2a]",
              walletAddress ? "text-emerald-400 border-emerald-800/50" : "text-[#a8a8a8]"
            )}
            onClick={handleConnectWallet}
            disabled={isWalletConnecting}
          >
            {isWalletConnecting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Connecting...
              </>
            ) : walletAddress ? (
              <>
                <Check className="w-3 h-3" />
                {walletAddress.slice(0, 8)}...{walletAddress.slice(-4)}
                <ChevronDown className="w-3 h-3" />
              </>
            ) : (
              <>
                <Wallet className="w-3 h-3" />
                Connect Wallet
              </>
            )}
          </Button>

          {showWalletMenu && walletAddress && (
            <div className="absolute right-0 top-9 z-50 w-48 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] shadow-xl">
              <div className="p-2 border-b border-[#2a2a2a]">
                <p className="text-xs text-[#6b7280]">Connected as</p>
                <p className="text-xs text-white font-mono truncate">{walletAddress}</p>
              </div>
              <button
                onClick={() => {
                  disconnectWallet();
                  setShowWalletMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-[#2a2a2a] transition-colors"
              >
                Disconnect
              </button>
            </div>
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
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <Rocket className="w-3 h-3" />
              Deploy
            </>
          )}
        </Button>
      </div>

      {/* Backdrop for wallet menu */}
      {showWalletMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowWalletMenu(false)}
        />
      )}
    </header>
  );
}
