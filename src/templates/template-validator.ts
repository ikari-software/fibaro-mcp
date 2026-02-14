/**
 * Fibaro MCP Server - Scene Template Validator
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import {
  type SceneTemplate,
  type TemplateParameter,
  type TemplateValidationError,
  type TemplateValidationResult,
} from "./template-types.js";

/**
 * Validates a scene template schema
 */
export function validateTemplateSchema(template: any): TemplateValidationResult {
  const errors: TemplateValidationError[] = [];

  // Check required fields
  if (!template.id || typeof template.id !== "string") {
    errors.push({
      parameter: "id",
      message: "Template id is required and must be a string",
      code: "invalid_schema",
    });
  }

  if (!template.name || typeof template.name !== "string") {
    errors.push({
      parameter: "name",
      message: "Template name is required and must be a string",
      code: "invalid_schema",
    });
  }

  if (!template.description || typeof template.description !== "string") {
    errors.push({
      parameter: "description",
      message: "Template description is required and must be a string",
      code: "invalid_schema",
    });
  }

  if (!template.category || typeof template.category !== "string") {
    errors.push({
      parameter: "category",
      message: "Template category is required and must be a string",
      code: "invalid_schema",
    });
  } else {
    const validCategories = ["lighting", "security", "energy", "climate", "custom"];
    if (!validCategories.includes(template.category)) {
      errors.push({
        parameter: "category",
        message: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
        code: "invalid_schema",
      });
    }
  }

  if (!template.version || typeof template.version !== "string") {
    errors.push({
      parameter: "version",
      message: "Template version is required and must be a string",
      code: "invalid_schema",
    });
  }

  if (!Array.isArray(template.parameters)) {
    errors.push({
      parameter: "parameters",
      message: "Template parameters must be an array",
      code: "invalid_schema",
    });
  }

  if (!template.lua_template || typeof template.lua_template !== "string") {
    errors.push({
      parameter: "lua_template",
      message: "Template lua_template is required and must be a string",
      code: "invalid_schema",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates template parameters against provided values
 */
export function validateTemplateParameters(
  template: SceneTemplate,
  parameters: Record<string, any>,
): TemplateValidationResult {
  const errors: TemplateValidationError[] = [];

  // Check required parameters
  for (const param of template.parameters) {
    if (param.required && !(param.name in parameters)) {
      errors.push({
        parameter: param.name,
        message: `Required parameter '${param.name}' is missing`,
        code: "missing_required",
      });
      continue;
    }

    // If parameter is provided, validate it
    if (param.name in parameters) {
      const value = parameters[param.name];
      const validationResult = validateParameter(param, value);
      if (!validationResult.valid) {
        errors.push(...validationResult.errors);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a single parameter value
 */
function validateParameter(param: TemplateParameter, value: any): TemplateValidationResult {
  const errors: TemplateValidationError[] = [];

  // Type validation
  switch (param.type) {
    case "device_id":
    case "number":
      if (typeof value !== "number") {
        errors.push({
          parameter: param.name,
          message: `Parameter '${param.name}' must be a number`,
          code: "invalid_type",
        });
      } else if (param.validation) {
        if (param.validation.min !== undefined && value < param.validation.min) {
          errors.push({
            parameter: param.name,
            message: `Parameter '${param.name}' must be at least ${param.validation.min}`,
            code: "validation_failed",
          });
        }
        if (param.validation.max !== undefined && value > param.validation.max) {
          errors.push({
            parameter: param.name,
            message: `Parameter '${param.name}' must be at most ${param.validation.max}`,
            code: "validation_failed",
          });
        }
      }
      break;

    case "string":
    case "time":
      if (typeof value !== "string") {
        errors.push({
          parameter: param.name,
          message: `Parameter '${param.name}' must be a string`,
          code: "invalid_type",
        });
      } else if (param.validation?.pattern) {
        const regex = new RegExp(param.validation.pattern);
        if (!regex.test(value)) {
          errors.push({
            parameter: param.name,
            message: `Parameter '${param.name}' does not match required pattern`,
            code: "validation_failed",
          });
        }
      }

      // Validate time format (HH:MM)
      if (param.type === "time" && typeof value === "string") {
        const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRegex.test(value)) {
          errors.push({
            parameter: param.name,
            message: `Parameter '${param.name}' must be in HH:MM format (e.g., 07:30)`,
            code: "validation_failed",
          });
        }
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        errors.push({
          parameter: param.name,
          message: `Parameter '${param.name}' must be a boolean`,
          code: "invalid_type",
        });
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
