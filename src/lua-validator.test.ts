/**
 * Fibaro MCP Server - Lua Validator Tests
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { describe, it, expect } from "vitest";
import {
  validateLuaCode,
  formatValidationErrors,
  validateLuaCodeOrThrow,
} from "./lua-validator.js";

describe("Lua Validator", () => {
  describe("validateLuaCode", () => {
    it("should validate correct Lua code", () => {
      const code = 'fibaro.call(123, "turnOn")';
      const result = validateLuaCode(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate empty code as valid", () => {
      const result = validateLuaCode("");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate whitespace-only code as valid", () => {
      const result = validateLuaCode("   \n\t  ");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate complex Lua code", () => {
      const code = `
        local deviceId = 123
        if fibaro.getValue(deviceId, "value") > 50 then
          fibaro.call(deviceId, "turnOn")
        else
          fibaro.call(deviceId, "turnOff")
        end
      `;
      const result = validateLuaCode(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate Lua functions", () => {
      const code = `
        function turnOnDevice(deviceId)
          fibaro.call(deviceId, "turnOn")
          return true
        end

        turnOnDevice(123)
      `;
      const result = validateLuaCode(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate loops", () => {
      const code = `
        for i = 1, 10 do
          print(i)
        end

        local x = 0
        while x < 5 do
          x = x + 1
        end
      `;
      const result = validateLuaCode(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing "end" keyword', () => {
      const code = `
        if true then
          print("missing end")
      `;
      const result = validateLuaCode(code);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("end");
    });

    it("should detect unclosed string", () => {
      const code = 'local str = "unclosed string';
      const result = validateLuaCode(code);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it("should detect invalid syntax", () => {
      const code = "local x = ===";
      const result = validateLuaCode(code);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it("should detect mismatched parentheses", () => {
      const code = 'fibaro.call(123, "turnOn"';
      const result = validateLuaCode(code);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it("should provide line and column information", () => {
      const code = `
        local x = 1
        local y = ===
      `;
      const result = validateLuaCode(code);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].line).toBeGreaterThan(0);
      expect(result.errors[0].column).toBeGreaterThan(0);
    });

    it("should validate table constructors", () => {
      const code = `
        local t = {
          key1 = "value1",
          key2 = 123,
          nested = {
            a = 1,
            b = 2
          }
        }
      `;
      const result = validateLuaCode(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate string concatenation", () => {
      const code = 'local msg = "Hello " .. "World"';
      const result = validateLuaCode(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate comments", () => {
      const code = `
        -- This is a comment
        local x = 1 -- Inline comment
        --[[
          Multi-line comment
          with multiple lines
        ]]
        local y = 2
      `;
      const result = validateLuaCode(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should validate logical operators", () => {
      const code = `
        if x > 5 and y < 10 or z == 0 then
          return true
        end
      `;
      const result = validateLuaCode(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("formatValidationErrors", () => {
    it("should return null for valid code", () => {
      const result = { valid: true, errors: [] };
      const formatted = formatValidationErrors(result);
      expect(formatted).toBeNull();
    });

    it("should format errors with line and column", () => {
      const result = {
        valid: false,
        errors: [{ line: 2, column: 5, message: "unexpected symbol" }],
      };
      const formatted = formatValidationErrors(result);
      expect(formatted).toContain("Line 2, Column 5");
      expect(formatted).toContain("unexpected symbol");
    });

    it("should include code snippet when provided", () => {
      const code = "local x = 1\nlocal y = ===\nlocal z = 3";
      const result = {
        valid: false,
        errors: [{ line: 2, column: 11, message: "unexpected symbol" }],
      };
      const formatted = formatValidationErrors(result, code);
      expect(formatted).toContain("local y = ===");
    });

    it("should include helpful tips", () => {
      const result = {
        valid: false,
        errors: [{ line: 1, column: 1, message: "error" }],
      };
      const formatted = formatValidationErrors(result);
      expect(formatted).toContain("Common Lua syntax issues");
      expect(formatted).toContain('Missing "end" keyword');
    });

    it("should handle multiple errors", () => {
      const result = {
        valid: false,
        errors: [
          { line: 2, column: 5, message: "error 1" },
          { line: 3, column: 10, message: "error 2" },
        ],
      };
      const formatted = formatValidationErrors(result);
      expect(formatted).toContain("Line 2, Column 5");
      expect(formatted).toContain("Line 3, Column 10");
    });
  });

  describe("validateLuaCodeOrThrow", () => {
    it("should not throw for valid code", () => {
      expect(() => {
        validateLuaCodeOrThrow('fibaro.call(123, "turnOn")');
      }).not.toThrow();
    });

    it("should throw for invalid code", () => {
      expect(() => {
        validateLuaCodeOrThrow("local x = ===");
      }).toThrow();
    });

    it("should include context in error message", () => {
      expect(() => {
        validateLuaCodeOrThrow("local x = ===", "Test context");
      }).toThrow("Test context");
    });

    it("should include validation details in error", () => {
      try {
        validateLuaCodeOrThrow("local x = ===", "Test");
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain("validation failed");
          expect(error.message).toContain("Line");
        }
      }
    });

    it("should use default context if not provided", () => {
      expect(() => {
        validateLuaCodeOrThrow("local x = ===");
      }).toThrow("Lua code");
    });
  });

  describe("Real-world Fibaro examples", () => {
    it("should validate typical Fibaro scene code", () => {
      const code = `
        local deviceId = 123
        fibaro.call(deviceId, "turnOn")
        fibaro.sleep(1000)
        fibaro.call(deviceId, "turnOff")
      `;
      const result = validateLuaCode(code);
      expect(result.valid).toBe(true);
    });

    it("should validate Fibaro Quick App structure", () => {
      const code = `
        function QuickApp:onInit()
          self:updateProperty("log", "Quick App initialized")
        end

        function QuickApp:turnOn()
          fibaro.call(123, "turnOn")
        end
      `;
      const result = validateLuaCode(code);
      expect(result.valid).toBe(true);
    });

    it("should validate Fibaro API calls", () => {
      const code = `
        fibaro.call(123, "turnOn")
        fibaro.getValue(456, "value")
        fibaro.setGlobalVariable("test", "value")
        fibaro.debug("Test", "Debug message")
      `;
      const result = validateLuaCode(code);
      expect(result.valid).toBe(true);
    });

    it("should validate scene with conditions", () => {
      const code = `
        local temperature = fibaro.getValue(123, "value")

        if temperature > 25 then
          fibaro.call(456, "turnOn")  -- Turn on fan
        elseif temperature < 20 then
          fibaro.call(789, "turnOn")  -- Turn on heater
        else
          fibaro.call(456, "turnOff")
          fibaro.call(789, "turnOff")
        end
      `;
      const result = validateLuaCode(code);
      expect(result.valid).toBe(true);
    });
  });
});
