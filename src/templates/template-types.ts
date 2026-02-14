/**
 * Fibaro MCP Server - Scene Template Types
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

/**
 * Scene template categories
 */
export type TemplateCategory = "lighting" | "security" | "energy" | "climate" | "custom";

/**
 * Template parameter types
 */
export type ParameterType = "device_id" | "number" | "string" | "time" | "boolean";

/**
 * Parameter validation rules
 */
export interface ParameterValidation {
  min?: number;
  max?: number;
  pattern?: string;
}

/**
 * Template parameter definition
 */
export interface TemplateParameter {
  name: string;
  type: ParameterType;
  description: string;
  required: boolean;
  default?: any;
  validation?: ParameterValidation;
}

/**
 * Scene template definition
 */
export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  author?: string;
  version: string;
  parameters: TemplateParameter[];
  lua_template: string;
  required_devices?: string[];
  tags?: string[];
}

/**
 * Template instantiation parameters
 */
export interface TemplateInstantiationParams {
  template_id: string;
  scene_name: string;
  room_id: number;
  parameters: Record<string, any>;
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  valid: boolean;
  errors: TemplateValidationError[];
}

/**
 * Template validation error
 */
export interface TemplateValidationError {
  parameter: string;
  message: string;
  code: "missing_required" | "invalid_type" | "validation_failed" | "invalid_schema";
}

/**
 * Template library metadata
 */
export interface TemplateLibrary {
  templates: SceneTemplate[];
  categories: Record<TemplateCategory, number>;
  total: number;
}
