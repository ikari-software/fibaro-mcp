/**
 * Fibaro MCP Server - Export Formatter
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { logger } from "../logger.js";
import type { FibaroExport, ExportFormat } from "./backup-types.js";

export class ExportFormatter {
  /**
   * Format export data to string
   */
  async format(exportData: FibaroExport, format: ExportFormat): Promise<string> {
    logger.debug(`Formatting export as ${format}`);

    switch (format) {
      case "json":
        return this.formatJSON(exportData);
      case "yaml":
        return this.formatYAML(exportData);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Parse export data from string
   */
  async parse(data: string, format: ExportFormat): Promise<FibaroExport> {
    logger.debug(`Parsing export from ${format}`);

    try {
      switch (format) {
        case "json":
          return this.parseJSON(data);
        case "yaml":
          return this.parseYAML(data);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error(`Failed to parse ${format} export`, error);
      throw new Error(
        `Invalid ${format} format: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Detect format from string content
   */
  detectFormat(data: string): ExportFormat {
    const trimmed = data.trim();

    // Check for JSON
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        JSON.parse(trimmed);
        return "json";
      } catch {
        // Not valid JSON, might be YAML
      }
    }

    // Check for YAML indicators
    if (
      trimmed.includes("---") ||
      trimmed.match(/^[a-z_]+:\s/m) ||
      trimmed.includes("  - ")
    ) {
      return "yaml";
    }

    // Default to JSON
    return "json";
  }

  // Private formatting methods

  private formatJSON(exportData: FibaroExport): string {
    return JSON.stringify(exportData, null, 2);
  }

  private async formatYAML(exportData: FibaroExport): Promise<string> {
    try {
      const yaml = await import("js-yaml");
      return yaml.default.dump(exportData, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });
    } catch (error) {
      logger.warn(
        "js-yaml not available, YAML export disabled. Install with: npm install js-yaml",
        error
      );
      throw new Error(
        "YAML format not available. Please install js-yaml: npm install js-yaml"
      );
    }
  }

  private parseJSON(data: string): FibaroExport {
    return JSON.parse(data);
  }

  private async parseYAML(data: string): Promise<FibaroExport> {
    try {
      const yaml = await import("js-yaml");
      return yaml.default.load(data) as FibaroExport;
    } catch (error) {
      logger.warn(
        "js-yaml not available, YAML import disabled. Install with: npm install js-yaml",
        error
      );
      throw new Error(
        "YAML format not available. Please install js-yaml: npm install js-yaml"
      );
    }
  }
}

// Singleton instance
let exportFormatter: ExportFormatter | null = null;

export function getExportFormatter(): ExportFormatter {
  if (!exportFormatter) {
    exportFormatter = new ExportFormatter();
  }
  return exportFormatter;
}
