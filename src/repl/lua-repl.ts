/**
 * Fibaro MCP Server - Lua REPL
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { logger } from "../logger.js";
import type { FibaroClientLike } from "../fibaro-client.js";
import { getSandboxManager } from "./sandbox-manager.js";
import type {
  ReplExecutionResult,
  ReplSessionOptions,
  ReplSession,
} from "./repl-types.js";

export class LuaRepl {
  private sandboxManager = getSandboxManager();
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  /**
   * Execute Lua code in a REPL session
   */
  async execute(
    client: FibaroClientLike,
    luaCode: string,
    sessionId?: string,
    options: ReplSessionOptions = {}
  ): Promise<ReplExecutionResult> {
    const startTime = Date.now();

    logger.info("Executing Lua code in REPL", {
      sessionId,
      codeLength: luaCode.length,
    });

    try {
      // Get or create session
      const session = await this.sandboxManager.getOrCreateSession(
        client,
        sessionId,
        options
      );

      // Wrap code with error handling and output capture
      const wrappedCode = this.wrapLuaCode(luaCode);

      // Execute in sandbox
      await this.sandboxManager.executeInSession(
        client,
        session,
        wrappedCode,
        options.timeout || this.DEFAULT_TIMEOUT
      );

      // Get execution output from event log
      const output = await this.getExecutionOutput(client, session);

      const executionTime = Date.now() - startTime;

      logger.info("Lua execution successful", {
        sessionId: session.id,
        executionTime,
      });

      return {
        success: true,
        output,
        executionTime,
        sessionId: session.id,
        sceneId: session.sceneId,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error("Lua execution failed", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        sessionId: sessionId || "unknown",
        sceneId: 0,
      };
    }
  }

  /**
   * List all active REPL sessions
   */
  listSessions(): ReplSession[] {
    return this.sandboxManager.listSessions();
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): ReplSession | undefined {
    return this.sandboxManager.getSession(sessionId);
  }

  /**
   * Clear a REPL session
   */
  async clearSession(client: FibaroClientLike, sessionId: string): Promise<void> {
    logger.info(`Clearing REPL session: ${sessionId}`);
    await this.sandboxManager.deleteSession(client, sessionId);
  }

  /**
   * Clear all REPL sessions
   */
  async clearAllSessions(client: FibaroClientLike): Promise<void> {
    logger.info("Clearing all REPL sessions");
    await this.sandboxManager.cleanupSessions(client, { force: true });
  }

  /**
   * Perform automatic cleanup of old sessions
   */
  async autoCleanup(client: FibaroClientLike): Promise<void> {
    logger.debug("Performing automatic REPL cleanup");
    await this.sandboxManager.cleanupSessions(client);
  }

  /**
   * Sync sessions with Fibaro state
   */
  async sync(client: FibaroClientLike): Promise<void> {
    await this.sandboxManager.syncSessions(client);
  }

  // Private helper methods

  /**
   * Wrap Lua code with error handling and output capture
   */
  private wrapLuaCode(luaCode: string): string {
    return `
-- REPL Execution Wrapper
local repl_output = {}
local repl_error = nil

-- Override print to capture output
local original_print = print
local function repl_print(...)
  local args = {...}
  local str = ""
  for i, v in ipairs(args) do
    if i > 1 then str = str .. "\\t" end
    str = str .. tostring(v)
  end
  table.insert(repl_output, str)
  original_print(...)
end
print = repl_print

-- Execute user code with error handling
local function repl_execute()
  ${luaCode}
end

local success, err = pcall(repl_execute)

if not success then
  repl_error = tostring(err)
  fibaro.debug("[REPL ERROR] " .. repl_error)
else
  if #repl_output > 0 then
    fibaro.debug("[REPL OUTPUT] " .. table.concat(repl_output, "\\n"))
  else
    fibaro.debug("[REPL] Execution completed successfully")
  end
end

-- Restore original print
print = original_print
`.trim();
  }

  /**
   * Get execution output from event log
   */
  private async getExecutionOutput(
    client: FibaroClientLike,
    session: ReplSession
  ): Promise<string | undefined> {
    try {
      // Wait a moment for logs to appear
      await this.sleep(500);

      // Get recent event log entries
      const events = await client.getEventLog({
        from: session.lastUsed - 5000,
        limit: 100,
      });

      // Find debug messages from this scene
      const debugMessages: string[] = [];

      for (const event of events) {
        if (
          event.type === "DEBUG" ||
          event.type === "debug" ||
          (event.data && event.data.type === "DEBUG")
        ) {
          const message =
            event.message || event.data?.message || event.data?.value || "";

          if (
            message.includes("[REPL OUTPUT]") ||
            message.includes("[REPL ERROR]") ||
            message.includes("[REPL]")
          ) {
            debugMessages.push(message);
          }
        }
      }

      if (debugMessages.length === 0) {
        return undefined;
      }

      // Extract output from debug messages
      const output = debugMessages
        .map((msg) => {
          if (msg.includes("[REPL OUTPUT]")) {
            return msg.replace(/.*\[REPL OUTPUT\]\s*/, "");
          } else if (msg.includes("[REPL ERROR]")) {
            return "ERROR: " + msg.replace(/.*\[REPL ERROR\]\s*/, "");
          } else if (msg.includes("[REPL]")) {
            return msg.replace(/.*\[REPL\]\s*/, "");
          }
          return msg;
        })
        .join("\n");

      return output || undefined;
    } catch (error) {
      logger.warn("Failed to get execution output from event log", error);
      return undefined;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
let luaRepl: LuaRepl | null = null;

export function getLuaRepl(): LuaRepl {
  if (!luaRepl) {
    luaRepl = new LuaRepl();
  }
  return luaRepl;
}
