/**
 * Fibaro MCP Server - Lua Code Validator
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import * as luaparse from "luaparse";
import { logger } from "./logger.js";

export interface LuaValidationResult {
  valid: boolean;
  errors: LuaValidationError[];
}

export interface LuaValidationError {
  line: number;
  column: number;
  message: string;
  index?: number;
}

/**
 * Validates Lua code syntax using the luaparse library.
 *
 * @param code - The Lua code to validate
 * @returns Validation result with any syntax errors found
 *
 * @example
 * ```typescript
 * const result = validateLuaCode('fibaro.call(123, "turnOn")');
 * if (!result.valid) {
 *   console.error('Lua syntax errors:', result.errors);
 * }
 * ```
 */
export function validateLuaCode(code: string): LuaValidationResult {
  if (!code || code.trim() === "") {
    return {
      valid: true,
      errors: [],
    };
  }

  try {
    // Parse the Lua code with luaparse
    // This will throw an error if the syntax is invalid
    luaparse.parse(code, {
      // Allow Lua 5.2 features (Fibaro uses Lua 5.2)
      luaVersion: "5.2",
      // Don't throw on certain errors - we'll collect them
      wait: false,
      // Include location information in the AST
      locations: true,
      // Include range information
      ranges: true,
    });

    logger.debug("Lua code validation passed");
    return {
      valid: true,
      errors: [],
    };
  } catch (error: unknown) {
    // luaparse throws an error object with line, column, and message
    const luaError = error as {
      line?: number;
      column?: number;
      index?: number;
      message?: string;
    };

    const validationError: LuaValidationError = {
      line: luaError.line || 1,
      column: luaError.column || 0,
      message: luaError.message || String(error),
      index: luaError.index,
    };

    logger.debug("Lua code validation failed", validationError);

    return {
      valid: false,
      errors: [validationError],
    };
  }
}

/**
 * Formats a validation result into a human-readable error message.
 *
 * @param result - The validation result from validateLuaCode
 * @param codeSnippet - Optional code snippet to include in the message
 * @returns Formatted error message, or null if no errors
 */
export function formatValidationErrors(
  result: LuaValidationResult,
  codeSnippet?: string,
): string | null {
  if (result.valid || result.errors.length === 0) {
    return null;
  }

  const messages: string[] = ["Lua syntax validation failed:"];

  for (const error of result.errors) {
    messages.push(`  Line ${error.line}, Column ${error.column}: ${error.message}`);

    if (codeSnippet && error.line) {
      const lines = codeSnippet.split("\n");
      const errorLine = lines[error.line - 1];
      if (errorLine) {
        messages.push(`    ${errorLine}`);
        if (error.column > 0) {
          messages.push(`    ${" ".repeat(error.column - 1)}^`);
        }
      }
    }
  }

  messages.push("");
  messages.push("Common Lua syntax issues:");
  messages.push('  - Missing "end" keyword for if/for/while/function blocks');
  messages.push("  - Mismatched parentheses or brackets");
  messages.push("  - Invalid string escaping");
  messages.push('  - Using undefined variables (note: Fibaro API globals like "fibaro" are valid)');

  return messages.join("\n");
}

/**
 * Validates Lua code and throws an error if validation fails.
 * Useful for pre-upload validation in API methods.
 *
 * @param code - The Lua code to validate
 * @param context - Context string for error message (e.g., 'scene update', 'Quick App code')
 * @throws {Error} If validation fails
 */
export function validateLuaCodeOrThrow(code: string, context: string = "Lua code"): void {
  const result = validateLuaCode(code);
  if (!result.valid) {
    const errorMessage = formatValidationErrors(result, code);
    throw new Error(`${context} validation failed:\n${errorMessage}`);
  }
}
