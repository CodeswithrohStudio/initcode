"use client";

import { useState, useRef } from "react";
import { useIDEStore } from "@/store/ideStore";
import { TEMPLATES } from "@/lib/templates";
import type { FileNode } from "@/types";
import type { Template } from "@/lib/templates";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit2,
  LayoutTemplate,
  FileCode,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getFileIcon(name: string) {
  if (name.endsWith(".rs")) return <FileCode className="w-3.5 h-3.5 text-orange-400" />;
  if (name.endsWith(".toml")) return <FileText className="w-3.5 h-3.5 text-blue-400" />;
  if (name.endsWith(".json")) return <FileText className="w-3.5 h-3.5 text-yellow-400" />;
  if (name.endsWith(".md")) return <FileText className="w-3.5 h-3.5 text-[#6b7280]" />;
  return <File className="w-3.5 h-3.5 text-[#6b7280]" />;
}

interface ContextMenu {
  x: number;
  y: number;
  fileId: string;
  fileType: "file" | "folder";
}

interface FileTreeNodeProps {
  node: FileNode;
  depth?: number;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

function FileTreeNode({ node, depth = 0, onContextMenu }: FileTreeNodeProps) {
  const { activeFileId, setActiveFile } = useIDEStore();
  const [expanded, setExpanded] = useState(true);
  const isActive = activeFileId === node.id;

  if (node.type === "folder") {
    return (
      <div>
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 cursor-pointer group hover:bg-[#1e1e1e] rounded-sm mx-1",
            isActive && "bg-[#1e1e1e]"
          )}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={() => setExpanded(!expanded)}
          onContextMenu={(e) => onContextMenu(e, node)}
        >
          <span className="text-[#6b7280]">
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
          {expanded ? (
            <FolderOpen className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          )}
          <span className="text-xs text-[#c8c8c8] truncate">{node.name}</span>
        </div>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-0.5 cursor-pointer group hover:bg-[#1e1e1e] rounded-sm mx-1",
        isActive && "bg-[#1e1e1e] text-white"
      )}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
      onClick={() => setActiveFile(node.id)}
      onContextMenu={(e) => onContextMenu(e, node)}
    >
      {getFileIcon(node.name)}
      <span
        className={cn(
          "text-xs truncate",
          isActive ? "text-white" : "text-[#a8a8a8] group-hover:text-[#c8c8c8]"
        )}
      >
        {node.name}
      </span>
    </div>
  );
}

export function FileTree() {
  const { files, addFile, deleteFile, renameFile } = useIDEStore();
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [creating, setCreating] = useState<{
    parentId: string | null;
    type: "file" | "folder";
  } | null>(null);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, fileId: node.id, fileType: node.type });
  };

  const handleCreate = (type: "file" | "folder") => {
    setCreating({ parentId: null, type });
    setNewName("");
    setContextMenu(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const commitCreate = () => {
    if (newName.trim() && creating) {
      addFile(newName.trim(), creating.parentId, creating.type);
    }
    setCreating(null);
    setNewName("");
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      renameFile(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleLoadTemplate = (template: Template) => {
    const { addFile, setActiveFile, files } = useIDEStore.getState();
    // Clear src folder and add template files
    template.files.forEach((f, i) => {
      const srcFolder = files.find((n) => n.name === "src" && n.type === "folder");
      if (f.name === "contract.rs" && srcFolder) {
        // Update existing contract.rs content
        const contractFile = srcFolder.children?.find((c) => c.name === "contract.rs");
        if (contractFile) {
          useIDEStore.getState().updateFileContent(contractFile.id, f.content);
          if (i === 0) setActiveFile(contractFile.id);
          return;
        }
      }
      addFile(f.name, null, "file");
      // Set content after adding
      setTimeout(() => {
        const updatedFiles = useIDEStore.getState().files;
        const found = updatedFiles.find((n) => n.name === f.name && n.type === "file");
        if (found) {
          useIDEStore.getState().updateFileContent(found.id, f.content);
          if (i === 0) setActiveFile(found.id);
        }
      }, 10);
    });
    setShowTemplates(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#141414] select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
          Explorer
        </span>
        <div className="flex items-center gap-0.5">
          <button
            title="New File"
            className="h-5 w-5 flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2a2a2a] rounded"
            onClick={() => handleCreate("file")}
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            title="New Folder"
            className="h-5 w-5 flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2a2a2a] rounded"
            onClick={() => handleCreate("folder")}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            title="Templates"
            className="h-5 w-5 flex items-center justify-center text-[#6b7280] hover:text-white hover:bg-[#2a2a2a] rounded"
            onClick={() => setShowTemplates(true)}
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.map((node) => (
          <FileTreeNode
            key={node.id}
            node={node}
            onContextMenu={handleContextMenu}
          />
        ))}

        {/* New file/folder input */}
        {creating && (
          <div className="mx-2 mt-1">
            <Input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitCreate();
                if (e.key === "Escape") setCreating(null);
              }}
              placeholder={creating.type === "file" ? "filename.rs" : "folder-name"}
              className="h-6 text-xs bg-[#1e1e1e] border-violet-500 text-white px-2"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 w-44 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] shadow-xl py-1"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-[#a8a8a8] hover:bg-[#2a2a2a] hover:text-white transition-colors"
              onClick={() => {
                const file = findFileById(files, contextMenu.fileId);
                if (file) {
                  setRenamingId(contextMenu.fileId);
                  setRenameValue(file.name);
                }
                setContextMenu(null);
              }}
            >
              <Edit2 className="w-3 h-3" />
              Rename
            </button>
            <button
              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-[#2a2a2a] transition-colors"
              onClick={() => {
                deleteFile(contextMenu.fileId);
                setContextMenu(null);
              }}
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        </>
      )}

      {/* Template Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Contract Templates</DialogTitle>
            <p className="text-xs text-[#6b7280] mt-0.5">Select a template to load it into the editor</p>
          </DialogHeader>
          <div className="grid gap-2 mt-2 max-h-[420px] overflow-y-auto pr-1">
            {TEMPLATES.map((tpl) => {
              const diffColor = {
                beginner: "text-emerald-400 bg-emerald-900/30 border-emerald-700/40",
                intermediate: "text-yellow-400 bg-yellow-900/30 border-yellow-700/40",
                advanced: "text-red-400 bg-red-900/30 border-red-700/40",
              }[tpl.difficulty];

              const catColor = {
                starter: "text-blue-300 bg-blue-900/30",
                token: "text-violet-300 bg-violet-900/30",
                nft: "text-pink-300 bg-pink-900/30",
                defi: "text-orange-300 bg-orange-900/30",
                governance: "text-teal-300 bg-teal-900/30",
              }[tpl.category];

              return (
                <button
                  key={tpl.id}
                  className="flex items-start gap-3 p-3 rounded-md border border-[#2a2a2a] bg-[#141414] hover:border-violet-500/50 hover:bg-[#1e1e1e] transition-all text-left"
                  onClick={() => handleLoadTemplate(tpl)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{tpl.name}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded capitalize", catColor)}>
                        {tpl.category}
                      </span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded border capitalize", diffColor)}>
                        {tpl.difficulty}
                      </span>
                    </div>
                    <span className="text-xs text-[#6b7280] mt-0.5 block">{tpl.description}</span>
                  </div>
                  <span className="text-[10px] text-[#4b5563] shrink-0 mt-0.5">
                    {tpl.files.length} file{tpl.files.length > 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function findFileById(files: FileNode[], id: string): FileNode | null {
  for (const f of files) {
    if (f.id === id) return f;
    if (f.children) {
      const found = findFileById(f.children, id);
      if (found) return found;
    }
  }
  return null;
}
