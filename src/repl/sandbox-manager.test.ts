/**
 * Fibaro MCP Server - Sandbox Manager Tests
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SandboxManager } from "./sandbox-manager.js";

describe("SandboxManager", () => {
  let manager: SandboxManager;
  let mockClient: any;

  beforeEach(() => {
    manager = new SandboxManager();
    mockClient = {
      createScene: vi.fn(),
      updateScene: vi.fn(),
      runScene: vi.fn(),
      deleteScene: vi.fn(),
      getScenes: vi.fn(),
    };
  });

  describe("createSession", () => {
    it("should create a new REPL session", async () => {
      mockClient.createScene.mockResolvedValue({ id: 100, name: "__REPL_SESSION_test" });

      const session = await manager.createSession(mockClient);

      expect(session.id).toBeDefined();
      expect(session.sceneId).toBe(100);
      expect(session.sceneName).toContain("__REPL_SESSION_");
      expect(session.status).toBe("active");
      expect(session.executionCount).toBe(0);
      expect(mockClient.createScene).toHaveBeenCalled();
    });

    it("should use custom room ID if provided", async () => {
      mockClient.createScene.mockResolvedValue({ id: 101, name: "__REPL_SESSION_test" });

      await manager.createSession(mockClient, { roomId: 5 });

      expect(mockClient.createScene).toHaveBeenCalledWith(
        expect.objectContaining({ roomID: 5 })
      );
    });

    it("should throw on scene creation failure", async () => {
      mockClient.createScene.mockRejectedValue(new Error("Scene creation failed"));

      await expect(manager.createSession(mockClient)).rejects.toThrow(
        "Failed to create REPL session"
      );
    });
  });

  describe("executeInSession", () => {
    it("should execute code in a session", async () => {
      const session = {
        id: "test-session",
        sceneId: 100,
        sceneName: "__REPL_SESSION_test",
        createdAt: Date.now(),
        lastUsed: Date.now(),
        executionCount: 0,
        status: "active" as const,
      };

      mockClient.updateScene.mockResolvedValue({});
      mockClient.runScene.mockResolvedValue({});

      await manager.executeInSession(mockClient, session, "fibaro.debug('test')");

      expect(mockClient.updateScene).toHaveBeenCalledWith(100, {
        lua: "fibaro.debug('test')",
      });
      expect(mockClient.runScene).toHaveBeenCalledWith(100);
      expect(session.executionCount).toBe(1);
    });

    it("should throw on execution failure", async () => {
      const session = {
        id: "test-session",
        sceneId: 100,
        sceneName: "__REPL_SESSION_test",
        createdAt: Date.now(),
        lastUsed: Date.now(),
        executionCount: 0,
        status: "active" as const,
      };

      mockClient.updateScene.mockRejectedValue(new Error("Update failed"));

      await expect(
        manager.executeInSession(mockClient, session, "fibaro.debug('test')")
      ).rejects.toThrow("Update failed");
    });
  });

  describe("getOrCreateSession", () => {
    it("should return existing active session", async () => {
      mockClient.createScene.mockResolvedValue({ id: 100, name: "__REPL_SESSION_test" });

      const session1 = await manager.createSession(mockClient);
      const session2 = await manager.getOrCreateSession(mockClient, session1.id);

      expect(session2.id).toBe(session1.id);
      expect(mockClient.createScene).toHaveBeenCalledTimes(1);
    });

    it("should create new session if ID not found", async () => {
      mockClient.createScene.mockResolvedValue({ id: 100, name: "__REPL_SESSION_test" });

      const session = await manager.getOrCreateSession(mockClient, "non-existent");

      expect(session.id).toBeDefined();
      expect(mockClient.createScene).toHaveBeenCalled();
    });

    it("should create new session if no ID provided", async () => {
      mockClient.createScene.mockResolvedValue({ id: 100, name: "__REPL_SESSION_test" });

      const session = await manager.getOrCreateSession(mockClient);

      expect(session.id).toBeDefined();
      expect(mockClient.createScene).toHaveBeenCalled();
    });
  });

  describe("deleteSession", () => {
    it("should delete a session and its scene", async () => {
      mockClient.createScene.mockResolvedValue({ id: 100, name: "__REPL_SESSION_test" });
      mockClient.deleteScene.mockResolvedValue({});

      const session = await manager.createSession(mockClient);
      await manager.deleteSession(mockClient, session.id);

      expect(mockClient.deleteScene).toHaveBeenCalledWith(100);
      expect(manager.getSession(session.id)).toBeUndefined();
    });

    it("should handle deletion of non-existent session", async () => {
      await manager.deleteSession(mockClient, "non-existent");
      expect(mockClient.deleteScene).not.toHaveBeenCalled();
    });

    it("should mark session as error on deletion failure", async () => {
      mockClient.createScene.mockResolvedValue({ id: 100, name: "__REPL_SESSION_test" });
      mockClient.deleteScene.mockRejectedValue(new Error("Deletion failed"));

      const session = await manager.createSession(mockClient);

      await expect(manager.deleteSession(mockClient, session.id)).rejects.toThrow(
        "Deletion failed"
      );

      const updatedSession = manager.getSession(session.id);
      expect(updatedSession?.status).toBe("error");
    });
  });

  describe("listSessions", () => {
    it("should return all active sessions", async () => {
      mockClient.createScene.mockResolvedValue({ id: 100, name: "__REPL_SESSION_test" });

      await manager.createSession(mockClient);
      await manager.createSession(mockClient);

      const sessions = manager.listSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.every((s) => s.status === "active")).toBe(true);
    });

    it("should return empty array when no sessions exist", () => {
      const sessions = manager.listSessions();
      expect(sessions).toHaveLength(0);
    });
  });

  describe("cleanupSessions", () => {
    it("should cleanup sessions older than max age", async () => {
      mockClient.createScene.mockResolvedValue({ id: 100, name: "__REPL_SESSION_test" });
      mockClient.deleteScene.mockResolvedValue({});

      const session = await manager.createSession(mockClient);

      // Manually set creation time to 2 hours ago
      const oldSession = manager.getSession(session.id)!;
      oldSession.createdAt = Date.now() - 2 * 3600000;

      const result = await manager.cleanupSessions(mockClient, {
        maxAge: 3600000, // 1 hour
      });

      expect(result.cleanedSessions).toBe(1);
      expect(result.activeSessionsRemaining).toBe(0);
    });

    it("should cleanup inactive sessions", async () => {
      mockClient.createScene.mockResolvedValue({ id: 100, name: "__REPL_SESSION_test" });
      mockClient.deleteScene.mockResolvedValue({});

      const session = await manager.createSession(mockClient);

      // Manually set last used to 1 hour ago
      const oldSession = manager.getSession(session.id)!;
      oldSession.lastUsed = Date.now() - 3600000;

      const result = await manager.cleanupSessions(mockClient, {
        maxInactive: 1800000, // 30 minutes
      });

      expect(result.cleanedSessions).toBe(1);
    });

    it("should force cleanup all sessions when force=true", async () => {
      mockClient.createScene.mockResolvedValue({ id: 100, name: "__REPL_SESSION_test" });
      mockClient.deleteScene.mockResolvedValue({});

      await manager.createSession(mockClient);
      await manager.createSession(mockClient);

      const result = await manager.cleanupSessions(mockClient, { force: true });

      expect(result.cleanedSessions).toBe(2);
      expect(result.activeSessionsRemaining).toBe(0);
    });

    it("should track cleanup errors", async () => {
      mockClient.createScene.mockResolvedValue({ id: 100, name: "__REPL_SESSION_test" });
      mockClient.deleteScene.mockRejectedValue(new Error("Deletion failed"));

      const session = await manager.createSession(mockClient);

      const result = await manager.cleanupSessions(mockClient, { force: true });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].sessionId).toBe(session.id);
    });
  });

  describe("findReplScenes", () => {
    it("should find REPL scenes by name pattern", async () => {
      mockClient.getScenes.mockResolvedValue([
        { id: 1, name: "Normal Scene" },
        { id: 2, name: "__REPL_SESSION_abc" },
        { id: 3, name: "__REPL_SESSION_xyz" },
        { id: 4, name: "Another Scene" },
      ]);

      const replScenes = await manager.findReplScenes(mockClient);

      expect(replScenes).toHaveLength(2);
      expect(replScenes.every((s) => s.name.startsWith("__REPL_SESSION_"))).toBe(true);
    });

    it("should return empty array on error", async () => {
      mockClient.getScenes.mockRejectedValue(new Error("API error"));

      const replScenes = await manager.findReplScenes(mockClient);

      expect(replScenes).toHaveLength(0);
    });
  });

  describe("syncSessions", () => {
    it("should mark sessions as expired if scenes are missing", async () => {
      mockClient.createScene.mockResolvedValue({ id: 100, name: "__REPL_SESSION_test" });
      mockClient.getScenes.mockResolvedValue([]); // No scenes found

      const session = await manager.createSession(mockClient);
      await manager.syncSessions(mockClient);

      const updatedSession = manager.getSession(session.id);
      expect(updatedSession?.status).toBe("expired");
    });

    it("should delete orphaned REPL scenes", async () => {
      mockClient.getScenes.mockResolvedValue([
        { id: 999, name: "__REPL_SESSION_orphan" },
      ]);
      mockClient.deleteScene.mockResolvedValue({});

      await manager.syncSessions(mockClient);

      expect(mockClient.deleteScene).toHaveBeenCalledWith(999);
    });
  });
});
