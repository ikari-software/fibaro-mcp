/**
 * Fibaro MCP Server - Backup Manager
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { logger } from "../logger.js";
import type { FibaroClientLike } from "../fibaro-client.js";
import type {
  FibaroExport,
  ExportOptions,
  ExportDataType,
  ImportOptions,
  ImportResult,
  ImportStats,
} from "./backup-types.js";

export class BackupManager {
  // Per-import cache to avoid redundant API calls in finder methods
  private importCache: Map<string, any[]> | null = null;
  private importInProgress = false;

  /**
   * Export Fibaro system data
   */
  async exportSystem(
    client: FibaroClientLike,
    options: ExportOptions
  ): Promise<FibaroExport> {
    const startTime = Date.now();
    logger.info("Starting system export", { options });

    // Determine what to include
    const includeTypes = this.getIncludeTypes(options);
    logger.debug(`Including types: ${includeTypes.join(", ")}`);

    // Fetch system info
    const systemInfo = await this.fetchSystemInfo(client);

    // Initialize export structure
    const exportData: FibaroExport = {
      version: "3.0.0",
      export_date: new Date().toISOString(),
      system_info: systemInfo,
      metadata: {
        device_count: 0,
        scene_count: 0,
        room_count: 0,
        section_count: 0,
        variable_count: 0,
        user_count: 0,
      },
    };

    // Fetch each data type
    if (includeTypes.includes("devices")) {
      logger.debug("Fetching devices...");
      exportData.devices = await this.fetchDevices(client);
      exportData.metadata.device_count = exportData.devices.length;
    }

    if (includeTypes.includes("scenes")) {
      logger.debug("Fetching scenes...");
      exportData.scenes = await this.fetchScenes(client);
      exportData.metadata.scene_count = exportData.scenes.length;
    }

    if (includeTypes.includes("rooms")) {
      logger.debug("Fetching rooms...");
      exportData.rooms = await this.fetchRooms(client);
      exportData.metadata.room_count = exportData.rooms.length;
    }

    if (includeTypes.includes("sections")) {
      logger.debug("Fetching sections...");
      exportData.sections = await this.fetchSections(client);
      exportData.metadata.section_count = exportData.sections.length;
    }

    if (includeTypes.includes("variables")) {
      logger.debug("Fetching global variables...");
      exportData.global_variables = await this.fetchGlobalVariables(client);
      exportData.metadata.variable_count = exportData.global_variables.length;
    }

    if (includeTypes.includes("users")) {
      logger.debug("Fetching users...");
      exportData.users = await this.fetchUsers(client, options.include_passwords || false);
      exportData.metadata.user_count = exportData.users.length;
    }

    const duration = Date.now() - startTime;
    exportData.metadata.export_duration_ms = duration;

    logger.info("System export complete", {
      duration_ms: duration,
      metadata: exportData.metadata,
    });

    return exportData;
  }

  /**
   * Import Fibaro system data
   */
  async importSystem(
    client: FibaroClientLike,
    exportData: FibaroExport,
    options: ImportOptions
  ): Promise<ImportResult> {
    if (this.importInProgress) {
      throw new Error("An import is already in progress");
    }
    this.importInProgress = true;

    const startTime = Date.now();
    logger.info("Starting system import", { options, dry_run: options.dry_run });

    const result: ImportResult = {
      success: true,
      imported: this.createEmptyStats(),
      skipped: this.createEmptyStats(),
      failed: this.createEmptyStats(),
      errors: [],
      duration_ms: 0,
    };

    // Determine what to import
    const importTypes = options.types || [
      "devices",
      "scenes",
      "rooms",
      "sections",
      "variables",
      "users",
    ];

    // Initialize per-import cache to avoid repeated API calls in findXByName
    this.importCache = new Map();

    try {
      // Import sections first (rooms depend on sections)
      if (importTypes.includes("sections") && exportData.sections) {
        await this.importSections(client, exportData.sections, options, result);
      }

      // Import rooms (devices depend on rooms)
      if (importTypes.includes("rooms") && exportData.rooms) {
        await this.importRooms(client, exportData.rooms, options, result);
      }

      // Import devices
      if (importTypes.includes("devices") && exportData.devices) {
        await this.importDevices(client, exportData.devices, options, result);
      }

      // Import global variables
      if (importTypes.includes("variables") && exportData.global_variables) {
        await this.importGlobalVariables(
          client,
          exportData.global_variables,
          options,
          result
        );
      }

      // Import scenes
      if (importTypes.includes("scenes") && exportData.scenes) {
        await this.importScenes(client, exportData.scenes, options, result);
      }

      // Import users
      if (importTypes.includes("users") && exportData.users) {
        await this.importUsers(client, exportData.users, options, result);
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: "unknown",
        error: `Import failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      logger.error("System import failed", error);
    } finally {
      // Clear per-import cache and release mutex
      this.importCache = null;
      this.importInProgress = false;
    }

    result.duration_ms = Date.now() - startTime;
    result.success = result.errors.length === 0;

    logger.info("System import complete", {
      success: result.success,
      duration_ms: result.duration_ms,
      imported: result.imported,
      failed: result.failed,
    });

    return result;
  }

  // Private helper methods

  private getIncludeTypes(options: ExportOptions): ExportDataType[] {
    const allTypes: ExportDataType[] = [
      "devices",
      "scenes",
      "rooms",
      "sections",
      "variables",
      "users",
    ];

    if (options.include && options.include.length > 0) {
      return options.include;
    }

    if (options.exclude && options.exclude.length > 0) {
      return allTypes.filter(
        (type) =>
          !options.exclude!.includes(type) &&
          (type !== "users" || options.include_users)
      );
    }

    // Default: include everything except users (for security)
    return allTypes.filter((type) => type !== "users" || options.include_users);
  }

  private async fetchSystemInfo(client: FibaroClientLike): Promise<any> {
    try {
      return await client.getSystemInfo();
    } catch (error) {
      logger.warn("Failed to fetch system info", error);
      return {};
    }
  }

  private async fetchDevices(client: FibaroClientLike): Promise<any[]> {
    try {
      return await client.getDevices();
    } catch (error) {
      logger.error("Failed to fetch devices", error);
      return [];
    }
  }

  private async fetchScenes(client: FibaroClientLike): Promise<any[]> {
    try {
      return await client.getScenes();
    } catch (error) {
      logger.error("Failed to fetch scenes", error);
      return [];
    }
  }

  private async fetchRooms(client: FibaroClientLike): Promise<any[]> {
    try {
      return await client.getRooms();
    } catch (error) {
      logger.error("Failed to fetch rooms", error);
      return [];
    }
  }

  private async fetchSections(client: FibaroClientLike): Promise<any[]> {
    try {
      return await client.getSections();
    } catch (error) {
      logger.error("Failed to fetch sections", error);
      return [];
    }
  }

  private async fetchGlobalVariables(client: FibaroClientLike): Promise<any[]> {
    try {
      return await client.getGlobalVariables();
    } catch (error) {
      logger.error("Failed to fetch global variables", error);
      return [];
    }
  }

  private async fetchUsers(client: FibaroClientLike, includePasswords: boolean): Promise<any[]> {
    try {
      const users = await client.getUsers();
      if (!includePasswords) {
        // Remove passwords for security
        return users.map((user: any) => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });
      }
      return users;
    } catch (error) {
      logger.error("Failed to fetch users", error);
      return [];
    }
  }

  private async importRooms(
    client: FibaroClientLike,
    rooms: any[],
    options: ImportOptions,
    result: ImportResult
  ): Promise<void> {
    logger.debug(`Importing ${rooms.length} rooms...`);

    for (const room of rooms) {
      try {
        if (options.dry_run) {
          result.skipped.rooms++;
          continue;
        }

        // Check if room exists
        const existing = await this.findRoomByName(client, room.name);

        if (existing) {
          if (options.skip_existing) {
            result.skipped.rooms++;
            continue;
          }

          if (options.update_existing) {
            await client.updateRoom(existing.id, room);
            result.imported.rooms++;
          } else {
            result.skipped.rooms++;
          }
        } else {
          await client.createRoom(room);
          this.invalidateCache("rooms");
          result.imported.rooms++;
        }
      } catch (error) {
        result.failed.rooms++;
        result.errors.push({
          type: "rooms",
          name: room.name,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.warn(`Failed to import room: ${room.name}`, error);
      }
    }
  }

  private async importSections(
    client: FibaroClientLike,
    sections: any[],
    options: ImportOptions,
    result: ImportResult
  ): Promise<void> {
    logger.debug(`Importing ${sections.length} sections...`);

    for (const section of sections) {
      try {
        if (options.dry_run) {
          result.skipped.sections++;
          continue;
        }

        const existing = await this.findSectionByName(client, section.name);

        if (existing) {
          if (options.skip_existing) {
            result.skipped.sections++;
            continue;
          }

          if (options.update_existing) {
            await client.updateSection(existing.id, section);
            result.imported.sections++;
          } else {
            result.skipped.sections++;
          }
        } else {
          await client.createSection(section);
          this.invalidateCache("sections");
          result.imported.sections++;
        }
      } catch (error) {
        result.failed.sections++;
        result.errors.push({
          type: "sections",
          name: section.name,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.warn(`Failed to import section: ${section.name}`, error);
      }
    }
  }

  private async importDevices(
    client: FibaroClientLike,
    devices: any[],
    options: ImportOptions,
    result: ImportResult
  ): Promise<void> {
    logger.debug(`Importing ${devices.length} devices...`);

    for (const device of devices) {
      try {
        if (options.dry_run) {
          result.skipped.devices++;
          continue;
        }

        // Note: Devices are typically created by inclusion, not via API
        // We can only update device properties like name, room, etc.
        const existing = await this.findDeviceById(client, device.id);

        if (existing) {
          if (options.skip_existing) {
            result.skipped.devices++;
            continue;
          }

          if (options.update_existing) {
            await client.updateDevice(device.id, {
              name: device.name,
              roomID: device.roomID,
              properties: device.properties,
            });
            result.imported.devices++;
          } else {
            result.skipped.devices++;
          }
        } else {
          // Cannot create devices via API in most cases
          result.skipped.devices++;
          logger.debug(`Device ${device.id} does not exist, skipping`);
        }
      } catch (error) {
        result.failed.devices++;
        result.errors.push({
          type: "devices",
          id: device.id,
          name: device.name,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.warn(`Failed to import device: ${device.name}`, error);
      }
    }
  }

  private async importGlobalVariables(
    client: FibaroClientLike,
    variables: any[],
    options: ImportOptions,
    result: ImportResult
  ): Promise<void> {
    logger.debug(`Importing ${variables.length} global variables...`);

    for (const variable of variables) {
      try {
        if (options.dry_run) {
          result.skipped.variables++;
          continue;
        }

        const existing = await this.findVariableByName(client, variable.name);

        if (existing) {
          if (options.skip_existing) {
            result.skipped.variables++;
            continue;
          }

          if (options.update_existing) {
            await client.setGlobalVariable(variable.name, variable.value);
            result.imported.variables++;
          } else {
            result.skipped.variables++;
          }
        } else {
          await client.createGlobalVariable(variable);
          this.invalidateCache("variables");
          result.imported.variables++;
        }
      } catch (error) {
        result.failed.variables++;
        result.errors.push({
          type: "variables",
          name: variable.name,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.warn(`Failed to import variable: ${variable.name}`, error);
      }
    }
  }

  private async importScenes(
    client: FibaroClientLike,
    scenes: any[],
    options: ImportOptions,
    result: ImportResult
  ): Promise<void> {
    logger.debug(`Importing ${scenes.length} scenes...`);

    for (const scene of scenes) {
      try {
        if (options.dry_run) {
          result.skipped.scenes++;
          continue;
        }

        const existing = await this.findSceneByName(client, scene.name);

        if (existing) {
          if (options.skip_existing) {
            result.skipped.scenes++;
            continue;
          }

          if (options.update_existing) {
            await client.updateScene(existing.id, scene);
            result.imported.scenes++;
          } else {
            result.skipped.scenes++;
          }
        } else {
          await client.createScene(scene);
          this.invalidateCache("scenes");
          result.imported.scenes++;
        }
      } catch (error) {
        result.failed.scenes++;
        result.errors.push({
          type: "scenes",
          name: scene.name,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.warn(`Failed to import scene: ${scene.name}`, error);
      }
    }
  }

  private async importUsers(
    client: FibaroClientLike,
    users: any[],
    options: ImportOptions,
    result: ImportResult
  ): Promise<void> {
    logger.debug(`Importing ${users.length} users...`);

    for (const user of users) {
      try {
        if (options.dry_run) {
          result.skipped.users++;
          continue;
        }

        const existing = await this.findUserByName(client, user.username);

        if (existing) {
          if (options.skip_existing) {
            result.skipped.users++;
            continue;
          }

          if (options.update_existing) {
            await client.updateUser(existing.id, user);
            result.imported.users++;
          } else {
            result.skipped.users++;
          }
        } else {
          await client.createUser(user);
          this.invalidateCache("users");
          result.imported.users++;
        }
      } catch (error) {
        result.failed.users++;
        result.errors.push({
          type: "users",
          name: user.username,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.warn(`Failed to import user: ${user.username}`, error);
      }
    }
  }

  // Finder helper methods (use importCache when available to avoid repeated API calls)

  private invalidateCache(key: string): void {
    this.importCache?.delete(key);
  }

  private async getCachedList(client: FibaroClientLike, key: string, fetcher: () => Promise<any[]>): Promise<any[]> {
    if (this.importCache) {
      if (!this.importCache.has(key)) {
        this.importCache.set(key, await fetcher());
      }
      return this.importCache.get(key)!;
    }
    return fetcher();
  }

  private async findRoomByName(client: FibaroClientLike, name: string): Promise<any | null> {
    try {
      const rooms = await this.getCachedList(client, "rooms", () => client.getRooms());
      return rooms.find((r: any) => r.name === name) || null;
    } catch {
      return null;
    }
  }

  private async findSectionByName(client: FibaroClientLike, name: string): Promise<any | null> {
    try {
      const sections = await this.getCachedList(client, "sections", () => client.getSections());
      return sections.find((s: any) => s.name === name) || null;
    } catch {
      return null;
    }
  }

  private async findDeviceById(client: FibaroClientLike, id: number): Promise<any | null> {
    try {
      return await client.getDevice(id);
    } catch {
      return null;
    }
  }

  private async findVariableByName(client: FibaroClientLike, name: string): Promise<any | null> {
    try {
      const variables = await this.getCachedList(client, "variables", () => client.getGlobalVariables());
      return variables.find((v: any) => v.name === name) || null;
    } catch {
      return null;
    }
  }

  private async findSceneByName(client: FibaroClientLike, name: string): Promise<any | null> {
    try {
      const scenes = await this.getCachedList(client, "scenes", () => client.getScenes());
      return scenes.find((s: any) => s.name === name) || null;
    } catch {
      return null;
    }
  }

  private async findUserByName(client: FibaroClientLike, username: string): Promise<any | null> {
    try {
      const users = await this.getCachedList(client, "users", () => client.getUsers());
      return users.find((u: any) => u.username === username) || null;
    } catch {
      return null;
    }
  }

  private createEmptyStats(): ImportStats {
    return {
      devices: 0,
      scenes: 0,
      rooms: 0,
      sections: 0,
      variables: 0,
      users: 0,
    };
  }
}

// Singleton instance
let backupManager: BackupManager | null = null;

export function getBackupManager(): BackupManager {
  if (!backupManager) {
    backupManager = new BackupManager();
  }
  return backupManager;
}
