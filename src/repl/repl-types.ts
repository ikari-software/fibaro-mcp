/**
 * Fibaro MCP Server - REPL Types
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

/**
 * REPL session information
 */
export interface ReplSession {
  id: string;
  sceneId: number;
  sceneName: string;
  createdAt: number;
  lastUsed: number;
  executionCount: number;
  status: "active" | "expired" | "error";
}

/**
 * REPL execution result
 */
export interface ReplExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime: number;
  sessionId: string;
  sceneId: number;
}

/**
 * REPL session options
 */
export interface ReplSessionOptions {
  timeout?: number;
  roomId?: number;
  sessionName?: string;
}

/**
 * REPL cleanup options
 */
export interface ReplCleanupOptions {
  maxAge?: number; // Maximum session age in milliseconds
  maxInactive?: number; // Maximum inactive time in milliseconds
  force?: boolean; // Force cleanup of all sessions
}

/**
 * REPL cleanup result
 */
export interface ReplCleanupResult {
  cleanedSessions: number;
  activeSessionsRemaining: number;
  errors: Array<{
    sessionId: string;
    error: string;
  }>;
}
