"use client";

import { useCallback } from "react";
import { useIDEStore, useActiveFile } from "@/store/ideStore";
import { TopBar } from "./TopBar";
import { FileTree } from "./FileTree";
import { EditorPanel } from "./EditorPanel";
import { AIAssistant } from "./AIAssistant";
import { BottomPanel } from "./BottomPanel";
import { cn } from "@/lib/utils";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function IDELayout() {
  const {
    leftPanelOpen,
    rightPanelOpen,
    addDeployment,
    updateDeployment,
    addLog,
    clearLogs,
    setDeploying,
    setBottomTab,
    setBottomPanelOpen,
    walletAddress,
    addChatMessage,
  } = useIDEStore();
  const activeFile = useActiveFile();

  const handleDeploy = useCallback(async () => {
    // walletAddress is always set (dev account auto-connected)
    const contractName = activeFile?.name?.replace(".rs", "") ?? "my-contract";
    const deployId = generateId();

    setDeploying(true);
    clearLogs();
    setBottomTab("terminal");
    setBottomPanelOpen(true);

    addDeployment({
      id: deployId,
      contractName,
      status: "compiling",
      timestamp: Date.now(),
      network: "initia-testnet",
    });

    try {
      const response = await fetch("/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractCode: activeFile?.content ?? "",
          contractName,
          walletAddress,
        }),
      });

      if (!response.body) throw new Error("No response stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "log") {
              addLog({ type: data.logType, message: data.message });
            } else if (data.type === "status") {
              updateDeployment(deployId, { status: data.status });
            } else if (data.type === "success") {
              updateDeployment(deployId, {
                status: "success",
                contractAddress: data.contractAddress,
                txHash: data.txHash,
                codeId: data.codeId,
              });
              addLog({ type: "success", message: `✓ Contract deployed at ${data.contractAddress}` });
              addLog({ type: "info", message: `  Code ID: ${data.codeId}` });
              addLog({ type: "info", message: `  Tx Hash: ${data.txHash}` });
              // Notify AI about successful deployment
              addChatMessage({
                role: "assistant",
                content: `✅ **Deployment successful!**\n\n**Contract:** \`${contractName}\`\n**Address:** \`${data.contractAddress}\`\n**Code ID:** ${data.codeId}\n**Network:** Initia Testnet\n\nYour contract is live! You can interact with it using the contract address above.`,
              });
            } else if (data.type === "error") {
              updateDeployment(deployId, { status: "failed", error: data.message });
              addLog({ type: "error", message: data.message });
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Deployment failed";
      updateDeployment(deployId, { status: "failed", error: message });
      addLog({ type: "error", message: `Deployment failed: ${message}` });
    } finally {
      setDeploying(false);
    }
  }, [
    walletAddress,
    activeFile,
    addDeployment,
    updateDeployment,
    addLog,
    clearLogs,
    setDeploying,
    setBottomTab,
    setBottomPanelOpen,
    addChatMessage,
  ]);

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f] overflow-hidden">
      <TopBar onDeploy={handleDeploy} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left panel — File Tree */}
        <div className={cn(
          "shrink-0 transition-all duration-200 overflow-hidden border-r border-[#2a2a2a]",
          leftPanelOpen ? "w-60" : "w-0"
        )}>
          {leftPanelOpen && <FileTree />}
        </div>

        {/* Center — Editor + Bottom */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <EditorPanel />
          <BottomPanel />
        </div>

        {/* Right panel — AI Assistant */}
        <div className={cn(
          "shrink-0 transition-all duration-200 overflow-hidden border-l border-[#2a2a2a]",
          rightPanelOpen ? "w-80" : "w-0"
        )}>
          {rightPanelOpen && <AIAssistant />}
        </div>
      </div>
    </div>
  );
}
