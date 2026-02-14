/**
 * Fibaro MCP Server - Analytics Engine Tests
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { AnalyticsEngine } from "./analytics-engine.js";

describe("AnalyticsEngine", () => {
  let analytics: AnalyticsEngine;
  let mockClient: any;

  beforeEach(() => {
    analytics = new AnalyticsEngine();
    mockClient = {
      getDevices: vi.fn(),
      getRooms: vi.fn(),
      getScenes: vi.fn(),
      getEventLog: vi.fn(),
      getSystemInfo: vi.fn(),
    };
  });

  describe("analyzeDeviceUsage", () => {
    it("should analyze device usage patterns", async () => {
      const mockDevices = [
        { id: 1, name: "Light 1", type: "com.fibaro.binarySwitch", roomID: 1 },
        { id: 2, name: "Sensor 1", type: "com.fibaro.temperatureSensor", roomID: 2 },
      ];

      const mockEvents = [
        { type: "DEVICE_EVENT", deviceId: 1, timestamp: Date.now() - 3600000 },
        { type: "DEVICE_EVENT", deviceId: 1, timestamp: Date.now() - 7200000 },
        { type: "DEVICE_PROPERTY_CHANGED", data: { deviceId: 2 }, timestamp: Date.now() - 1800000 },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const patterns = await analytics.analyzeDeviceUsage(mockClient);

      expect(patterns).toHaveLength(2);
      expect(patterns[0].deviceId).toBe(1);
      expect(patterns[0].activations).toBe(2);
      expect(patterns[1].deviceId).toBe(2);
      expect(patterns[1].activations).toBe(1);
    });

    it("should handle empty event log", async () => {
      mockClient.getDevices.mockResolvedValue([]);
      mockClient.getEventLog.mockResolvedValue([]);

      const patterns = await analytics.analyzeDeviceUsage(mockClient);

      expect(patterns).toHaveLength(0);
    });

    it("should filter by device_ids", async () => {
      const mockDevices = [
        { id: 1, name: "Light 1", type: "com.fibaro.binarySwitch" },
        { id: 2, name: "Light 2", type: "com.fibaro.binarySwitch" },
      ];

      const mockEvents = [
        { type: "DEVICE_EVENT", deviceId: 1, timestamp: Date.now() },
        { type: "DEVICE_EVENT", deviceId: 2, timestamp: Date.now() },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const patterns = await analytics.analyzeDeviceUsage(mockClient, { device_ids: [1] });

      expect(patterns).toHaveLength(1);
      expect(patterns[0].deviceId).toBe(1);
    });

    it("should limit results", async () => {
      const mockDevices = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Device ${i + 1}`,
        type: "com.fibaro.binarySwitch",
      }));

      const mockEvents = mockDevices.map((d) => ({
        type: "DEVICE_EVENT",
        deviceId: d.id,
        timestamp: Date.now(),
      }));

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const patterns = await analytics.analyzeDeviceUsage(mockClient, { limit: 5 });

      expect(patterns).toHaveLength(5);
    });
  });

  describe("analyzeSystemHealth", () => {
    it("should analyze system health metrics", async () => {
      const mockDevices = [
        { id: 1, name: "Light 1", dead: false },
        { id: 2, name: "Sensor 1", dead: true },
        { id: 3, name: "Sensor 2", dead: true },
      ];

      const mockEvents = [
        { type: "SCENE_FAILED", sceneId: 5, timestamp: Date.now() },
        { type: "ERROR", timestamp: Date.now() },
        { type: "WARNING", timestamp: Date.now() },
        { type: "WARNING", timestamp: Date.now() },
      ];

      const mockSystemInfo = { uptime: 86400 }; // 1 day

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.getEventLog.mockResolvedValue(mockEvents);
      mockClient.getSystemInfo.mockResolvedValue(mockSystemInfo);

      const health = await analytics.analyzeSystemHealth(mockClient);

      expect(health.deadDevices).toBe(2);
      expect(health.deadDeviceIds).toEqual([2, 3]);
      expect(health.failedScenes).toBe(1);
      expect(health.failedSceneIds).toEqual([5]);
      expect(health.warningCount).toBe(2);
      expect(health.uptime).toBe(86400);
    });

    it("should handle system info error gracefully", async () => {
      mockClient.getDevices.mockResolvedValue([]);
      mockClient.getEventLog.mockResolvedValue([]);
      mockClient.getSystemInfo.mockRejectedValue(new Error("API error"));

      const health = await analytics.analyzeSystemHealth(mockClient);

      expect(health.uptime).toBe(0);
    });
  });

  describe("analyzeSceneFrequency", () => {
    it("should analyze scene execution frequency", async () => {
      const mockScenes = [
        { id: 1, name: "Morning Scene" },
        { id: 2, name: "Evening Scene" },
      ];

      const mockEvents = [
        { type: "SCENE_STARTED", sceneId: 1, timestamp: Date.now() },
        { type: "SCENE_FINISHED", sceneId: 1, timestamp: Date.now() },
        { type: "SCENE_STARTED", sceneId: 2, timestamp: Date.now() },
        { type: "SCENE_FAILED", sceneId: 2, timestamp: Date.now() },
      ];

      mockClient.getScenes.mockResolvedValue(mockScenes);
      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const frequencies = await analytics.analyzeSceneFrequency(mockClient);

      expect(frequencies).toHaveLength(2);
      expect(frequencies[0].sceneId).toBe(1);
      expect(frequencies[0].executions).toBe(1);
      expect(frequencies[0].successRate).toBe(100);
      expect(frequencies[1].sceneId).toBe(2);
      expect(frequencies[1].executions).toBe(1);
      expect(frequencies[1].successRate).toBe(0);
    });

    it("should filter by scene_ids", async () => {
      const mockScenes = [
        { id: 1, name: "Scene 1" },
        { id: 2, name: "Scene 2" },
      ];

      const mockEvents = [
        { type: "SCENE_STARTED", sceneId: 1, timestamp: Date.now() },
        { type: "SCENE_STARTED", sceneId: 2, timestamp: Date.now() },
      ];

      mockClient.getScenes.mockResolvedValue(mockScenes);
      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const frequencies = await analytics.analyzeSceneFrequency(mockClient, { scene_ids: [1] });

      expect(frequencies).toHaveLength(1);
      expect(frequencies[0].sceneId).toBe(1);
    });
  });

  describe("generateDashboard", () => {
    it("should generate comprehensive dashboard", async () => {
      const mockDevices = [
        { id: 1, name: "Light 1", type: "com.fibaro.binarySwitch", dead: false },
      ];

      const mockScenes = [{ id: 1, name: "Scene 1" }];

      const mockRooms = [{ id: 1, name: "Living Room" }];

      const mockEvents = [
        { type: "DEVICE_EVENT", deviceId: 1, timestamp: Date.now() },
        { type: "SCENE_STARTED", sceneId: 1, timestamp: Date.now() },
      ];

      const mockSystemInfo = { uptime: 86400 };

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.getScenes.mockResolvedValue(mockScenes);
      mockClient.getRooms.mockResolvedValue(mockRooms);
      mockClient.getEventLog.mockResolvedValue(mockEvents);
      mockClient.getSystemInfo.mockResolvedValue(mockSystemInfo);

      const dashboard = await analytics.generateDashboard(mockClient);

      expect(dashboard.period).toBeDefined();
      expect(dashboard.topDevices).toBeDefined();
      expect(dashboard.energyTrends).toBeDefined();
      expect(dashboard.systemHealth).toBeDefined();
      expect(dashboard.topScenes).toBeDefined();
      expect(dashboard.summary).toBeDefined();
      expect(dashboard.summary.healthScore).toBeGreaterThanOrEqual(0);
      expect(dashboard.summary.healthScore).toBeLessThanOrEqual(100);
    });
  });

  describe("getHourlyDistribution", () => {
    it("should calculate hourly distribution", async () => {
      const mockEvents = [
        { type: "DEVICE_EVENT", deviceId: 1, timestamp: new Date("2025-01-10T08:00:00Z").getTime() },
        { type: "DEVICE_EVENT", deviceId: 1, timestamp: new Date("2025-01-10T08:30:00Z").getTime() },
        { type: "DEVICE_EVENT", deviceId: 1, timestamp: new Date("2025-01-10T14:00:00Z").getTime() },
      ];

      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const distribution = await analytics.getHourlyDistribution(mockClient);

      expect(distribution).toHaveLength(24);
      expect(distribution.every((h) => h.hour >= 0 && h.hour < 24)).toBe(true);
      expect(distribution.reduce((sum, h) => sum + h.count, 0)).toBe(3);
      expect(distribution.reduce((sum, h) => sum + h.percentage, 0)).toBeCloseTo(100, 1);
    });
  });

  describe("getRoomActivity", () => {
    it("should calculate room activity summary", async () => {
      const mockDevices = [
        { id: 1, name: "Light 1", roomID: 1 },
        { id: 2, name: "Light 2", roomID: 1 },
        { id: 3, name: "Sensor 1", roomID: 2 },
      ];

      const mockRooms = [
        { id: 1, name: "Living Room" },
        { id: 2, name: "Bedroom" },
      ];

      const mockEvents = [
        { type: "DEVICE_EVENT", deviceId: 1, timestamp: Date.now() },
        { type: "DEVICE_EVENT", deviceId: 1, timestamp: Date.now() },
        { type: "DEVICE_EVENT", deviceId: 3, timestamp: Date.now() },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.getRooms.mockResolvedValue(mockRooms);
      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const rooms = await analytics.getRoomActivity(mockClient);

      expect(rooms).toHaveLength(2);
      expect(rooms[0].roomName).toBe("Living Room");
      expect(rooms[0].activations).toBe(2);
      expect(rooms[0].activeDevices).toBe(1);
      expect(rooms[0].totalDevices).toBe(2);
      expect(rooms[1].roomName).toBe("Bedroom");
      expect(rooms[1].activations).toBe(1);
      expect(rooms[1].activeDevices).toBe(1);
      expect(rooms[1].totalDevices).toBe(1);
    });

    it("should filter by room_ids", async () => {
      const mockDevices = [
        { id: 1, name: "Light 1", roomID: 1 },
        { id: 2, name: "Light 2", roomID: 2 },
      ];

      const mockRooms = [
        { id: 1, name: "Room 1" },
        { id: 2, name: "Room 2" },
      ];

      const mockEvents = [
        { type: "DEVICE_EVENT", deviceId: 1, timestamp: Date.now() },
        { type: "DEVICE_EVENT", deviceId: 2, timestamp: Date.now() },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.getRooms.mockResolvedValue(mockRooms);
      mockClient.getEventLog.mockResolvedValue(mockEvents);

      const rooms = await analytics.getRoomActivity(mockClient, { room_ids: [1] });

      expect(rooms).toHaveLength(1);
      expect(rooms[0].roomId).toBe(1);
    });
  });
});
