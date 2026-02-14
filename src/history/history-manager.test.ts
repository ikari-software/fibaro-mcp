/**
 * Fibaro MCP Server - History Manager Tests
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { HistoryManager } from "./history-manager.js";
import type { DeviceHistoryEntry, SceneExecution } from "./history-types.js";

describe("HistoryManager", () => {
  let manager: HistoryManager;
  let mockClient: any;

  beforeEach(() => {
    manager = new HistoryManager();
    mockClient = {
      getEventLog: vi.fn(),
      getDevice: vi.fn(),
    };
  });

  describe("queryDeviceHistory", () => {
    it("should query device history from event log", async () => {
      const mockEvents = [
        {
          timestamp: 1000,
          deviceID: 45,
          deviceName: "Test Device",
          property: "value",
          value: 100,
          oldValue: 50,
          type: "device.property.changed",
        },
        {
          timestamp: 2000,
          deviceID: 45,
          deviceName: "Test Device",
          property: "value",
          value: 150,
          oldValue: 100,
          type: "device.property.changed",
        },
        {
          timestamp: 3000,
          deviceID: 99, // Different device
          deviceName: "Other Device",
          property: "value",
          value: 200,
          type: "device.property.changed",
        },
      ];

      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const result = await manager.queryDeviceHistory(mockClient, {
        deviceId: 45,
        from: 0,
        to: 5000,
      });

      expect(result).toHaveLength(2);
      expect(result[0].deviceId).toBe(45);
      expect(result[0].value).toBe(100);
      expect(result[1].value).toBe(150);
    });

    it("should filter by property", async () => {
      const mockEvents = [
        {
          timestamp: 1000,
          deviceID: 45,
          property: "value",
          value: 100,
        },
        {
          timestamp: 2000,
          deviceID: 45,
          property: "power",
          value: 50,
        },
        {
          timestamp: 3000,
          deviceID: 45,
          property: "value",
          value: 150,
        },
      ];

      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const result = await manager.queryDeviceHistory(mockClient, {
        deviceId: 45,
        property: "power",
      });

      expect(result).toHaveLength(1);
      expect(result[0].property).toBe("power");
      expect(result[0].value).toBe(50);
    });

    it("should respect limit parameter", async () => {
      const mockEvents = Array.from({ length: 100 }, (_, i) => ({
        timestamp: i * 1000,
        deviceID: 45,
        property: "value",
        value: i,
      }));

      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const result = await manager.queryDeviceHistory(mockClient, {
        deviceId: 45,
        limit: 10,
      });

      expect(result).toHaveLength(10);
    });

    it("should handle events with data property", async () => {
      const mockEvents = [
        {
          timestamp: 1000,
          data: {
            deviceID: 45,
            property: "value",
                value: 100,
            oldValue: 50,
          },
          type: "device.changed",
        },
      ];

      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const result = await manager.queryDeviceHistory(mockClient, {
        deviceId: 45,
      });

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(100);
      expect(result[0].oldValue).toBe(50);
    });

    it("should handle empty event log", async () => {
      mockClient.getEventLog.mockResolvedValue([]);

      const result = await manager.queryDeviceHistory(mockClient, {
        deviceId: 45,
      });

      expect(result).toHaveLength(0);
    });

    it("should handle getEventLog error", async () => {
      mockClient.getEventLog.mockRejectedValue(new Error("API Error"));

      await expect(
        manager.queryDeviceHistory(mockClient, { deviceId: 45 })
      ).rejects.toThrow("API Error");
    });
  });

  describe("calculateStats", () => {
    it("should calculate statistics for numeric values", () => {
      const entries: DeviceHistoryEntry[] = [
        { timestamp: 1000, deviceId: 45, deviceName: "Test", property: "value", value: 10 },
        { timestamp: 2000, deviceId: 45, deviceName: "Test", property: "value", value: 20 },
        { timestamp: 3000, deviceId: 45, deviceName: "Test", property: "value", value: 30 },
        { timestamp: 4000, deviceId: 45, deviceName: "Test", property: "value", value: 40 },
      ];

      const stats = manager.calculateStats(entries, 45, "value", 0, 5000);

      expect(stats.count).toBe(4);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(40);
      expect(stats.avg).toBe(25);
      expect(stats.sum).toBe(100);
      expect(stats.first).toBe(10);
      expect(stats.last).toBe(40);
      expect(stats.changes).toBe(3);
    });

    it("should count changes correctly", () => {
      const entries: DeviceHistoryEntry[] = [
        { timestamp: 1000, deviceId: 45, property: "value", value: 10 },
        { timestamp: 2000, deviceId: 45, property: "value", value: 10 }, // No change
        { timestamp: 3000, deviceId: 45, property: "value", value: 20 }, // Change
        { timestamp: 4000, deviceId: 45, property: "value", value: 20 }, // No change
      ];

      const stats = manager.calculateStats(entries, 45, "value", 0, 5000);

      expect(stats.changes).toBe(1);
    });

    it("should handle non-numeric values", () => {
      const entries: DeviceHistoryEntry[] = [
        { timestamp: 1000, deviceId: 45, property: "state", value: "on" },
        { timestamp: 2000, deviceId: 45, property: "state", value: "off" },
      ];

      const stats = manager.calculateStats(entries, 45, "state", 0, 5000);

      expect(stats.count).toBe(2);
      expect(stats.first).toBe("on");
      expect(stats.last).toBe("off");
      expect(stats.min).toBeUndefined();
      expect(stats.max).toBeUndefined();
      expect(stats.avg).toBeUndefined();
    });

    it("should return empty stats for no entries", () => {
      const stats = manager.calculateStats([], 45, "value", 0, 5000);

      expect(stats.count).toBe(0);
      expect(stats.first).toBeNull();
      expect(stats.last).toBeNull();
      expect(stats.changes).toBe(0);
    });
  });

  describe("aggregateByInterval", () => {
    it("should aggregate by 1 hour interval with avg", () => {
      const entries: DeviceHistoryEntry[] = [
        { timestamp: 1000, deviceId: 45, property: "value", value: 10 },
        { timestamp: 2000, deviceId: 45, property: "value", value: 20 },
        { timestamp: 3600000, deviceId: 45, property: "value", value: 30 }, // 1 hour later
        { timestamp: 3601000, deviceId: 45, property: "value", value: 40 },
      ];

      const result = manager.aggregateByInterval(entries, "1h", "avg");

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(15); // (10 + 20) / 2
      expect(result[0].count).toBe(2);
      expect(result[1].value).toBe(35); // (30 + 40) / 2
      expect(result[1].count).toBe(2);
    });

    it("should aggregate with min function", () => {
      const entries: DeviceHistoryEntry[] = [
        { timestamp: 1000, deviceId: 45, property: "value", value: 10 },
        { timestamp: 2000, deviceId: 45, property: "value", value: 20 },
        { timestamp: 3000, deviceId: 45, property: "value", value: 5 },
      ];

      const result = manager.aggregateByInterval(entries, "1h", "min");

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(5);
    });

    it("should aggregate with max function", () => {
      const entries: DeviceHistoryEntry[] = [
        { timestamp: 1000, deviceId: 45, property: "value", value: 10 },
        { timestamp: 2000, deviceId: 45, property: "value", value: 20 },
        { timestamp: 3000, deviceId: 45, property: "value", value: 5 },
      ];

      const result = manager.aggregateByInterval(entries, "1h", "max");

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(20);
    });

    it("should aggregate with sum function", () => {
      const entries: DeviceHistoryEntry[] = [
        { timestamp: 1000, deviceId: 45, property: "value", value: 10 },
        { timestamp: 2000, deviceId: 45, property: "value", value: 20 },
        { timestamp: 3000, deviceId: 45, property: "value", value: 30 },
      ];

      const result = manager.aggregateByInterval(entries, "1h", "sum");

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(60);
    });

    it("should aggregate with count function", () => {
      const entries: DeviceHistoryEntry[] = [
        { timestamp: 1000, deviceId: 45, property: "value", value: 10 },
        { timestamp: 2000, deviceId: 45, property: "value", value: 20 },
        { timestamp: 3000, deviceId: 45, property: "value", value: 30 },
      ];

      const result = manager.aggregateByInterval(entries, "1h", "count");

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(3);
    });

    it("should aggregate with last function", () => {
      const entries: DeviceHistoryEntry[] = [
        { timestamp: 1000, deviceId: 45, property: "value", value: 10 },
        { timestamp: 2000, deviceId: 45, property: "value", value: 20 },
        { timestamp: 3000, deviceId: 45, property: "value", value: 30 },
      ];

      const result = manager.aggregateByInterval(entries, "1h", "last");

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(30);
    });

    it("should handle different time intervals", () => {
      const entries: DeviceHistoryEntry[] = [
        { timestamp: 0, deviceId: 45, property: "value", value: 10 },
        { timestamp: 5 * 60 * 1000, deviceId: 45, property: "value", value: 20 }, // 5m later
      ];

      const result = manager.aggregateByInterval(entries, "5m", "avg");
      expect(result).toHaveLength(2);
    });

    it("should skip buckets with no numeric values", () => {
      const entries: DeviceHistoryEntry[] = [
        { timestamp: 1000, deviceId: 45, property: "state", value: "on" },
        { timestamp: 2000, deviceId: 45, property: "state", value: "off" },
      ];

      const result = manager.aggregateByInterval(entries, "1h", "avg");

      expect(result).toHaveLength(0);
    });

    it("should return empty array for no entries", () => {
      const result = manager.aggregateByInterval([], "1h", "avg");
      expect(result).toHaveLength(0);
    });
  });

  describe("exportHistory", () => {
    it("should export device history with stats", async () => {
      const mockEvents = [
        {
          timestamp: 1000,
          deviceID: 45,
          deviceName: "Test Device",
          property: "value",
          value: 100,
        },
      ];

      mockClient.getEventLog.mockResolvedValue(mockEvents);
      mockClient.getDevice.mockResolvedValue({ id: 45, name: "Test Device" });

      const result = await manager.exportHistory(
        mockClient,
        { deviceId: 45, from: 0, to: 5000 },
        true
      );

      expect(result.deviceId).toBe(45);
      expect(result.deviceName).toBe("Test Device");
      expect(result.entries).toHaveLength(1);
      expect(result.stats).toBeDefined();
      expect(result.stats?.deviceName).toBe("Test Device");
    });

    it("should export without stats when requested", async () => {
      const mockEvents = [
        {
          timestamp: 1000,
          deviceID: 45,
          property: "value",
          value: 100,
        },
      ];

      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const result = await manager.exportHistory(
        mockClient,
        { deviceId: 45 },
        false
      );

      expect(result.entries).toHaveLength(1);
      expect(result.stats).toBeUndefined();
    });

    it("should handle device name fetch failure", async () => {
      const mockEvents = [
        {
          timestamp: 1000,
          deviceID: 45,
          property: "value",
          value: 100,
        },
      ];

      mockClient.getEventLog.mockResolvedValue(mockEvents);
      mockClient.getDevice.mockRejectedValue(new Error("Device not found"));

      const result = await manager.exportHistory(
        mockClient,
        { deviceId: 45 },
        true
      );

      expect(result.deviceName).toBeUndefined();
      expect(result.entries).toHaveLength(1);
    });
  });

  describe("querySceneHistory", () => {
    it("should track scene executions from event log", async () => {
      const mockEvents = [
        {
          timestamp: 1000,
          type: "scene.started",
          sceneId: 10,
          sceneName: "Test Scene",
        },
        {
          timestamp: 2000,
          type: "scene.finished",
          sceneId: 10,
          sceneName: "Test Scene",
        },
      ];

      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const result = await manager.querySceneHistory(mockClient, {
        sceneId: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].sceneId).toBe(10);
      expect(result[0].startTime).toBe(1000);
      expect(result[0].endTime).toBe(2000);
      expect(result[0].duration).toBe(1000);
      expect(result[0].status).toBe("success");
    });

    it("should track failed scene executions", async () => {
      const mockEvents = [
        {
          timestamp: 1000,
          type: "scene.started",
          sceneId: 10,
          sceneName: "Test Scene",
        },
        {
          timestamp: 2000,
          type: "scene.error",
          sceneId: 10,
          message: "Execution failed",
        },
      ];

      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const result = await manager.querySceneHistory(mockClient, {
        sceneId: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("failure");
      expect(result[0].error).toBe("Execution failed");
    });

    it("should track still-running scenes", async () => {
      const mockEvents = [
        {
          timestamp: 1000,
          type: "scene.started",
          sceneId: 10,
          sceneName: "Test Scene",
        },
        // No end event
      ];

      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const result = await manager.querySceneHistory(mockClient, {});

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("running");
      expect(result[0].endTime).toBeUndefined();
    });

    it("should filter by scene ID", async () => {
      const mockEvents = [
        {
          timestamp: 1000,
          type: "scene.started",
          sceneId: 10,
          sceneName: "Scene 10",
        },
        {
          timestamp: 2000,
          type: "scene.started",
          sceneId: 20,
          sceneName: "Scene 20",
        },
      ];

      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const result = await manager.querySceneHistory(mockClient, {
        sceneId: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0].sceneId).toBe(10);
    });

    it("should filter by status", async () => {
      const mockEvents = [
        {
          timestamp: 1000,
          type: "scene.started",
          sceneId: 10,
          sceneName: "Scene 10",
        },
        {
          timestamp: 2000,
          type: "scene.finished",
          sceneId: 10,
        },
        {
          timestamp: 3000,
          type: "scene.started",
          sceneId: 20,
          sceneName: "Scene 20",
        },
        {
          timestamp: 4000,
          type: "scene.error",
          sceneId: 20,
        },
      ];

      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const result = await manager.querySceneHistory(mockClient, {
        status: "failure",
      });

      expect(result).toHaveLength(1);
      expect(result[0].sceneId).toBe(20);
      expect(result[0].status).toBe("failure");
    });

    it("should respect limit parameter", async () => {
      const mockEvents = Array.from({ length: 100 }, (_, i) => ({
        timestamp: i * 1000,
        type: i % 2 === 0 ? "scene.started" : "scene.finished",
        sceneId: 10,
        sceneName: "Test Scene",
      }));

      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const result = await manager.querySceneHistory(mockClient, {
        sceneId: 10,
        limit: 5,
      });

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should handle event log errors", async () => {
      mockClient.getEventLog.mockRejectedValue(new Error("API Error"));

      await expect(
        manager.querySceneHistory(mockClient, {})
      ).rejects.toThrow("API Error");
    });
  });

  describe("calculateSceneStats", () => {
    it("should calculate scene performance statistics", () => {
      const executions: SceneExecution[] = [
        {
          sceneId: 10,
          sceneName: "Test Scene",
          startTime: 5000,
          endTime: 6000,
          duration: 1000,
          status: "failure",
          error: "Test error",
        },
        {
          sceneId: 10,
          sceneName: "Test Scene",
          startTime: 3000,
          endTime: 4500,
          duration: 1500,
          status: "success",
        },
        {
          sceneId: 10,
          sceneName: "Test Scene",
          startTime: 1000,
          endTime: 2000,
          duration: 1000,
          status: "success",
        },
      ];

      const stats = manager.calculateSceneStats(executions);

      expect(stats).toBeDefined();
      expect(stats?.sceneId).toBe(10);
      expect(stats?.sceneName).toBe("Test Scene");
      expect(stats?.totalExecutions).toBe(3);
      expect(stats?.successfulExecutions).toBe(2);
      expect(stats?.failedExecutions).toBe(1);
      expect(stats?.successRate).toBeCloseTo(66.67, 1);
      expect(stats?.avgDuration).toBeCloseTo(1166.67, 2); // (1000 + 1500 + 1000) / 3
      expect(stats?.minDuration).toBe(1000);
      expect(stats?.maxDuration).toBe(1500);
      expect(stats?.lastExecution).toBe(5000);
      expect(stats?.lastStatus).toBe("failure");
    });

    it("should handle executions without duration", () => {
      const executions: SceneExecution[] = [
        {
          sceneId: 10,
          sceneName: "Test Scene",
          startTime: 1000,
          status: "running",
        },
      ];

      const stats = manager.calculateSceneStats(executions);

      expect(stats?.totalExecutions).toBe(1);
      expect(stats?.avgDuration).toBe(0);
      expect(stats?.minDuration).toBe(0);
      expect(stats?.maxDuration).toBe(0);
    });

    it("should return null for empty executions", () => {
      const stats = manager.calculateSceneStats([]);
      expect(stats).toBeNull();
    });

    it("should handle still-running scenes", () => {
      const executions: SceneExecution[] = [
        {
          sceneId: 10,
          sceneName: "Test Scene",
          startTime: 1000,
          status: "running",
        },
      ];

      const stats = manager.calculateSceneStats(executions);

      expect(stats?.lastStatus).toBeUndefined();
    });

    it("should calculate 100% success rate", () => {
      const executions: SceneExecution[] = [
        {
          sceneId: 10,
          sceneName: "Test Scene",
          startTime: 1000,
          endTime: 2000,
          duration: 1000,
          status: "success",
        },
        {
          sceneId: 10,
          sceneName: "Test Scene",
          startTime: 3000,
          endTime: 4000,
          duration: 1000,
          status: "success",
        },
      ];

      const stats = manager.calculateSceneStats(executions);

      expect(stats?.successRate).toBe(100);
      expect(stats?.failedExecutions).toBe(0);
    });

    it("should filter out zero durations from statistics", () => {
      const executions: SceneExecution[] = [
        {
          sceneId: 10,
          sceneName: "Test Scene",
          startTime: 1000,
          endTime: 1000,
          duration: 0,
          status: "success",
        },
        {
          sceneId: 10,
          sceneName: "Test Scene",
          startTime: 2000,
          endTime: 3000,
          duration: 1000,
          status: "success",
        },
      ];

      const stats = manager.calculateSceneStats(executions);

      expect(stats?.avgDuration).toBe(1000); // Only non-zero duration counted
      expect(stats?.minDuration).toBe(1000);
    });
  });
});
