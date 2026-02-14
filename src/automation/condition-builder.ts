/**
 * Fibaro MCP Server - Condition Builder
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import {
  escapeLuaString,
  formatLuaValue,
  validateIdentifier,
  validateNumber,
} from "./lua-sanitizer.js";
import type { Condition, ConditionGroup, ValidationResult } from "./automation-types.js";

export class ConditionBuilder {
  /** Map JS-style operators to safe Lua equivalents */
  private toLuaOperator(op: string): string {
    const OPERATOR_MAP: Record<string, string> = {
      "==": "==",
      "!=": "~=",
      ">": ">",
      "<": "<",
      ">=": ">=",
      "<=": "<=",
    };
    const luaOp = OPERATOR_MAP[op];
    if (!luaOp) {
      throw new Error(`Invalid operator: ${op}`);
    }
    return luaOp;
  }

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

        // Validate property name to prevent Lua injection
        validateIdentifier(condition.property, "device property");
        validateNumber(condition.deviceId, "deviceId");

        // Use fibaro.getValue() for device properties
        const getValue = `fibaro.getValue(${condition.deviceId}, "${escapeLuaString(condition.property)}")`;
        const value = formatLuaValue(condition.value);

        return `${getValue} ${this.toLuaOperator(condition.operator)} ${value}`;
      }

      case "variable": {
        if (!condition.variableName) {
          throw new Error("variable condition requires variableName");
        }

        // Validate variable name to prevent Lua injection
        validateIdentifier(condition.variableName, "variable name");

        // Use fibaro.getGlobalVariable() for global variables
        const getValue = `fibaro.getGlobalVariable("${escapeLuaString(condition.variableName)}")`;
        const value = formatLuaValue(condition.value);

        // Global variables are strings, so handle type conversion
        const luaOp = this.toLuaOperator(condition.operator);
        if (typeof condition.value === "number") {
          return `tonumber(${getValue}) ${luaOp} ${value}`;
        } else if (typeof condition.value === "boolean") {
          return `(${getValue} ${luaOp} "${condition.value ? "true" : "false"}")`;
        } else {
          return `${getValue} ${luaOp} ${value}`;
        }
      }

      case "time": {
        // Time-based conditions using os.time() and os.date()
        const value = formatLuaValue(condition.value);
        return `os.time() ${this.toLuaOperator(condition.operator)} ${value}`;
      }

      case "sun_position": {
        if (!condition.sunPosition) {
          throw new Error("sun_position condition requires sunPosition field");
        }

        // Use fibaro.getValue(1, "sunriseHour") and fibaro.getValue(1, "sunsetHour")
        const sunProperty =
          condition.sunPosition === "sunrise" ? "sunriseHour" : "sunsetHour";
        const offset = condition.timeOffset !== undefined ? validateNumber(condition.timeOffset, "timeOffset") : 0;

        // Parse "HH:MM" string from sunriseHour/sunsetHour into total minutes
        const sunTime = `(function() local h,m = string.match(fibaro.getValue(1, "${sunProperty}"), "(%d+):(%d+)") return tonumber(h)*60 + tonumber(m) ${offset >= 0 ? "+" : ""} ${offset} end)()`;
        const currentTime = `(os.date("*t").hour * 60 + os.date("*t").min)`;

        return `${currentTime} ${this.toLuaOperator(condition.operator)} ${sunTime}`;
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
        } else if (typeof condition.value !== "number") {
          errors.push("time condition value must be a number (Unix timestamp)");
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
    return obj && (obj.operator === "AND" || obj.operator === "OR") && Array.isArray(obj.conditions);
  }

}

// Singleton instance
let conditionBuilder: ConditionBuilder | null = null;

export function getConditionBuilder(): ConditionBuilder {
  if (!conditionBuilder) {
    conditionBuilder = new ConditionBuilder();
  }
  return conditionBuilder;
}
