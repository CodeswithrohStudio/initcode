export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  language?: string;
  children?: FileNode[];
  parentId?: string | null;
}

export interface Tab {
  fileId: string;
  name: string;
  isDirty: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Deployment {
  id: string;
  contractName: string;
  codeId?: string;
  contractAddress?: string;
  txHash?: string;
  timestamp: number;
  status: "pending" | "compiling" | "storing" | "instantiating" | "success" | "failed";
  network: string;
  error?: string;
}

export interface LogEntry {
  id: string;
  type: "info" | "success" | "error" | "warning" | "muted";
  message: string;
  timestamp: number;
}

export type BottomTab = "terminal" | "problems" | "deployments";
export type Theme = "dark" | "light";
