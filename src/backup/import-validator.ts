/**
 * Fibaro MCP Server - Import Validator
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { logger } from "../logger.js";
import type {
  FibaroExport,
  ImportValidationResult,
  ImportValidationError,
  ImportValidationWarning,
} from "./backup-types.js";

export class ImportValidator {
  /**
   * Validate import data
   */
  validate(exportData: FibaroExport): ImportValidationResult {
    logger.debug("Validating import data");

    const errors: ImportValidationError[] = [];
    const warnings: ImportValidationWarning[] = [];

    // Validate schema
    this.validateSchema(exportData, errors);

    // Validate version compatibility
    this.validateVersion(exportData, warnings);

    // Validate data integrity
    this.validateDataIntegrity(exportData, errors, warnings);

    const result: ImportValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: exportData.metadata,
    };

    if (result.valid) {
      logger.info("Import data validation passed", {
        warnings: warnings.length,
      });
    } else {
      logger.warn("Import data validation failed", {
        errors: errors.length,
        warnings: warnings.length,
      });
    }

    return result;
  }

  // Private validation methods

  private validateSchema(
    exportData: FibaroExport,
    errors: ImportValidationError[]
  ): void {
    // Required fields
    if (!exportData.version) {
      errors.push({
        type: "schema",
        field: "version",
        message: "Missing required field: version",
      });
    }

    if (!exportData.export_date) {
      errors.push({
        type: "schema",
        field: "export_date",
        message: "Missing required field: export_date",
      });
    }

    if (!exportData.metadata) {
      errors.push({
        type: "schema",
        field: "metadata",
        message: "Missing required field: metadata",
      });
    }

    // Validate export_date format
    if (exportData.export_date) {
      const date = new Date(exportData.export_date);
      if (isNaN(date.getTime())) {
        errors.push({
          type: "schema",
          field: "export_date",
          message: "Invalid date format in export_date",
        });
      }
    }

    // Validate metadata structure
    if (exportData.metadata) {
      const requiredMetadataFields = [
        "device_count",
        "scene_count",
        "room_count",
        "section_count",
        "variable_count",
        "user_count",
      ];

      for (const field of requiredMetadataFields) {
        if (typeof (exportData.metadata as any)[field] !== "number") {
          errors.push({
            type: "schema",
            field: `metadata.${field}`,
            message: `Missing or invalid metadata field: ${field}`,
          });
        }
      }
    }

    // Validate arrays
    if (exportData.devices && !Array.isArray(exportData.devices)) {
      errors.push({
        type: "schema",
        field: "devices",
        message: "devices must be an array",
      });
    }

    if (exportData.scenes && !Array.isArray(exportData.scenes)) {
      errors.push({
        type: "schema",
        field: "scenes",
        message: "scenes must be an array",
      });
    }

    if (exportData.rooms && !Array.isArray(exportData.rooms)) {
      errors.push({
        type: "schema",
        field: "rooms",
        message: "rooms must be an array",
      });
    }

    if (exportData.sections && !Array.isArray(exportData.sections)) {
      errors.push({
        type: "schema",
        field: "sections",
        message: "sections must be an array",
      });
    }

    if (exportData.global_variables && !Array.isArray(exportData.global_variables)) {
      errors.push({
        type: "schema",
        field: "global_variables",
        message: "global_variables must be an array",
      });
    }

    if (exportData.users && !Array.isArray(exportData.users)) {
      errors.push({
        type: "schema",
        field: "users",
        message: "users must be an array",
      });
    }
  }

  private validateVersion(
    exportData: FibaroExport,
    warnings: ImportValidationWarning[]
  ): void {
    if (!exportData.version) {
      return;
    }

    const exportVersion = this.parseVersion(exportData.version);
    const currentVersion = this.parseVersion("3.0.0"); // Current MCP version

    if (exportVersion.major > currentVersion.major) {
      warnings.push({
        type: "compatibility",
        field: "version",
        message: `Export from newer version (${exportData.version}). Some features may not be supported.`,
      });
    }

    if (exportVersion.major < currentVersion.major) {
      warnings.push({
        type: "compatibility",
        field: "version",
        message: `Export from older version (${exportData.version}). Some data may need migration.`,
      });
    }
  }

  private validateDataIntegrity(
    exportData: FibaroExport,
    errors: ImportValidationError[],
    warnings: ImportValidationWarning[]
  ): void {
    // Validate device count matches
    if (exportData.devices && exportData.metadata) {
      const actualCount = exportData.devices.length;
      const expectedCount = exportData.metadata.device_count;

      if (actualCount !== expectedCount) {
        warnings.push({
          type: "missing",
          field: "devices",
          message: `Device count mismatch: expected ${expectedCount}, found ${actualCount}`,
        });
      }
    }

    // Validate scene count matches
    if (exportData.scenes && exportData.metadata) {
      const actualCount = exportData.scenes.length;
      const expectedCount = exportData.metadata.scene_count;

      if (actualCount !== expectedCount) {
        warnings.push({
          type: "missing",
          field: "scenes",
          message: `Scene count mismatch: expected ${expectedCount}, found ${actualCount}`,
        });
      }
    }

    // Validate room count matches
    if (exportData.rooms && exportData.metadata) {
      const actualCount = exportData.rooms.length;
      const expectedCount = exportData.metadata.room_count;

      if (actualCount !== expectedCount) {
        warnings.push({
          type: "missing",
          field: "rooms",
          message: `Room count mismatch: expected ${expectedCount}, found ${actualCount}`,
        });
      }
    }

    // Validate device references to rooms
    if (exportData.devices && exportData.rooms) {
      const roomIds = new Set(exportData.rooms.map((r: any) => r.id));

      for (const device of exportData.devices) {
        if (device.roomID && !roomIds.has(device.roomID)) {
          warnings.push({
            type: "missing",
            field: "devices",
            message: `Device "${device.name}" references missing room ID ${device.roomID}`,
          });
        }
      }
    }

    // Validate scene references to rooms
    if (exportData.scenes && exportData.rooms) {
      const roomIds = new Set(exportData.rooms.map((r: any) => r.id));

      for (const scene of exportData.scenes) {
        if (scene.roomID && !roomIds.has(scene.roomID)) {
          warnings.push({
            type: "missing",
            field: "scenes",
            message: `Scene "${scene.name}" references missing room ID ${scene.roomID}`,
          });
        }
      }
    }

    // Validate required fields in devices
    if (exportData.devices) {
      for (const device of exportData.devices) {
        if (!device.id) {
          errors.push({
            type: "data",
            field: "devices",
            message: `Device missing required field: id`,
          });
        }
        if (!device.name) {
          errors.push({
            type: "data",
            field: "devices",
            message: `Device ${device.id || "unknown"} missing required field: name`,
          });
        }
      }
    }

    // Validate required fields in scenes
    if (exportData.scenes) {
      for (const scene of exportData.scenes) {
        if (!scene.name) {
          errors.push({
            type: "data",
            field: "scenes",
            message: `Scene ${scene.id || "unknown"} missing required field: name`,
          });
        }
      }
    }

    // Validate required fields in rooms
    if (exportData.rooms) {
      for (const room of exportData.rooms) {
        if (!room.name) {
          errors.push({
            type: "data",
            field: "rooms",
            message: `Room ${room.id || "unknown"} missing required field: name`,
          });
        }
      }
    }
  }

  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split(".").map((p) => parseInt(p, 10));
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0,
    };
  }
}

// Singleton instance
let importValidator: ImportValidator | null = null;

export function getImportValidator(): ImportValidator {
  if (!importValidator) {
    importValidator = new ImportValidator();
  }
  return importValidator;
}
