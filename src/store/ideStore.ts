import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FileNode, Tab, ChatMessage, Deployment, LogEntry, BottomTab } from "@/types";
import { DEFAULT_FILES, DEFAULT_ACTIVE_FILE_ID } from "@/lib/templates";
import { getInitUsername } from "@/lib/devWallets";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

interface IDEStore {
  // Files
  files: FileNode[];
  activeFileId: string | null;
  openTabs: Tab[];

  // Wallet
  walletAddress: string | null;
  initUsername: string | null;
  isWalletConnecting: boolean;
  walletBalance: number; // in INIT

  // Deployment
  deployments: Deployment[];
  isDeploying: boolean;
  deployLogs: LogEntry[];

  // AI
  chatMessages: ChatMessage[];
  isChatLoading: boolean;

  // Layout
  bottomTab: BottomTab;
  bottomPanelOpen: boolean;
  rightPanelOpen: boolean;
  leftPanelOpen: boolean;
  projectName: string;

  // Actions — Files
  setFiles: (files: FileNode[]) => void;
  addFile: (name: string, parentId: string | null, type: "file" | "folder") => void;
  deleteFile: (id: string) => void;
  renameFile: (id: string, name: string) => void;
  updateFileContent: (id: string, content: string) => void;
  setActiveFile: (id: string) => void;
  closeTab: (fileId: string) => void;

  // Actions — Wallet
  setWallet: (address: string, username: string) => void;
  disconnectWallet: () => void;
  setWalletConnecting: (v: boolean) => void;
  setWalletBalance: (v: number) => void;

  // Actions — Deploy
  addDeployment: (d: Deployment) => void;
  updateDeployment: (id: string, updates: Partial<Deployment>) => void;
  addLog: (log: Omit<LogEntry, "id" | "timestamp">) => void;
  clearLogs: () => void;
  setDeploying: (v: boolean) => void;

  // Actions — AI
  addChatMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
  clearChat: () => void;
  setChatLoading: (v: boolean) => void;

  // Actions — Layout
  setBottomTab: (tab: BottomTab) => void;
  setBottomPanelOpen: (v: boolean) => void;
  setRightPanelOpen: (v: boolean) => void;
  setLeftPanelOpen: (v: boolean) => void;
  setProjectName: (name: string) => void;
}

function getFileLanguage(name: string): string {
  if (name.endsWith(".rs")) return "rust";
  if (name.endsWith(".toml")) return "toml";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return "typescript";
  if (name.endsWith(".js") || name.endsWith(".jsx")) return "javascript";
  if (name.endsWith(".md")) return "markdown";
  if (name.endsWith(".yaml") || name.endsWith(".yml")) return "yaml";
  return "plaintext";
}

function findFile(files: FileNode[], id: string): FileNode | null {
  for (const f of files) {
    if (f.id === id) return f;
    if (f.children) {
      const found = findFile(f.children, id);
      if (found) return found;
    }
  }
  return null;
}

function updateFileInTree(files: FileNode[], id: string, updater: (f: FileNode) => FileNode): FileNode[] {
  return files.map((f) => {
    if (f.id === id) return updater(f);
    if (f.children) return { ...f, children: updateFileInTree(f.children, id, updater) };
    return f;
  });
}

function deleteFileFromTree(files: FileNode[], id: string): FileNode[] {
  return files
    .filter((f) => f.id !== id)
    .map((f) => ({
      ...f,
      children: f.children ? deleteFileFromTree(f.children, id) : undefined,
    }));
}

export const useIDEStore = create<IDEStore>()(
  persist(
    (set, get) => ({
      files: DEFAULT_FILES,
      activeFileId: DEFAULT_ACTIVE_FILE_ID,
      openTabs: [{ fileId: DEFAULT_ACTIVE_FILE_ID, name: "contract.rs", isDirty: false }],

      walletAddress: null,
      initUsername: null,
      isWalletConnecting: true, // will be set once wallet-info API responds
      walletBalance: 0,

      deployments: [],
      isDeploying: false,
      deployLogs: [],

      chatMessages: [],
      isChatLoading: false,

      bottomTab: "terminal",
      bottomPanelOpen: true,
      rightPanelOpen: true,
      leftPanelOpen: true,
      projectName: "my-initia-project",

      setFiles: (files) => set({ files }),

      addFile: (name, parentId, type) => {
        const id = generateId();
        const language = type === "file" ? getFileLanguage(name) : undefined;
        const newFile: FileNode = {
          id,
          name,
          type,
          content: type === "file" ? "" : undefined,
          language,
          parentId,
          children: type === "folder" ? [] : undefined,
        };

        set((state) => {
          let files: FileNode[];
          if (!parentId) {
            files = [...state.files, newFile];
          } else {
            files = updateFileInTree(state.files, parentId, (f) => ({
              ...f,
              children: [...(f.children ?? []), newFile],
            }));
          }

          if (type === "file") {
            const alreadyOpen = state.openTabs.some((t) => t.fileId === id);
            return {
              files,
              activeFileId: id,
              openTabs: alreadyOpen
                ? state.openTabs
                : [...state.openTabs, { fileId: id, name, isDirty: false }],
            };
          }
          return { files };
        });
      },

      deleteFile: (id) => {
        set((state) => ({
          files: deleteFileFromTree(state.files, id),
          openTabs: state.openTabs.filter((t) => t.fileId !== id),
          activeFileId:
            state.activeFileId === id
              ? state.openTabs.find((t) => t.fileId !== id)?.fileId ?? null
              : state.activeFileId,
        }));
      },

      renameFile: (id, name) => {
        set((state) => ({
          files: updateFileInTree(state.files, id, (f) => ({
            ...f,
            name,
            language: f.type === "file" ? getFileLanguage(name) : f.language,
          })),
          openTabs: state.openTabs.map((t) =>
            t.fileId === id ? { ...t, name } : t
          ),
        }));
      },

      updateFileContent: (id, content) => {
        set((state) => ({
          files: updateFileInTree(state.files, id, (f) => ({ ...f, content })),
          openTabs: state.openTabs.map((t) =>
            t.fileId === id ? { ...t, isDirty: true } : t
          ),
        }));
      },

      setActiveFile: (id) => {
        set((state) => {
          const file = findFile(state.files, id);
          if (!file || file.type === "folder") return {};
          const alreadyOpen = state.openTabs.some((t) => t.fileId === id);
          return {
            activeFileId: id,
            openTabs: alreadyOpen
              ? state.openTabs
              : [...state.openTabs, { fileId: id, name: file.name, isDirty: false }],
          };
        });
      },

      closeTab: (fileId) => {
        set((state) => {
          const remaining = state.openTabs.filter((t) => t.fileId !== fileId);
          const newActive =
            state.activeFileId === fileId
              ? remaining[remaining.length - 1]?.fileId ?? null
              : state.activeFileId;
          return { openTabs: remaining, activeFileId: newActive };
        });
      },

      setWallet: (address, username) =>
        set({ walletAddress: address, initUsername: username, isWalletConnecting: false }),

      disconnectWallet: () =>
        set({ walletAddress: null, initUsername: null }),

      setWalletConnecting: (v) => set({ isWalletConnecting: v }),

      setWalletBalance: (v) => set({ walletBalance: v }),

      addDeployment: (d) =>
        set((state) => ({ deployments: [d, ...state.deployments] })),

      updateDeployment: (id, updates) =>
        set((state) => ({
          deployments: state.deployments.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),

      addLog: (log) =>
        set((state) => ({
          deployLogs: [
            ...state.deployLogs,
            { ...log, id: generateId(), timestamp: Date.now() },
          ],
        })),

      clearLogs: () => set({ deployLogs: [] }),

      setDeploying: (v) => set({ isDeploying: v }),

      addChatMessage: (msg) =>
        set((state) => ({
          chatMessages: [
            ...state.chatMessages,
            { ...msg, id: generateId(), timestamp: Date.now() },
          ],
        })),

      clearChat: () => set({ chatMessages: [] }),

      setChatLoading: (v) => set({ isChatLoading: v }),

      setBottomTab: (tab) => set({ bottomTab: tab }),
      setBottomPanelOpen: (v) => set({ bottomPanelOpen: v }),
      setRightPanelOpen: (v) => set({ rightPanelOpen: v }),
      setLeftPanelOpen: (v) => set({ leftPanelOpen: v }),
      setProjectName: (name) => set({ projectName: name }),
    }),
    {
      name: "initcode-ide-store",
      partialize: (state) => ({
        files: state.files,
        deployments: state.deployments,
        projectName: state.projectName,
        chatMessages: state.chatMessages,
      }),
    }
  )
);

export function useActiveFile() {
  const files = useIDEStore((s) => s.files);
  const activeFileId = useIDEStore((s) => s.activeFileId);
  return activeFileId ? findFile(files, activeFileId) : null;
}
