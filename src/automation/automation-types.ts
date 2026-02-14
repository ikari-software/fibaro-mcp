/**
 * Fibaro MCP Server - Automation Types
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

/**
 * Automation definition
 */
export interface Automation {
  id: string;
  name: string;
  description?: string;
  conditions: ConditionGroup;
  actions: Action[];
  schedule?: string; // Cron expression
  enabled: boolean;
}

/**
 * Condition group with logical operators
 */
export interface ConditionGroup {
  operator: "AND" | "OR";
  conditions: Array<Condition | ConditionGroup>;
}

/**
 * Individual condition
 */
export interface Condition {
  type: "device_state" | "time" | "variable" | "sun_position" | "custom";
  deviceId?: number;
  property?: string;
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=";
  value: any;
  variableName?: string;
  sunPosition?: "sunrise" | "sunset";
  timeOffset?: number; // Minutes before/after
  customLua?: string;
}

/**
 * Action to execute
 */
export interface Action {
  type: "device_action" | "scene" | "delay" | "variable_set" | "notification" | "custom";
  deviceId?: number;
  sceneId?: number;
  action?: string;
  args?: any[];
  delay?: number; // Milliseconds
  variableName?: string;
  value?: any;
  message?: string;
  customLua?: string;
}

/**
 * Generated automation result
 */
export interface AutomationResult {
  automation: Automation;
  luaCode: string;
  sceneId?: number;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
