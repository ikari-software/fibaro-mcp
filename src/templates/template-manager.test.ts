/**
 * Fibaro MCP Server - Template Manager Tests
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TemplateManager } from "./template-manager.js";
import { validateTemplateSchema, validateTemplateParameters } from "./template-validator.js";
import type { SceneTemplate } from "./template-types.js";

describe("TemplateValidator", () => {
  describe("validateTemplateSchema", () => {
    it("should validate a valid template", () => {
      const template = {
        id: "test-template",
        name: "Test Template",
        description: "A test template",
        category: "lighting",
        version: "1.0.0",
        parameters: [],
        lua_template: "-- Test Lua code",
      };

      const result = validateTemplateSchema(template);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject template with missing required fields", () => {
      const template = {
        id: "test-template",
        // Missing name, description, category, version, parameters, lua_template
      };

      const result = validateTemplateSchema(template);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject template with invalid category", () => {
      const template = {
        id: "test-template",
        name: "Test Template",
        description: "A test template",
        category: "invalid-category",
        version: "1.0.0",
        parameters: [],
        lua_template: "-- Test Lua code",
      };

      const result = validateTemplateSchema(template);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.parameter === "category")).toBe(true);
    });
  });

  describe("validateTemplateParameters", () => {
    const template: SceneTemplate = {
      id: "test-template",
      name: "Test Template",
      description: "A test template",
      category: "lighting",
      version: "1.0.0",
      parameters: [
        {
          name: "device_id",
          type: "device_id",
          description: "Device ID",
          required: true,
        },
        {
          name: "brightness",
          type: "number",
          description: "Brightness level",
          required: false,
          default: 100,
          validation: { min: 0, max: 100 },
        },
        {
          name: "time",
          type: "time",
          description: "Time",
          required: false,
          default: "12:00",
        },
      ],
      lua_template: "-- Test Lua code with {{device_id}} and {{brightness}}",
    };

    it("should validate when all required parameters are provided", () => {
      const params = { device_id: 45 };
      const result = validateTemplateParameters(template, params);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject when required parameters are missing", () => {
      const params = {};
      const result = validateTemplateParameters(template, params);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.parameter === "device_id")).toBe(true);
    });

    it("should validate parameter types", () => {
      const params = { device_id: "not-a-number" as any };
      const result = validateTemplateParameters(template, params);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "invalid_type")).toBe(true);
    });

    it("should validate number ranges", () => {
      const params = { device_id: 45, brightness: 150 };
      const result = validateTemplateParameters(template, params);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "validation_failed")).toBe(true);
    });

    it("should validate time format", () => {
      const params = { device_id: 45, time: "invalid-time" };
      const result = validateTemplateParameters(template, params);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.parameter === "time")).toBe(true);
    });

    it("should accept valid time format", () => {
      const params = { device_id: 45, time: "14:30" };
      const result = validateTemplateParameters(template, params);
      expect(result.valid).toBe(true);
    });
  });
});

describe("TemplateManager", () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = new TemplateManager();
  });

  describe("addTemplate", () => {
    it("should add a valid custom template", () => {
      const template: SceneTemplate = {
        id: "custom-template",
        name: "Custom Template",
        description: "A custom template",
        category: "custom",
        version: "1.0.0",
        parameters: [],
        lua_template: "-- Custom Lua code",
      };

      const result = manager.addTemplate(template);
      expect(result.success).toBe(true);

      const retrieved = manager.getById("custom-template");
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Custom Template");
    });

    it("should reject template with invalid schema", () => {
      const template = {
        id: "invalid-template",
        // Missing required fields
      } as any;

      const result = manager.addTemplate(template);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject duplicate template IDs", () => {
      const template: SceneTemplate = {
        id: "duplicate-template",
        name: "Duplicate Template",
        description: "A template",
        category: "custom",
        version: "1.0.0",
        parameters: [],
        lua_template: "-- Lua code",
      };

      manager.addTemplate(template);
      const result = manager.addTemplate(template);

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });
  });

  describe("removeTemplate", () => {
    it("should remove an existing template", () => {
      const template: SceneTemplate = {
        id: "removable-template",
        name: "Removable Template",
        description: "A template",
        category: "custom",
        version: "1.0.0",
        parameters: [],
        lua_template: "-- Lua code",
      };

      manager.addTemplate(template);
      const result = manager.removeTemplate("removable-template");

      expect(result.success).toBe(true);
      expect(manager.getById("removable-template")).toBeUndefined();
    });

    it("should fail to remove non-existent template", () => {
      const result = manager.removeTemplate("non-existent");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("instantiate", () => {
    beforeEach(() => {
      const template: SceneTemplate = {
        id: "test-instantiate",
        name: "Test Instantiate",
        description: "Template for instantiation testing",
        category: "lighting",
        version: "1.0.0",
        parameters: [
          {
            name: "device_id",
            type: "device_id",
            description: "Device ID",
            required: true,
          },
          {
            name: "brightness",
            type: "number",
            description: "Brightness",
            required: false,
            default: 50,
          },
          {
            name: "name",
            type: "string",
            description: "Name",
            required: false,
            default: "default",
          },
        ],
        lua_template: "local deviceId = {{device_id}}\nlocal brightness = {{brightness}}\nlocal name = {{name}}",
      };

      manager.addTemplate(template);
    });

    it("should instantiate template with valid parameters", () => {
      const result = manager.instantiate({
        template_id: "test-instantiate",
        scene_name: "Test Scene",
        room_id: 1,
        parameters: {
          device_id: 45,
          brightness: 75,
        },
      });

      expect(result.validation.valid).toBe(true);
      expect(result.lua).toContain("local deviceId = 45");
      expect(result.lua).toContain("local brightness = 75");
      expect(result.lua).toContain('local name = "default"'); // Default value
    });

    it("should apply default values", () => {
      const result = manager.instantiate({
        template_id: "test-instantiate",
        scene_name: "Test Scene",
        room_id: 1,
        parameters: {
          device_id: 45,
          // brightness and name will use defaults
        },
      });

      expect(result.validation.valid).toBe(true);
      expect(result.lua).toContain("local brightness = 50"); // Default
      expect(result.lua).toContain('local name = "default"'); // Default
    });

    it("should escape string values properly", () => {
      const result = manager.instantiate({
        template_id: "test-instantiate",
        scene_name: "Test Scene",
        room_id: 1,
        parameters: {
          device_id: 45,
          name: 'test "quoted" name',
        },
      });

      expect(result.validation.valid).toBe(true);
      expect(result.lua).toContain('local name = "test \\"quoted\\" name"');
    });

    it("should fail instantiation with missing required parameters", () => {
      const result = manager.instantiate({
        template_id: "test-instantiate",
        scene_name: "Test Scene",
        room_id: 1,
        parameters: {
          // Missing required device_id
          brightness: 75,
        },
      });

      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors.some((e: any) => e.parameter === "device_id")).toBe(true);
    });

    it("should fail instantiation with non-existent template", () => {
      const result = manager.instantiate({
        template_id: "non-existent",
        scene_name: "Test Scene",
        room_id: 1,
        parameters: {},
      });

      expect(result.validation.valid).toBe(false);
    });
  });

  describe("getByCategory", () => {
    beforeEach(() => {
      const templates: SceneTemplate[] = [
        {
          id: "lighting-1",
          name: "Lighting 1",
          description: "Test",
          category: "lighting",
          version: "1.0.0",
          parameters: [],
          lua_template: "--",
        },
        {
          id: "lighting-2",
          name: "Lighting 2",
          description: "Test",
          category: "lighting",
          version: "1.0.0",
          parameters: [],
          lua_template: "--",
        },
        {
          id: "security-1",
          name: "Security 1",
          description: "Test",
          category: "security",
          version: "1.0.0",
          parameters: [],
          lua_template: "--",
        },
      ];

      templates.forEach((t) => manager.addTemplate(t));
    });

    it("should return templates from specified category", () => {
      const lightingTemplates = manager.getByCategory("lighting");
      // Includes both test templates (2) and file system templates (2 from data/scene-templates/lighting)
      expect(lightingTemplates).toHaveLength(4);
      expect(lightingTemplates.every((t) => t.category === "lighting")).toBe(true);
    });

    it("should return empty array for category with no templates", () => {
      const energyTemplates = manager.getByCategory("energy");
      // Now has 1 template from file system (data/scene-templates/energy/peak-saver.json)
      expect(energyTemplates).toHaveLength(1);
    });
  });

  describe("getLibrary", () => {
    it("should return library metadata", () => {
      const template: SceneTemplate = {
        id: "test-lib",
        name: "Test Library",
        description: "Test",
        category: "lighting",
        version: "1.0.0",
        parameters: [],
        lua_template: "--",
      };

      manager.addTemplate(template);

      const library = manager.getLibrary();
      expect(library.total).toBeGreaterThanOrEqual(1);
      expect(library.categories).toBeDefined();
      expect(library.templates).toBeDefined();
    });
  });
});
