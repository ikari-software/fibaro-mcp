/**
 * Fibaro MCP Server - Sandbox Manager
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { randomUUID } from "node:crypto";
import { logger } from "../logger.js";
import type {
  ReplSession,
  ReplSessionOptions,
  ReplCleanupOptions,
  ReplCleanupResult,
} from "./repl-types.js";

export class SandboxManager {
  private sessions: Map<string, ReplSession> = new Map();
  private readonly SESSION_PREFIX = "__REPL_SESSION_";
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly DEFAULT_MAX_AGE = 3600000; // 1 hour
  private readonly DEFAULT_MAX_INACTIVE = 1800000; // 30 minutes

  /**
   * Create a new REPL session with a temporary scene
   */
  async createSession(
    client: any,
    options: ReplSessionOptions = {}
  ): Promise<ReplSession> {
    const sessionId = this.generateSessionId();
    const sceneName = `${this.SESSION_PREFIX}${sessionId}`;
    const roomId = options.roomId || 1;

    logger.info(`Creating REPL session: ${sessionId}`);

    try {
      // Create temporary scene
      const scene = await client.createScene({
        name: sceneName,
        roomID: roomId,
        type: "lua",
        lua: `-- REPL Session ${sessionId}\nfibaro.debug("REPL session ready")`,
        autostart: false,
        runConfig: "TRIGGER_AND_MANUAL",
        isLua: true,
      });

      const session: ReplSession = {
        id: sessionId,
        sceneId: scene.id,
        sceneName,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        executionCount: 0,
        status: "active",
      };

      this.sessions.set(sessionId, session);
      logger.debug(`REPL session created: ${sessionId} (scene ${scene.id})`);

      return session;
    } catch (error) {
      logger.error(`Failed to create REPL session: ${sessionId}`, error);
      throw new Error(
        `Failed to create REPL session: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get an existing session or create a new one
   */
  async getOrCreateSession(
    client: any,
    sessionId?: string,
    options: ReplSessionOptions = {}
  ): Promise<ReplSession> {
    if (sessionId && this.sessions.has(sessionId)) {
      const session = this.sessions.get(sessionId)!;

      // Check if session is still valid
      if (session.status === "active") {
        session.lastUsed = Date.now();
        return session;
      }

      // Session expired, create new one
      logger.warn(`Session ${sessionId} expired, creating new session`);
    }

    return this.createSession(client, options);
  }

  /**
   * Execute Lua code in a session
   */
  async executeInSession(
    client: any,
    session: ReplSession,
    luaCode: string,
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<void> {
    logger.debug(`Executing code in session ${session.id}`);

    try {
      // Update scene with new Lua code
      await client.updateScene(session.sceneId, {
        lua: luaCode,
      });

      // Run the scene
      await client.runScene(session.sceneId);

      // Update session stats
      session.executionCount++;
      session.lastUsed = Date.now();

      logger.debug(`Execution complete in session ${session.id}`);
    } catch (error) {
      logger.error(`Execution failed in session ${session.id}`, error);
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ReplSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * List all active sessions
   */
  listSessions(): ReplSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.status === "active");
  }

  /**
   * Delete a session and its temporary scene
   */
  async deleteSession(client: any, sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`Session ${sessionId} not found`);
      return;
    }

    logger.info(`Deleting REPL session: ${sessionId}`);

    try {
      // Delete the temporary scene
      await client.deleteScene(session.sceneId);

      // Remove from sessions map
      this.sessions.delete(sessionId);

      logger.debug(`REPL session deleted: ${sessionId}`);
    } catch (error) {
      logger.error(`Failed to delete REPL session: ${sessionId}`, error);
      // Mark as error but keep in map for tracking
      session.status = "error";
      throw error;
    }
  }

  /**
   * Cleanup old or inactive sessions
   */
  async cleanupSessions(
    client: any,
    options: ReplCleanupOptions = {}
  ): Promise<ReplCleanupResult> {
    const maxAge = options.maxAge || this.DEFAULT_MAX_AGE;
    const maxInactive = options.maxInactive || this.DEFAULT_MAX_INACTIVE;
    const force = options.force || false;

    const result: ReplCleanupResult = {
      cleanedSessions: 0,
      activeSessionsRemaining: 0,
      errors: [],
    };

    const now = Date.now();
    const sessionsToClean: string[] = [];

    // Identify sessions to clean
    for (const [sessionId, session] of this.sessions.entries()) {
      if (force) {
        sessionsToClean.push(sessionId);
      } else {
        const age = now - session.createdAt;
        const inactive = now - session.lastUsed;

        if (age > maxAge || inactive > maxInactive || session.status !== "active") {
          sessionsToClean.push(sessionId);
        }
      }
    }

    logger.info(`Cleaning up ${sessionsToClean.length} REPL sessions`);

    // Clean up identified sessions
    for (const sessionId of sessionsToClean) {
      try {
        await this.deleteSession(client, sessionId);
        result.cleanedSessions++;
      } catch (error) {
        result.errors.push({
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    result.activeSessionsRemaining = this.listSessions().length;

    logger.info(
      `Cleanup complete: ${result.cleanedSessions} cleaned, ${result.activeSessionsRemaining} active, ${result.errors.length} errors`
    );

    return result;
  }

  /**
   * Find REPL sessions by scene name pattern
   */
  async findReplScenes(client: any): Promise<any[]> {
    try {
      const scenes = await client.getScenes();
      return scenes.filter((scene: any) => scene.name?.startsWith(this.SESSION_PREFIX));
    } catch (error) {
      logger.error("Failed to find REPL scenes", error);
      return [];
    }
  }

  /**
   * Sync sessions with actual scenes on Fibaro
   */
  async syncSessions(client: any): Promise<void> {
    logger.debug("Syncing REPL sessions with Fibaro");

    try {
      const replScenes = await this.findReplScenes(client);
      const sceneIds = new Set(replScenes.map((s) => s.id));

      // Mark sessions as expired if their scenes are missing
      for (const session of this.sessions.values()) {
        if (!sceneIds.has(session.sceneId) && session.status === "active") {
          logger.warn(`Session ${session.id} scene missing, marking as expired`);
          session.status = "expired";
        }
      }

      // Find orphaned REPL scenes not in sessions map
      const sessionSceneIds = new Set(
        Array.from(this.sessions.values()).map((s) => s.sceneId)
      );

      for (const scene of replScenes) {
        if (!sessionSceneIds.has(scene.id)) {
          logger.warn(`Found orphaned REPL scene: ${scene.name} (${scene.id})`);
          try {
            await client.deleteScene(scene.id);
            logger.info(`Deleted orphaned REPL scene: ${scene.id}`);
          } catch (error) {
            logger.error(`Failed to delete orphaned scene: ${scene.id}`, error);
          }
        }
      }
    } catch (error) {
      logger.error("Failed to sync REPL sessions", error);
    }
  }

  // Private helper methods

  private generateSessionId(): string {
    return randomUUID();
  }
}

// Singleton instance
let sandboxManager: SandboxManager | null = null;

export function getSandboxManager(): SandboxManager {
  if (!sandboxManager) {
    sandboxManager = new SandboxManager();
  }
  return sandboxManager;
}
