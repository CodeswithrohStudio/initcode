"use client";

import { useState, useRef, useEffect } from "react";
import { useIDEStore, useActiveFile } from "@/store/ideStore";
import type { ChatMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  Trash2,
  Loader2,
  Sparkles,
  ShieldCheck,
  FileCode,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <FileCode className="w-3.5 h-3.5" />,
    label: "Generate boilerplate",
    prompt: "Generate a complete CW20 token contract with capped supply and admin mint function for Initia.",
  },
  {
    icon: <ShieldCheck className="w-3.5 h-3.5" />,
    label: "Security audit",
    prompt: "Perform a security audit of my current contract. Check for reentrancy, access control, and overflow vulnerabilities.",
  },
  {
    icon: <Sparkles className="w-3.5 h-3.5" />,
    label: "Explain errors",
    prompt: "Explain any compilation or deployment errors in my current contract and suggest fixes.",
  },
  {
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    label: "Initia help",
    prompt: "What are the Initia testnet chain ID and RPC endpoints? How do I get testnet tokens?",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#3a3a3a]"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-400" />
      ) : (
        <Copy className="w-3 h-3 text-[#6b7280]" />
      )}
    </button>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={cn(
        "group flex gap-2 px-3 py-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-[#333333] flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div
        className={cn(
          "min-w-0 overflow-hidden px-3 py-2 text-xs leading-relaxed",
          isUser
            ? "max-w-[85%] chat-message-user text-white"
            : "w-full chat-message-ai text-[#c8c8c8]"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        ) : (
          <div className="prose prose-invert prose-xs max-w-none break-words
            [&_pre]:bg-[#0f0f0f] [&_pre]:rounded [&_pre]:p-2.5 [&_pre]:text-[11px] [&_pre]:overflow-x-auto [&_pre]:whitespace-pre [&_pre]:my-2
            [&_code]:text-[#e0e0e0] [&_code]:text-[11px] [&_code]:break-words
            [&_p]:mb-2 [&_p]:leading-relaxed [&_p]:break-words
            [&_ul]:pl-4 [&_ul]:mb-2 [&_ol]:pl-4 [&_ol]:mb-2
            [&_li]:mb-0.5 [&_li]:break-words
            [&_h1]:text-sm [&_h1]:font-semibold [&_h1]:mb-1 [&_h1]:mt-2
            [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:mb-1 [&_h2]:mt-2
            [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:mb-1 [&_h3]:mt-2
            [&_strong]:text-white [&_strong]:font-semibold
            [&_blockquote]:border-l-2 [&_blockquote]:border-[#3a3a3a] [&_blockquote]:pl-2 [&_blockquote]:text-[#a8a8a8]">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
        <div className={cn("flex items-center mt-1", isUser ? "justify-start" : "justify-end")}>
          {!isUser && <CopyButton text={msg.content} />}
          <span className="text-[10px] text-[#4b5563]">
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AIAssistant() {
  const {
    chatMessages,
    isChatLoading,
    addChatMessage,
    clearChat,
    setChatLoading,
  } = useIDEStore();
  const activeFile = useActiveFile();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isChatLoading) return;
    setInput("");

    addChatMessage({ role: "user", content });
    setChatLoading(true);

    try {
      const context = activeFile
        ? `\n\nCurrent file: ${activeFile.name}\n\`\`\`${activeFile.language ?? ""}\n${activeFile.content?.slice(0, 4000) ?? ""}\n\`\`\``
        : "";

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...chatMessages.slice(-10).map((m) => ({
              role: m.role,
              content: m.content,
            })),
            { role: "user", content: content + context },
          ],
        }),
      });

      if (!response.ok) throw new Error("AI request failed");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = "";

      // Add empty assistant message to stream into
      addChatMessage({ role: "assistant", content: "" });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content ?? parsed.delta?.text ?? "";
              if (delta) {
                aiContent += delta;
                // Update last message
                useIDEStore.setState((s) => ({
                  chatMessages: s.chatMessages.map((m, i) =>
                    i === s.chatMessages.length - 1
                      ? { ...m, content: aiContent }
                      : m
                  ),
                }));
              }
            } catch {
              // Non-JSON line, skip
            }
          }
        }
      }

      if (!aiContent) {
        // Fallback: update with a default message
        useIDEStore.setState((s) => ({
          chatMessages: s.chatMessages.map((m, i) =>
            i === s.chatMessages.length - 1
              ? { ...m, content: "I received your message. How can I help you with your Initia smart contract?" }
              : m
          ),
        }));
      }
    } catch (error) {
      addChatMessage({
        role: "assistant",
        content: "Sorry, I encountered an error. Please check your API key configuration and try again.",
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#141414] border-l border-[#2a2a2a]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#333333] flex items-center justify-center">
            <Bot className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-white">AI Assistant</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#2a2a2a] text-[#a8a8a8]">
            custom
          </span>
        </div>
        <div className="flex items-center gap-1">
          {activeFile && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1e1e1e] border border-[#2a2a2a]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-[#6b7280] truncate max-w-[80px]">
                {activeFile.name}
              </span>
            </div>
          )}
          {chatMessages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-[#6b7280] hover:text-red-400 hover:bg-[#2a2a2a]"
              onClick={clearChat}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] px-4 py-8 gap-4">
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-white">InitCode AI</p>
              <p className="text-[11px] text-[#6b7280] mt-1">
                Context-aware assistant for CosmWasm & Initia development
              </p>
            </div>
            <div className="grid grid-cols-1 gap-1.5 w-full">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] hover:border-white/30 hover:bg-[#1e1e1e] transition-all text-left"
                  onClick={() => sendMessage(action.prompt)}
                >
                  <span className="text-[#a8a8a8]">{action.icon}</span>
                  <span className="text-xs text-[#a8a8a8]">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-2">
            {chatMessages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {isChatLoading && chatMessages[chatMessages.length - 1]?.role === "user" && (
              <div className="flex gap-2 px-3 py-2">
                <div className="w-6 h-6 rounded-full bg-[#333333] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="chat-message-ai px-3 py-2 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-[#a8a8a8]" />
                  <span className="text-xs text-[#6b7280]">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-[#2a2a2a] shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about CosmWasm, Initia, or your contract..."
            className="min-h-[60px] max-h-[120px] text-xs bg-[#1e1e1e] border-[#2a2a2a] text-white placeholder:text-[#4b5563] resize-none focus-visible:ring-white focus-visible:ring-1"
            disabled={isChatLoading}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0 bg-white hover:bg-[#e0e0e0] text-black"
            onClick={() => sendMessage(input)}
            disabled={isChatLoading || !input.trim()}
          >
            {isChatLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-[#4b5563] mt-1.5">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  );
}
