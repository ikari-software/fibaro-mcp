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
 * Dangerous sequences for Lua display names embedded in block comments.
 * Blocks: -- (line comment), ]] [[ (long string/comment delimiters), \ (escape).
 * Single hyphens and brackets are allowed.
 */
const DANGEROUS_DISPLAY_PATTERNS = /--|\\|\]\]|\[\[/;

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
    if (Number.isNaN(value)) return "(0/0)";
    if (value === Infinity) return "math.huge";
    if (value === -Infinity) return "(-math.huge)";
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
/**
 * Validate that a value is a finite number before interpolating into Lua.
 * Prevents injection via non-numeric values in numeric positions.
 */
export function validateNumber(value: any, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `Invalid ${label}: expected a finite number, got ${typeof value === "number" ? String(value) : typeof value}`
    );
  }
  return value;
}

export function isValidDisplayName(value: string): boolean {
  return !!value && value.length <= 200 && !DANGEROUS_DISPLAY_PATTERNS.test(value);
}

export function validateDisplayName(value: string, label: string): void {
  if (!isValidDisplayName(value)) {
    throw new Error(
      `Invalid ${label}: "${value}" contains sequences that could break Lua code generation (-- \\\\ ]] [[)`
    );
  }
}
