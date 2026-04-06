"use client";

import { useIDEStore } from "@/store/ideStore";
import type { BottomTab, LogEntry, Deployment } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Terminal,
  AlertCircle,
  Rocket,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useEffect } from "react";

function LogIcon({ type }: { type: LogEntry["type"] }) {
  const base = "shrink-0 mt-[1px]";
  switch (type) {
    case "success": return <CheckCircle2 className={cn(base, "w-3 h-3 text-emerald-400")} />;
    case "error":   return <XCircle      className={cn(base, "w-3 h-3 text-red-400")} />;
    case "warning": return <TriangleAlert className={cn(base, "w-3 h-3 text-yellow-400")} />;
    case "info":    return <Info          className={cn(base, "w-3 h-3 text-sky-400")} />;
    default:        return <span className="w-3 h-3 shrink-0" />;
  }
}

function LogLine({ log }: { log: LogEntry }) {
  const colorMap: Record<LogEntry["type"], string> = {
    success: "text-emerald-400/90",
    error:   "text-red-400/90",
    warning: "text-yellow-400/90",
    info:    "text-sky-400/90",
    muted:   "text-white/25",
  };

  return (
    <div className="flex items-start gap-2 px-3 py-[3px] font-mono text-[11px] hover:bg-[#1a1a1a] group">
      <span className="text-[#3a3a3a] shrink-0 pt-[1px] group-hover:text-[#4b5563] transition-colors">
        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
      <LogIcon type={log.type} />
      <span className={cn(colorMap[log.type], "leading-relaxed")}>{log.message}</span>
    </div>
  );
}

function DeploymentItem({ deployment }: { deployment: Deployment }) {
  const statusIcon = {
    pending: <Clock className="w-3.5 h-3.5 text-[#6b7280]" />,
    compiling: <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />,
    storing: <Loader2 className="w-3.5 h-3.5 text-[#a8a8a8] animate-spin" />,
    instantiating: <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />,
    success: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    failed: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  };

  const statusColor = {
    pending: "text-[#6b7280]",
    compiling: "text-blue-400",
    storing: "text-[#a8a8a8]",
    instantiating: "text-yellow-400",
    success: "text-emerald-400",
    failed: "text-red-400",
  };

  return (
    <div className="flex items-start gap-3 p-3 border-b border-[#2a2a2a] hover:bg-[#1a1a1a] transition-colors">
      <div className="mt-0.5">{statusIcon[deployment.status]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white truncate">
            {deployment.contractName}
          </span>
          <span className={cn("text-[10px] capitalize", statusColor[deployment.status])}>
            {deployment.status}
          </span>
        </div>
        {deployment.contractAddress && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-[#6b7280]">Address:</span>
            <span className="text-[10px] font-mono text-[#c0c0c0] truncate">
              {deployment.contractAddress}
            </span>
          </div>
        )}
        {deployment.txHash && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-[#6b7280]">Tx:</span>
            <span className="text-[10px] font-mono text-[#a8a8a8] truncate">
              {deployment.txHash.slice(0, 16)}...
            </span>
            <a
              href={`https://scan.testnet.initia.xyz/tx/${deployment.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a8a8a8] hover:text-white"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
        {deployment.error && (
          <p className="text-[10px] text-red-400 mt-0.5 font-mono truncate">
            {deployment.error}
          </p>
        )}
        <span className="text-[10px] text-[#4b5563]">
          {new Date(deployment.timestamp).toLocaleString()}
        </span>
      </div>
      <Badge
        variant="outline"
        className="text-[9px] shrink-0 border-[#2a2a2a] text-[#6b7280]"
      >
        {deployment.network}
      </Badge>
    </div>
  );
}

export function BottomPanel() {
  const {
    bottomTab,
    bottomPanelOpen,
    deployLogs,
    deployments,
    clearLogs,
    setBottomTab,
    setBottomPanelOpen,
  } = useIDEStore();
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomTab === "terminal") {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [deployLogs, bottomTab]);

  const tabs: { id: BottomTab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: "terminal",
      label: "Terminal",
      icon: <Terminal className="w-3 h-3" />,
    },
    {
      id: "problems",
      label: "Problems",
      icon: <AlertCircle className="w-3 h-3" />,
      count: deployLogs.filter((l) => l.type === "error").length || undefined,
    },
    {
      id: "deployments",
      label: "Deployments",
      icon: <Rocket className="w-3 h-3" />,
      count: deployments.length || undefined,
    },
  ];

  return (
    <div className="flex flex-col border-t border-[#2a2a2a] bg-[#0f0f0f] shrink-0 h-[220px]">
      {/* Tab bar */}
      <div className="flex items-center border-b border-[#2a2a2a] bg-[#141414] shrink-0 h-[30px]">
        <div className="flex items-center flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "flex items-center gap-1.5 px-3 h-full text-[11px] border-r border-[#2a2a2a] transition-colors whitespace-nowrap",
                bottomTab === tab.id && bottomPanelOpen
                  ? "text-white bg-[#0f0f0f]"
                  : "text-[#6b7280] hover:text-[#a8a8a8] hover:bg-[#1a1a1a]"
              )}
              onClick={() => {
                if (bottomTab === tab.id) {
                  setBottomPanelOpen(!bottomPanelOpen);
                } else {
                  setBottomTab(tab.id);
                  setBottomPanelOpen(true);
                }
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span className="px-1 rounded-full bg-[#2a2a2a] text-[9px]">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 px-2">
          {bottomTab === "terminal" && deployLogs.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-[#6b7280] hover:text-white hover:bg-[#2a2a2a]"
              onClick={clearLogs}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[#6b7280] hover:text-white hover:bg-[#2a2a2a]"
            onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
          >
            {bottomPanelOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronUp className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Panel content */}
      {bottomPanelOpen && (
        <div className="flex-1 min-h-0 overflow-hidden">
          {bottomTab === "terminal" && (
            <ScrollArea className="h-full">
              {deployLogs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[11px] text-[#4b5563] font-mono py-8">
                  $ Ready. Click Deploy to start compilation.
                </div>
              ) : (
                <div className="py-1">
                  {deployLogs.map((log) => (
                    <LogLine key={log.id} log={log} />
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </ScrollArea>
          )}

          {bottomTab === "problems" && (
            <ScrollArea className="h-full">
              {deployLogs.filter((l) => l.type === "error" || l.type === "warning")
                .length === 0 ? (
                <div className="flex items-center justify-center h-full text-[11px] text-[#4b5563] py-8">
                  No problems detected
                </div>
              ) : (
                <div className="py-1">
                  {deployLogs
                    .filter((l) => l.type === "error" || l.type === "warning")
                    .map((log) => (
                      <LogLine key={log.id} log={log} />
                    ))}
                </div>
              )}
            </ScrollArea>
          )}

          {bottomTab === "deployments" && (
            <ScrollArea className="h-full">
              {deployments.length === 0 ? (
                <div className="flex items-center justify-center h-full text-[11px] text-[#4b5563] py-8">
                  No deployments yet. Click Deploy to get started.
                </div>
              ) : (
                <div>
                  {deployments.map((d) => (
                    <DeploymentItem key={d.id} deployment={d} />
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
