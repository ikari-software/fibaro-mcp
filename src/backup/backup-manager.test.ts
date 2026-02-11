/**
 * Fibaro MCP Server - Backup Manager Tests
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BackupManager } from "./backup-manager.js";
import { ExportFormatter } from "./export-formatter.js";
import { ImportValidator } from "./import-validator.js";
import type { FibaroExport } from "./backup-types.js";

describe("BackupManager", () => {
  let manager: BackupManager;
  let mockClient: any;

  beforeEach(() => {
    manager = new BackupManager();
    mockClient = {
      getSystemInfo: vi.fn(),
      getDevices: vi.fn(),
      getScenes: vi.fn(),
      getRooms: vi.fn(),
      getSections: vi.fn(),
      getGlobalVariables: vi.fn(),
      getUsers: vi.fn(),
      getDevice: vi.fn(),
      updateDevice: vi.fn(),
      createRoom: vi.fn(),
      updateRoom: vi.fn(),
      createSection: vi.fn(),
      updateSection: vi.fn(),
      createGlobalVariable: vi.fn(),
      setGlobalVariable: vi.fn(),
      createScene: vi.fn(),
      updateScene: vi.fn(),
      createUser: vi.fn(),
      updateUser: vi.fn(),
    };
  });

  describe("exportSystem", () => {
    it("should export all system data by default", async () => {
      mockClient.getSystemInfo.mockResolvedValue({ serial_number: "123456" });
      mockClient.getDevices.mockResolvedValue([{ id: 1, name: "Device 1" }]);
      mockClient.getScenes.mockResolvedValue([{ id: 1, name: "Scene 1" }]);
      mockClient.getRooms.mockResolvedValue([{ id: 1, name: "Room 1" }]);
      mockClient.getSections.mockResolvedValue([{ id: 1, name: "Section 1" }]);
      mockClient.getGlobalVariables.mockResolvedValue([{ name: "var1", value: "value1" }]);
      mockClient.getUsers.mockResolvedValue([{ username: "user1", password: "secret" }]);

      const result = await manager.exportSystem(mockClient, {
        format: "json",
        include_users: true,
      });

      expect(result.version).toBe("3.0.0");
      expect(result.export_date).toBeDefined();
      expect(result.system_info).toEqual({ serial_number: "123456" });
      expect(result.devices).toHaveLength(1);
      expect(result.scenes).toHaveLength(1);
      expect(result.rooms).toHaveLength(1);
      expect(result.sections).toHaveLength(1);
      expect(result.global_variables).toHaveLength(1);
      expect(result.users).toHaveLength(1);
      expect(result.metadata.device_count).toBe(1);
      expect(result.metadata.export_duration_ms).toBeGreaterThan(0);
    });

    it("should exclude users by default", async () => {
      mockClient.getSystemInfo.mockResolvedValue({});
      mockClient.getDevices.mockResolvedValue([]);
      mockClient.getScenes.mockResolvedValue([]);
      mockClient.getRooms.mockResolvedValue([]);
      mockClient.getSections.mockResolvedValue([]);
      mockClient.getGlobalVariables.mockResolvedValue([]);
      mockClient.getUsers.mockResolvedValue([{ username: "user1" }]);

      const result = await manager.exportSystem(mockClient, {
        format: "json",
      });

      expect(result.users).toBeUndefined();
    });

    it("should respect include parameter", async () => {
      mockClient.getSystemInfo.mockResolvedValue({});
      mockClient.getDevices.mockResolvedValue([{ id: 1, name: "Device 1" }]);
      mockClient.getRooms.mockResolvedValue([{ id: 1, name: "Room 1" }]);

      const result = await manager.exportSystem(mockClient, {
        format: "json",
        include: ["devices", "rooms"],
      });

      expect(result.devices).toHaveLength(1);
      expect(result.rooms).toHaveLength(1);
      expect(result.scenes).toBeUndefined();
      expect(result.sections).toBeUndefined();
      expect(result.global_variables).toBeUndefined();
    });

    it("should respect exclude parameter", async () => {
      mockClient.getSystemInfo.mockResolvedValue({});
      mockClient.getDevices.mockResolvedValue([]);
      mockClient.getScenes.mockResolvedValue([]);
      mockClient.getRooms.mockResolvedValue([]);
      mockClient.getSections.mockResolvedValue([]);
      mockClient.getGlobalVariables.mockResolvedValue([]);

      const result = await manager.exportSystem(mockClient, {
        format: "json",
        exclude: ["devices", "scenes"],
      });

      expect(result.devices).toBeUndefined();
      expect(result.scenes).toBeUndefined();
      expect(result.rooms).toBeDefined();
      expect(result.sections).toBeDefined();
      expect(result.global_variables).toBeDefined();
    });

    it("should remove passwords when include_passwords is false", async () => {
      mockClient.getSystemInfo.mockResolvedValue({});
      mockClient.getDevices.mockResolvedValue([]);
      mockClient.getScenes.mockResolvedValue([]);
      mockClient.getRooms.mockResolvedValue([]);
      mockClient.getSections.mockResolvedValue([]);
      mockClient.getGlobalVariables.mockResolvedValue([]);
      mockClient.getUsers.mockResolvedValue([
        { username: "user1", password: "secret123" },
      ]);

      const result = await manager.exportSystem(mockClient, {
        format: "json",
        include_users: true,
        include_passwords: false,
      });

      expect(result.users).toHaveLength(1);
      expect(result.users![0].username).toBe("user1");
      expect(result.users![0].password).toBeUndefined();
    });

    it("should handle API errors gracefully", async () => {
      mockClient.getSystemInfo.mockResolvedValue({});
      mockClient.getDevices.mockRejectedValue(new Error("API Error"));
      mockClient.getScenes.mockResolvedValue([]);
      mockClient.getRooms.mockResolvedValue([]);
      mockClient.getSections.mockResolvedValue([]);
      mockClient.getGlobalVariables.mockResolvedValue([]);

      const result = await manager.exportSystem(mockClient, {
        format: "json",
      });

      // Should complete export even if devices fails
      expect(result.devices).toEqual([]);
      expect(result.metadata.device_count).toBe(0);
    });
  });

  describe("importSystem", () => {
    it("should import rooms successfully", async () => {
      const exportData: FibaroExport = {
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        rooms: [{ id: 1, name: "Living Room" }],
        metadata: {
          device_count: 0,
          scene_count: 0,
          room_count: 1,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      mockClient.getRooms.mockResolvedValue([]);
      mockClient.createRoom.mockResolvedValue({ id: 1 });

      const result = await manager.importSystem(mockClient, exportData, {});

      expect(result.success).toBe(true);
      expect(result.imported.rooms).toBe(1);
      expect(result.failed.rooms).toBe(0);
      expect(mockClient.createRoom).toHaveBeenCalled();
    });

    it("should skip existing rooms when skip_existing is true", async () => {
      const exportData: FibaroExport = {
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        rooms: [{ id: 1, name: "Living Room" }],
        metadata: {
          device_count: 0,
          scene_count: 0,
          room_count: 1,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      mockClient.getRooms.mockResolvedValue([{ id: 1, name: "Living Room" }]);

      const result = await manager.importSystem(mockClient, exportData, {
        skip_existing: true,
      });

      expect(result.imported.rooms).toBe(0);
      expect(result.skipped.rooms).toBe(1);
      expect(mockClient.createRoom).not.toHaveBeenCalled();
    });

    it("should update existing rooms when update_existing is true", async () => {
      const exportData: FibaroExport = {
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        rooms: [{ id: 1, name: "Living Room", section: 1 }],
        metadata: {
          device_count: 0,
          scene_count: 0,
          room_count: 1,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      mockClient.getRooms.mockResolvedValue([{ id: 1, name: "Living Room", section: 0 }]);
      mockClient.getSections.mockResolvedValue([]);
      mockClient.getDevices.mockResolvedValue([]);
      mockClient.getGlobalVariables.mockResolvedValue([]);
      mockClient.getScenes.mockResolvedValue([]);
      mockClient.getUsers.mockResolvedValue([]);
      mockClient.updateRoom.mockResolvedValue({ id: 1 });

      const result = await manager.importSystem(mockClient, exportData, {
        update_existing: true,
      });

      expect(result.imported.rooms).toBe(1);
      expect(mockClient.updateRoom).toHaveBeenCalledWith(1, { id: 1, name: "Living Room", section: 1 });
    });

    it("should perform dry run without making changes", async () => {
      const exportData: FibaroExport = {
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        rooms: [{ id: 1, name: "Living Room" }],
        scenes: [{ id: 1, name: "Scene 1" }],
        metadata: {
          device_count: 0,
          scene_count: 1,
          room_count: 1,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      const result = await manager.importSystem(mockClient, exportData, {
        dry_run: true,
      });

      expect(result.imported.rooms).toBe(1);
      expect(result.imported.scenes).toBe(1);
      expect(mockClient.createRoom).not.toHaveBeenCalled();
      expect(mockClient.createScene).not.toHaveBeenCalled();
    });

    it("should import only specified types", async () => {
      const exportData: FibaroExport = {
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        rooms: [{ id: 1, name: "Living Room" }],
        scenes: [{ id: 1, name: "Scene 1" }],
        metadata: {
          device_count: 0,
          scene_count: 1,
          room_count: 1,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      mockClient.getRooms.mockResolvedValue([]);
      mockClient.createRoom.mockResolvedValue({ id: 1 });

      const result = await manager.importSystem(mockClient, exportData, {
        types: ["rooms"],
      });

      expect(result.imported.rooms).toBe(1);
      expect(result.imported.scenes).toBe(0);
      expect(mockClient.createRoom).toHaveBeenCalled();
      expect(mockClient.createScene).not.toHaveBeenCalled();
    });

    it("should track import errors", async () => {
      const exportData: FibaroExport = {
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        rooms: [{ id: 1, name: "Living Room" }],
        metadata: {
          device_count: 0,
          scene_count: 0,
          room_count: 1,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      mockClient.getRooms.mockResolvedValue([]);
      mockClient.createRoom.mockRejectedValue(new Error("Room creation failed"));

      const result = await manager.importSystem(mockClient, exportData, {});

      expect(result.imported.rooms).toBe(0);
      expect(result.failed.rooms).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe("rooms");
      expect(result.errors[0].error).toContain("Room creation failed");
    });
  });
});

describe("ExportFormatter", () => {
  let formatter: ExportFormatter;

  beforeEach(() => {
    formatter = new ExportFormatter();
  });

  describe("formatJSON", () => {
    it("should format export data as JSON", () => {
      const exportData: FibaroExport = {
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        metadata: {
          device_count: 0,
          scene_count: 0,
          room_count: 0,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      const result = formatter.format(exportData, "json");

      expect(result).toContain('"version": "3.0.0"');
      expect(result).toContain('"export_date": "2025-01-01T00:00:00Z"');
      expect(() => JSON.parse(result)).not.toThrow();
    });
  });

  describe("parseJSON", () => {
    it("should parse JSON export data", () => {
      const jsonData = JSON.stringify({
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        metadata: {
          device_count: 0,
          scene_count: 0,
          room_count: 0,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      });

      const result = formatter.parse(jsonData, "json");

      expect(result.version).toBe("3.0.0");
      expect(result.export_date).toBe("2025-01-01T00:00:00Z");
    });

    it("should throw on invalid JSON", () => {
      expect(() => formatter.parse("invalid json", "json")).toThrow();
    });
  });

  describe("detectFormat", () => {
    it("should detect JSON format", () => {
      const jsonData = '{"version": "3.0.0"}';
      const format = formatter.detectFormat(jsonData);
      expect(format).toBe("json");
    });

    it("should detect YAML format", () => {
      const yamlData = "version: 3.0.0\ndevices:\n  - id: 1";
      const format = formatter.detectFormat(yamlData);
      expect(format).toBe("yaml");
    });

    it("should default to JSON for ambiguous data", () => {
      const data = "some random text";
      const format = formatter.detectFormat(data);
      expect(format).toBe("json");
    });
  });
});

describe("ImportValidator", () => {
  let validator: ImportValidator;

  beforeEach(() => {
    validator = new ImportValidator();
  });

  describe("validate", () => {
    it("should validate correct export data", () => {
      const exportData: FibaroExport = {
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        metadata: {
          device_count: 0,
          scene_count: 0,
          room_count: 0,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      const result = validator.validate(exportData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject data missing required fields", () => {
      const exportData = {
        // Missing version, export_date, metadata
        system_info: {},
      } as any;

      const result = validator.validate(exportData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.field === "version")).toBe(true);
      expect(result.errors.some((e) => e.field === "export_date")).toBe(true);
      expect(result.errors.some((e) => e.field === "metadata")).toBe(true);
    });

    it("should reject data with invalid date format", () => {
      const exportData: FibaroExport = {
        version: "3.0.0",
        export_date: "invalid-date",
        system_info: {},
        metadata: {
          device_count: 0,
          scene_count: 0,
          room_count: 0,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      const result = validator.validate(exportData);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "export_date")).toBe(true);
    });

    it("should reject data with non-array fields", () => {
      const exportData: any = {
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        devices: "not-an-array",
        metadata: {
          device_count: 0,
          scene_count: 0,
          room_count: 0,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      const result = validator.validate(exportData);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "devices")).toBe(true);
    });

    it("should warn about count mismatches", () => {
      const exportData: FibaroExport = {
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        devices: [{ id: 1, name: "Device 1" }, { id: 2, name: "Device 2" }],
        metadata: {
          device_count: 5, // Mismatch!
          scene_count: 0,
          room_count: 0,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      const result = validator.validate(exportData);

      expect(result.warnings.some((w) => w.field === "devices")).toBe(true);
      expect(result.warnings.some((w) => w.message.includes("mismatch"))).toBe(true);
    });

    it("should warn about missing referenced rooms", () => {
      const exportData: FibaroExport = {
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        devices: [{ id: 1, name: "Device 1", roomID: 99 }], // Room 99 doesn't exist
        rooms: [{ id: 1, name: "Room 1" }],
        metadata: {
          device_count: 1,
          scene_count: 0,
          room_count: 1,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      const result = validator.validate(exportData);

      expect(result.warnings.some((w) => w.message.includes("missing room"))).toBe(true);
    });

    it("should reject devices without required fields", () => {
      const exportData: FibaroExport = {
        version: "3.0.0",
        export_date: "2025-01-01T00:00:00Z",
        system_info: {},
        devices: [{ id: 1 } as any], // Missing name
        metadata: {
          device_count: 1,
          scene_count: 0,
          room_count: 0,
          section_count: 0,
          variable_count: 0,
          user_count: 0,
        },
      };

      const result = validator.validate(exportData);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "devices")).toBe(true);
    });
  });
});
