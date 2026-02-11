/**
 * Fibaro MCP Server - Lua Code Sanitization Utilities
 *
 * Prevents Lua injection when generating code from user-provided data.
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

/**
 * Pattern for safe Lua identifiers and Fibaro field names.
 * Allows alphanumeric, underscores, dots (for nested properties), and hyphens.
 */
const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_.:-]*$/;

/**
 * Pattern for safe display names (automation names, messages).
 * More permissive: allows spaces, accented characters, common punctuation.
 * Blocks Lua comment/string delimiters: ]] [[ -- \
 */
const SAFE_DISPLAY_NAME = /^[^\\[\]\-]{1,200}$/;

/**
 * Escape a string value for embedding in a Lua double-quoted string.
 * Escapes backslashes FIRST, then quotes, then control characters.
 */
export function escapeLuaString(value: string): string {
  return value
    .replace(/\\/g, "\\\\")   // Must be first: \ → \\
    .replace(/"/g, '\\"')      // " → \"
    .replace(/\n/g, "\\n")    // newline → \n
    .replace(/\r/g, "\\r")    // carriage return → \r
    .replace(/\0/g, "\\0");   // null byte → \0
}

/**
 * Format any value as a Lua literal.
 * Strings are escaped and quoted; numbers/booleans become Lua literals;
 * objects are JSON-stringified and escaped.
 */
export function formatLuaValue(value: any): string {
  if (typeof value === "string") {
    return `"${escapeLuaString(value)}"`;
  } else if (typeof value === "boolean") {
    return value ? "true" : "false";
  } else if (typeof value === "number") {
    return String(value);
  } else if (value === null || value === undefined) {
    return "nil";
  } else {
    // Objects/arrays - convert to escaped JSON string
    return `"${escapeLuaString(JSON.stringify(value))}"`;
  }
}

/**
 * Validate that a string is a safe Lua identifier/field name.
 * Throws if the value could break out of the intended code position.
 */
export function validateIdentifier(value: string, label: string): void {
  if (!SAFE_IDENTIFIER.test(value)) {
    throw new Error(
      `Invalid ${label}: "${value}" contains characters not allowed in Lua identifiers`
    );
  }
}

/**
 * Validate that a string is safe for use in Lua comments/debug strings.
 * More permissive than identifiers but still blocks injection vectors.
 */
export function validateDisplayName(value: string, label: string): void {
  if (!SAFE_DISPLAY_NAME.test(value)) {
    throw new Error(
      `Invalid ${label}: "${value}" contains characters that could break Lua code generation`
    );
  }
}
