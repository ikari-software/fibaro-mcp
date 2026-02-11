/**
 * Fibaro MCP Server - Query Engine
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { logger } from "../logger.js";
import type { DeviceQuery } from "./bulk-types.js";

export class QueryEngine {
  /**
   * Filter devices based on query criteria
   */
  filterDevices(devices: any[], query: DeviceQuery): any[] {
    logger.debug("Filtering devices with query", { query });

    let filtered = [...devices];

    // Filter by device IDs
    if (query.device_ids && query.device_ids.length > 0) {
      filtered = filtered.filter((d) => query.device_ids!.includes(d.id));
    }

    // Filter by room IDs
    if (query.room_ids && query.room_ids.length > 0) {
      filtered = filtered.filter((d) => query.room_ids!.includes(d.roomID));
    }

    // Filter by section IDs
    if (query.section_ids && query.section_ids.length > 0) {
      filtered = filtered.filter((d) => query.section_ids!.includes(d.sectionID));
    }

    // Filter by device type
    if (query.type) {
      filtered = filtered.filter((d) => d.type === query.type);
    }

    // Filter by base type
    if (query.base_type) {
      filtered = filtered.filter((d) => d.baseType === query.base_type);
    }

    // Filter by interface
    if (query.interface) {
      filtered = filtered.filter((d) => {
        const interfaces = d.interfaces || [];
        return interfaces.includes(query.interface);
      });
    }

    // Filter by name pattern (regex)
    if (query.name_pattern) {
      const pattern = new RegExp(query.name_pattern, "i");
      filtered = filtered.filter((d) => pattern.test(d.name || ""));
    }

    // Filter by property value
    if (query.property) {
      const { name, value, operator = "==" } = query.property;
      filtered = filtered.filter((d) => {
        const propertyValue = d.properties?.[name];
        if (propertyValue === undefined) {
          return false;
        }

        return this.compareValues(propertyValue, value, operator);
      });
    }

    // Filter by enabled status
    if (query.enabled !== undefined) {
      filtered = filtered.filter((d) => d.enabled === query.enabled);
    }

    // Filter by visible status
    if (query.visible !== undefined) {
      filtered = filtered.filter((d) => d.visible === query.visible);
    }

    logger.debug(`Filtered ${filtered.length} devices from ${devices.length} total`);

    return filtered;
  }

  /**
   * Validate query parameters
   */
  validateQuery(query: DeviceQuery): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for empty query
    const hasAnyCriteria =
      query.device_ids ||
      query.room_ids ||
      query.section_ids ||
      query.type ||
      query.base_type ||
      query.interface ||
      query.name_pattern ||
      query.property ||
      query.enabled !== undefined ||
      query.visible !== undefined;

    if (!hasAnyCriteria) {
      errors.push("Query must have at least one filter criterion");
    }

    // Validate property query
    if (query.property) {
      if (!query.property.name) {
        errors.push("Property query must specify property name");
      }
      if (query.property.value === undefined) {
        errors.push("Property query must specify property value");
      }
      if (query.property.operator) {
        const validOperators = ["==", "!=", ">", "<", ">=", "<="];
        if (!validOperators.includes(query.property.operator)) {
          errors.push(`Invalid property operator: ${query.property.operator}`);
        }
      }
    }

    // Validate name pattern (regex)
    if (query.name_pattern) {
      try {
        new RegExp(query.name_pattern);
      } catch (error) {
        errors.push(`Invalid name pattern regex: ${query.name_pattern}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get query summary for logging
   */
  getQuerySummary(query: DeviceQuery): string {
    const parts: string[] = [];

    if (query.device_ids) {
      parts.push(`device_ids=[${query.device_ids.join(",")}]`);
    }
    if (query.room_ids) {
      parts.push(`room_ids=[${query.room_ids.join(",")}]`);
    }
    if (query.section_ids) {
      parts.push(`section_ids=[${query.section_ids.join(",")}]`);
    }
    if (query.type) {
      parts.push(`type=${query.type}`);
    }
    if (query.base_type) {
      parts.push(`base_type=${query.base_type}`);
    }
    if (query.interface) {
      parts.push(`interface=${query.interface}`);
    }
    if (query.name_pattern) {
      parts.push(`name~/${query.name_pattern}/`);
    }
    if (query.property) {
      const op = query.property.operator || "==";
      parts.push(`${query.property.name}${op}${query.property.value}`);
    }
    if (query.enabled !== undefined) {
      parts.push(`enabled=${query.enabled}`);
    }
    if (query.visible !== undefined) {
      parts.push(`visible=${query.visible}`);
    }

    return parts.join(", ");
  }

  // Private helper methods

  private compareValues(
    actualValue: any,
    expectedValue: any,
    operator: string
  ): boolean {
    // Coerce both sides to numbers when possible for consistent comparison
    // (Fibaro API may return "23.5" for a numeric property)
    const a = typeof actualValue === "string" && !isNaN(Number(actualValue))
      ? Number(actualValue)
      : actualValue;
    const b = typeof expectedValue === "string" && !isNaN(Number(expectedValue))
      ? Number(expectedValue)
      : expectedValue;

    switch (operator) {
      case "==":
        return a === b || String(a) === String(b);
      case "!=":
        return a !== b && String(a) !== String(b);
      case ">":
        return a > b;
      case "<":
        return a < b;
      case ">=":
        return a >= b;
      case "<=":
        return a <= b;
      default:
        return false;
    }
  }
}

// Singleton instance
let queryEngine: QueryEngine | null = null;

export function getQueryEngine(): QueryEngine {
  if (!queryEngine) {
    queryEngine = new QueryEngine();
  }
  return queryEngine;
}
