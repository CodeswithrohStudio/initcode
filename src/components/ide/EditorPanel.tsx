"use client";

import { useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useIDEStore, useActiveFile } from "@/store/ideStore";
import { Button } from "@/components/ui/button";
import { X, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

// Monaco must be dynamically imported (no SSR)
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

function EditorSkeleton() {
  return (
    <div className="flex-1 bg-[#0f0f0f] flex items-center justify-center">
      <div className="text-[#3a3a3a] text-sm font-mono">Loading editor...</div>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="flex-1 bg-[#0f0f0f] flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M16 4L28 10V22L16 28L4 22V10L16 4Z" stroke="#7c3aed" strokeWidth="1.5" fill="none" />
          <path d="M16 4V28M4 10L28 22M28 10L4 22" stroke="#7c3aed" strokeWidth="0.75" opacity="0.4" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white">InitCode</h2>
        <p className="text-sm text-[#6b7280] mt-1">Select a file from the explorer to start editing</p>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-[#6b7280]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#1a1a1a] border border-[#2a2a2a]">
          <kbd className="px-1.5 py-0.5 rounded bg-[#2a2a2a] text-[10px] font-mono">⌘S</kbd>
          <span>Save file</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#1a1a1a] border border-[#2a2a2a]">
          <kbd className="px-1.5 py-0.5 rounded bg-[#2a2a2a] text-[10px] font-mono">⌘P</kbd>
          <span>Quick open</span>
        </div>
      </div>
    </div>
  );
}

function TabBar() {
  const { openTabs, activeFileId, setActiveFile, closeTab } = useIDEStore();

  if (openTabs.length === 0) return null;

  return (
    <div className="flex items-center overflow-x-auto border-b border-[#2a2a2a] bg-[#141414] shrink-0 min-h-[36px]">
      {openTabs.map((tab) => (
        <div
          key={tab.fileId}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 cursor-pointer border-r border-[#2a2a2a] shrink-0 group",
            "text-xs transition-colors",
            activeFileId === tab.fileId
              ? "bg-[#0f0f0f] text-white border-t-2 border-t-violet-500 -mt-px"
              : "text-[#6b7280] hover:text-[#a8a8a8] hover:bg-[#1a1a1a]"
          )}
          onClick={() => setActiveFile(tab.fileId)}
        >
          <span className="truncate max-w-[120px]">{tab.name}</span>
          {tab.isDirty && (
            <Circle className="w-1.5 h-1.5 fill-violet-400 text-violet-400 shrink-0" />
          )}
          <button
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity hover:text-white shrink-0",
              activeFileId === tab.fileId && "opacity-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.fileId);
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function EditorPanel() {
  const { updateFileContent, openTabs, activeFileId } = useIDEStore();
  const activeFile = useActiveFile();
  const editorRef = useRef<unknown>(null);

  const handleEditorDidMount = useCallback((editor: unknown) => {
    editorRef.current = editor;
    // @ts-expect-error Monaco editor type
    editor.addCommand(2097152 | 49, () => {
      // Cmd+S — mark as saved (clear dirty)
      if (activeFileId) {
        useIDEStore.getState().openTabs.forEach((t) => {
          if (t.fileId === activeFileId) {
            useIDEStore.setState((s) => ({
              openTabs: s.openTabs.map((tab) =>
                tab.fileId === activeFileId ? { ...tab, isDirty: false } : tab
              ),
            }));
          }
        });
      }
    });
  }, [activeFileId]);

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-[#0f0f0f]">
      <TabBar />

      {!activeFile || openTabs.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <div className="flex-1 min-h-0">
          <MonacoEditor
            key={activeFile.id}
            height="100%"
            language={activeFile.language ?? "plaintext"}
            value={activeFile.content ?? ""}
            theme="vs-dark"
            onChange={(value) => {
              if (activeFile && value !== undefined) {
                updateFileContent(activeFile.id, value);
              }
            }}
            onMount={handleEditorDidMount}
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontLigatures: true,
              lineHeight: 1.6,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: "gutter",
              smoothScrolling: true,
              cursorBlinking: "smooth",
              bracketPairColorization: { enabled: true },
              guides: { bracketPairs: true },
              tabSize: 4,
              insertSpaces: true,
              automaticLayout: true,
              suggest: { showWords: true },
              quickSuggestions: true,
              scrollbar: {
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
            }}
          />
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 h-5 bg-[#141414] border-t border-[#2a2a2a] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#6b7280]">
            {activeFile?.language?.toUpperCase() ?? ""}
          </span>
          {activeFile && (
            <span className="text-[10px] text-[#6b7280]">
              {activeFile.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#6b7280]">UTF-8</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-[#6b7280]">Initia Testnet</span>
          </div>
        </div>
      </div>
    </div>
  );
}
