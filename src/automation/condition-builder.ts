/**
 * Fibaro MCP Server - Condition Builder
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { logger } from "../logger.js";
import type { Condition, ConditionGroup, ValidationResult } from "./automation-types.js";

export class ConditionBuilder {
  /**
   * Build Lua code for a condition group
   */
  buildConditionGroup(group: ConditionGroup): string {
    const conditionStrings: string[] = [];

    for (const cond of group.conditions) {
      if (this.isConditionGroup(cond)) {
        // Nested group - wrap in parentheses
        conditionStrings.push(`(${this.buildConditionGroup(cond)})`);
      } else {
        conditionStrings.push(this.buildCondition(cond));
      }
    }

    const operator = group.operator === "AND" ? " and " : " or ";
    return conditionStrings.join(operator);
  }

  /**
   * Build Lua code for a single condition
   */
  buildCondition(condition: Condition): string {
    switch (condition.type) {
      case "device_state": {
        if (!condition.deviceId || !condition.property) {
          throw new Error("device_state condition requires deviceId and property");
        }

        // Use fibaro.getValue() for device properties
        const getValue = `fibaro.getValue(${condition.deviceId}, "${condition.property}")`;
        const value = this.formatValue(condition.value);

        return `${getValue} ${condition.operator} ${value}`;
      }

      case "variable": {
        if (!condition.variableName) {
          throw new Error("variable condition requires variableName");
        }

        // Use fibaro.getGlobalVariable() for global variables
        const getValue = `fibaro.getGlobalVariable("${condition.variableName}")`;
        const value = this.formatValue(condition.value);

        // Global variables are strings, so handle type conversion
        if (typeof condition.value === "number") {
          return `tonumber(${getValue}) ${condition.operator} ${value}`;
        } else if (typeof condition.value === "boolean") {
          return `(${getValue} == "${condition.value ? "true" : "false"}")`;
        } else {
          return `${getValue} ${condition.operator} ${value}`;
        }
      }

      case "time": {
        // Time-based conditions using os.time() and os.date()
        const value = this.formatValue(condition.value);
        return `os.time() ${condition.operator} ${value}`;
      }

      case "sun_position": {
        if (!condition.sunPosition) {
          throw new Error("sun_position condition requires sunPosition field");
        }

        // Use fibaro.getValue(1, "sunriseHour") and fibaro.getValue(1, "sunsetHour")
        const sunProperty =
          condition.sunPosition === "sunrise" ? "sunriseHour" : "sunsetHour";
        const offset = condition.timeOffset || 0;

        // Convert sunrise/sunset time to minutes and add offset
        const sunTime = `(fibaro.getValue(1, "${sunProperty}") * 60 ${offset >= 0 ? "+" : ""} ${offset})`;
        const currentTime = `(os.date("*t").hour * 60 + os.date("*t").min)`;

        return `${currentTime} ${condition.operator} ${sunTime}`;
      }

      case "custom": {
        if (!condition.customLua) {
          throw new Error("custom condition requires customLua field");
        }
        return condition.customLua;
      }

      default:
        throw new Error(`Unknown condition type: ${(condition as any).type}`);
    }
  }

  /**
   * Validate a condition group
   */
  validateConditionGroup(group: ConditionGroup): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!group.operator || (group.operator !== "AND" && group.operator !== "OR")) {
      errors.push("ConditionGroup must have operator 'AND' or 'OR'");
    }

    if (!group.conditions || group.conditions.length === 0) {
      errors.push("ConditionGroup must have at least one condition");
    }

    for (const cond of group.conditions || []) {
      if (this.isConditionGroup(cond)) {
        const result = this.validateConditionGroup(cond);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      } else {
        const result = this.validateCondition(cond);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single condition
   */
  validateCondition(condition: Condition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const validOperators = ["==", "!=", ">", "<", ">=", "<="];
    if (!validOperators.includes(condition.operator)) {
      errors.push(`Invalid operator: ${condition.operator}`);
    }

    switch (condition.type) {
      case "device_state": {
        if (!condition.deviceId) {
          errors.push("device_state condition requires deviceId");
        }
        if (!condition.property) {
          errors.push("device_state condition requires property");
        }
        if (condition.value === undefined) {
          errors.push("device_state condition requires value");
        }
        break;
      }

      case "variable": {
        if (!condition.variableName) {
          errors.push("variable condition requires variableName");
        }
        if (condition.value === undefined) {
          errors.push("variable condition requires value");
        }
        break;
      }

      case "time": {
        if (condition.value === undefined) {
          errors.push("time condition requires value (timestamp)");
        }
        if (typeof condition.value !== "number") {
          warnings.push("time condition value should be a number (Unix timestamp)");
        }
        break;
      }

      case "sun_position": {
        if (!condition.sunPosition) {
          errors.push("sun_position condition requires sunPosition field");
        }
        if (
          condition.sunPosition &&
          condition.sunPosition !== "sunrise" &&
          condition.sunPosition !== "sunset"
        ) {
          errors.push('sunPosition must be "sunrise" or "sunset"');
        }
        break;
      }

      case "custom": {
        if (!condition.customLua) {
          errors.push("custom condition requires customLua field");
        }
        break;
      }

      default:
        errors.push(`Unknown condition type: ${(condition as any).type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Private helper methods

  private isConditionGroup(obj: any): obj is ConditionGroup {
    return obj && obj.operator && Array.isArray(obj.conditions);
  }

  private formatValue(value: any): string {
    if (typeof value === "string") {
      return `"${value.replace(/"/g, '\\"')}"`;
    } else if (typeof value === "boolean") {
      return value ? "true" : "false";
    } else if (typeof value === "number") {
      return String(value);
    } else if (value === null || value === undefined) {
      return "nil";
    } else {
      // Objects/arrays - convert to JSON string
      return `"${JSON.stringify(value).replace(/"/g, '\\"')}"`;
    }
  }
}

export function getConditionBuilder(): ConditionBuilder {
  return new ConditionBuilder();
}
