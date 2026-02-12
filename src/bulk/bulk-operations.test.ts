/**
 * Fibaro MCP Server - Bulk Operations Tests
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueryEngine } from "./query-engine.js";
import { BulkOperationsManager } from "./bulk-operations.js";
import type { DeviceQuery, BulkAction } from "./bulk-types.js";

describe("QueryEngine", () => {
  let queryEngine: QueryEngine;

  beforeEach(() => {
    queryEngine = new QueryEngine();
  });

  describe("filterDevices", () => {
    const mockDevices = [
      { id: 1, name: "Light 1", type: "com.fibaro.binarySwitch", roomID: 1, enabled: true, visible: true },
      { id: 2, name: "Light 2", type: "com.fibaro.binarySwitch", roomID: 2, enabled: true, visible: true },
      { id: 3, name: "Sensor 1", type: "com.fibaro.temperatureSensor", roomID: 1, enabled: false, visible: true },
      { id: 4, name: "Dimmer 1", type: "com.fibaro.multilevelSwitch", roomID: 3, enabled: true, visible: false },
      { id: 5, name: "RGB Light", type: "com.fibaro.colorController", roomID: 1, enabled: true, visible: true, interfaces: ["light", "color"] },
    ];

    it("should filter by device IDs", () => {
      const query: DeviceQuery = { device_ids: [1, 3] };
      const result = queryEngine.filterDevices(mockDevices, query);
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.id)).toEqual([1, 3]);
    });

    it("should filter by room IDs", () => {
      const query: DeviceQuery = { room_ids: [1] };
      const result = queryEngine.filterDevices(mockDevices, query);
      expect(result).toHaveLength(3);
      expect(result.every((d) => d.roomID === 1)).toBe(true);
    });

    it("should filter by device type", () => {
      const query: DeviceQuery = { type: "com.fibaro.binarySwitch" };
      const result = queryEngine.filterDevices(mockDevices, query);
      expect(result).toHaveLength(2);
      expect(result.every((d) => d.type === "com.fibaro.binarySwitch")).toBe(true);
    });

    it("should filter by interface", () => {
      const query: DeviceQuery = { interface: "light" };
      const result = queryEngine.filterDevices(mockDevices, query);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(5);
    });

    it("should filter by name pattern", () => {
      const query: DeviceQuery = { name_pattern: "Light" };
      const result = queryEngine.filterDevices(mockDevices, query);
      expect(result).toHaveLength(3);
    });

    it("should filter by enabled status", () => {
      const query: DeviceQuery = { enabled: true };
      const result = queryEngine.filterDevices(mockDevices, query);
      expect(result).toHaveLength(4);
      expect(result.every((d) => d.enabled === true)).toBe(true);
    });

    it("should filter by visible status", () => {
      const query: DeviceQuery = { visible: false };
      const result = queryEngine.filterDevices(mockDevices, query);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(4);
    });

    it("should combine multiple filters", () => {
      const query: DeviceQuery = {
        room_ids: [1],
        enabled: true,
        visible: true
      };
      const result = queryEngine.filterDevices(mockDevices, query);
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.id)).toEqual([1, 5]);
    });

    it("should filter by property value with == operator", () => {
      const devicesWithProps = [
        { id: 1, name: "Light 1", properties: { value: true } },
        { id: 2, name: "Light 2", properties: { value: false } },
      ];
      const query: DeviceQuery = {
        property: { name: "value", value: true, operator: "==" }
      };
      const result = queryEngine.filterDevices(devicesWithProps, query);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it("should filter by property value with > operator", () => {
      const devicesWithProps = [
        { id: 1, name: "Sensor 1", properties: { temperature: 20 } },
        { id: 2, name: "Sensor 2", properties: { temperature: 25 } },
        { id: 3, name: "Sensor 3", properties: { temperature: 30 } },
      ];
      const query: DeviceQuery = {
        property: { name: "temperature", value: 23, operator: ">" }
      };
      const result = queryEngine.filterDevices(devicesWithProps, query);
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.id)).toEqual([2, 3]);
    });
  });

  describe("validateQuery", () => {
    it("should validate a valid query", () => {
      const query: DeviceQuery = { room_ids: [1] };
      const result = queryEngine.validateQuery(query);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty query", () => {
      const query: DeviceQuery = {};
      const result = queryEngine.validateQuery(query);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Query must have at least one filter criterion");
    });

    it("should reject property query without name", () => {
      const query: DeviceQuery = {
        property: { name: "", value: 10 }
      };
      const result = queryEngine.validateQuery(query);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Property query must specify property name");
    });

    it("should reject property query without value", () => {
      const query: DeviceQuery = {
        property: { name: "temperature", value: undefined as any }
      };
      const result = queryEngine.validateQuery(query);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Property query must specify property value");
    });

    it("should reject invalid property operator", () => {
      const query: DeviceQuery = {
        property: { name: "value", value: 10, operator: "~=" as any }
      };
      const result = queryEngine.validateQuery(query);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Invalid property operator"))).toBe(true);
    });

    it("should reject invalid regex pattern", () => {
      const query: DeviceQuery = { name_pattern: "[invalid" };
      const result = queryEngine.validateQuery(query);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Invalid name pattern regex"))).toBe(true);
    });
  });

  describe("getQuerySummary", () => {
    it("should generate summary for simple query", () => {
      const query: DeviceQuery = { room_ids: [1, 2] };
      const summary = queryEngine.getQuerySummary(query);
      expect(summary).toBe("room_ids=[1,2]");
    });

    it("should generate summary for complex query", () => {
      const query: DeviceQuery = {
        room_ids: [1],
        type: "com.fibaro.binarySwitch",
        enabled: true
      };
      const summary = queryEngine.getQuerySummary(query);
      expect(summary).toContain("room_ids=[1]");
      expect(summary).toContain("type=com.fibaro.binarySwitch");
      expect(summary).toContain("enabled=true");
    });

    it("should generate summary for property query", () => {
      const query: DeviceQuery = {
        property: { name: "value", value: true, operator: "==" }
      };
      const summary = queryEngine.getQuerySummary(query);
      expect(summary).toBe("value==true");
    });
  });
});

describe("BulkOperationsManager", () => {
  let bulkOps: BulkOperationsManager;
  let mockClient: any;

  beforeEach(() => {
    bulkOps = new BulkOperationsManager();
    mockClient = {
      getDevices: vi.fn(),
      callAction: vi.fn(),
      setDeviceProperty: vi.fn(),
      updateDevice: vi.fn(),
    };
  });

  describe("executeBulkOperation", () => {
    it("should execute device action on matched devices", async () => {
      const mockDevices = [
        { id: 1, name: "Light 1", type: "com.fibaro.binarySwitch", roomID: 1 },
        { id: 2, name: "Light 2", type: "com.fibaro.binarySwitch", roomID: 1 },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.callAction.mockResolvedValue({});

      const query: DeviceQuery = { room_ids: [1] };
      const action: BulkAction = { type: "device_action", action: "turnOff" };

      const result = await bulkOps.executeBulkOperation(mockClient, query, action);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(mockClient.callAction).toHaveBeenCalledTimes(2);
      expect(mockClient.callAction).toHaveBeenCalledWith(1, "turnOff", []);
      expect(mockClient.callAction).toHaveBeenCalledWith(2, "turnOff", []);
    });

    it("should execute set property on matched devices", async () => {
      const mockDevices = [
        { id: 1, name: "Dimmer 1", type: "com.fibaro.multilevelSwitch", roomID: 1 },
        { id: 2, name: "Dimmer 2", type: "com.fibaro.multilevelSwitch", roomID: 1 },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.setDeviceProperty.mockResolvedValue({});

      const query: DeviceQuery = { room_ids: [1] };
      const action: BulkAction = { type: "set_property", property: "value", value: 50 };

      const result = await bulkOps.executeBulkOperation(mockClient, query, action);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(mockClient.setDeviceProperty).toHaveBeenCalledTimes(2);
      expect(mockClient.setDeviceProperty).toHaveBeenCalledWith(1, "value", 50);
      expect(mockClient.setDeviceProperty).toHaveBeenCalledWith(2, "value", 50);
    });

    it("should handle enable action", async () => {
      const mockDevices = [
        { id: 1, name: "Device 1", enabled: false },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.updateDevice.mockResolvedValue({});

      const query: DeviceQuery = { device_ids: [1] };
      const action: BulkAction = { type: "enable" };

      const result = await bulkOps.executeBulkOperation(mockClient, query, action);

      expect(result.successful).toBe(1);
      expect(mockClient.updateDevice).toHaveBeenCalledWith(1, { enabled: true });
    });

    it("should handle disable action", async () => {
      const mockDevices = [
        { id: 1, name: "Device 1", enabled: true },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.updateDevice.mockResolvedValue({});

      const query: DeviceQuery = { device_ids: [1] };
      const action: BulkAction = { type: "disable" };

      const result = await bulkOps.executeBulkOperation(mockClient, query, action);

      expect(result.successful).toBe(1);
      expect(mockClient.updateDevice).toHaveBeenCalledWith(1, { enabled: false });
    });

    it("should handle update config action", async () => {
      const mockDevices = [
        { id: 1, name: "Device 1" },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.updateDevice.mockResolvedValue({});

      const query: DeviceQuery = { device_ids: [1] };
      const action: BulkAction = {
        type: "update_config",
        config: { name: "New Name" }
      };

      const result = await bulkOps.executeBulkOperation(mockClient, query, action);

      expect(result.successful).toBe(1);
      expect(mockClient.updateDevice).toHaveBeenCalledWith(1, { name: "New Name" });
    });

    it("should handle dry run mode", async () => {
      const mockDevices = [
        { id: 1, name: "Light 1", roomID: 1 },
        { id: 2, name: "Light 2", roomID: 1 },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);

      const query: DeviceQuery = { room_ids: [1] };
      const action: BulkAction = { type: "device_action", action: "turnOff" };

      const result = await bulkOps.executeBulkOperation(
        mockClient,
        query,
        action,
        { dry_run: true }
      );

      expect(result.total).toBe(2);
      expect(result.skipped).toBe(2);
      expect(mockClient.callAction).not.toHaveBeenCalled();
    });

    it("should handle stop on error", async () => {
      const mockDevices = [
        { id: 1, name: "Light 1", roomID: 1 },
        { id: 2, name: "Light 2", roomID: 1 },
        { id: 3, name: "Light 3", roomID: 1 },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.callAction
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("Device error"))
        .mockResolvedValueOnce({});

      const query: DeviceQuery = { room_ids: [1] };
      const action: BulkAction = { type: "device_action", action: "turnOff" };

      const result = await bulkOps.executeBulkOperation(
        mockClient,
        query,
        action,
        { stop_on_error: true }
      );

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(mockClient.callAction).toHaveBeenCalledTimes(2);
    });

    it("should handle parallel execution", async () => {
      const mockDevices = [
        { id: 1, name: "Light 1", roomID: 1 },
        { id: 2, name: "Light 2", roomID: 1 },
        { id: 3, name: "Light 3", roomID: 1 },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.callAction.mockResolvedValue({});

      const query: DeviceQuery = { room_ids: [1] };
      const action: BulkAction = { type: "device_action", action: "turnOff" };

      const result = await bulkOps.executeBulkOperation(
        mockClient,
        query,
        action,
        { parallel: true, concurrency: 2 }
      );

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(mockClient.callAction).toHaveBeenCalledTimes(3);
    });

    it("should track errors without stopping", async () => {
      const mockDevices = [
        { id: 1, name: "Light 1", roomID: 1 },
        { id: 2, name: "Light 2", roomID: 1 },
        { id: 3, name: "Light 3", roomID: 1 },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);
      mockClient.callAction
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error("Device error"))
        .mockResolvedValueOnce({});

      const query: DeviceQuery = { room_ids: [1] };
      const action: BulkAction = { type: "device_action", action: "turnOff" };

      const result = await bulkOps.executeBulkOperation(mockClient, query, action);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe("Device error");
    });

    it("should return empty result for no matching devices", async () => {
      mockClient.getDevices.mockResolvedValue([]);

      const query: DeviceQuery = { room_ids: [99] };
      const action: BulkAction = { type: "device_action", action: "turnOff" };

      const result = await bulkOps.executeBulkOperation(mockClient, query, action);

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it("should reject invalid query", async () => {
      const query: DeviceQuery = {}; // Empty query
      const action: BulkAction = { type: "device_action", action: "turnOff" };

      await expect(
        bulkOps.executeBulkOperation(mockClient, query, action)
      ).rejects.toThrow("Invalid query");
    });

    it("should reject missing action field for device_action", async () => {
      const mockDevices = [{ id: 1, name: "Device 1", roomID: 1 }];
      mockClient.getDevices.mockResolvedValue(mockDevices);

      const query: DeviceQuery = { device_ids: [1] };
      const action: BulkAction = { type: "device_action" }; // Missing 'action' field

      const result = await bulkOps.executeBulkOperation(mockClient, query, action);

      expect(result.failed).toBe(1);
      expect(result.results[0].error).toContain("requires 'action' field");
    });

    it("should reject missing property/value for set_property", async () => {
      const mockDevices = [{ id: 1, name: "Device 1", roomID: 1 }];
      mockClient.getDevices.mockResolvedValue(mockDevices);

      const query: DeviceQuery = { device_ids: [1] };
      const action: BulkAction = { type: "set_property" }; // Missing property and value

      const result = await bulkOps.executeBulkOperation(mockClient, query, action);

      expect(result.failed).toBe(1);
      expect(result.results[0].error).toContain("requires 'property' and 'value'");
    });
  });

  describe("previewQuery", () => {
    it("should preview matching devices", async () => {
      const mockDevices = [
        { id: 1, name: "Light 1", type: "com.fibaro.binarySwitch", roomID: 1, enabled: true },
        { id: 2, name: "Light 2", type: "com.fibaro.binarySwitch", roomID: 2, enabled: true },
      ];

      mockClient.getDevices.mockResolvedValue(mockDevices);

      const query: DeviceQuery = { room_ids: [1] };
      const preview = await bulkOps.previewQuery(mockClient, query);

      expect(preview).toHaveLength(1);
      expect(preview[0]).toEqual({
        id: 1,
        name: "Light 1",
        type: "com.fibaro.binarySwitch",
        roomID: 1,
        enabled: true,
      });
    });

    it("should reject invalid query in preview", async () => {
      const query: DeviceQuery = {}; // Empty query

      await expect(bulkOps.previewQuery(mockClient, query)).rejects.toThrow("Invalid query");
    });
  });
});
