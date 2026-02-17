/**
 * Fibaro MCP Server - Scene Template Manager
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../logger.js";
import { formatLuaValue } from "../automation/lua-sanitizer.js";
import { validateTemplateSchema, validateTemplateParameters } from "./template-validator.js";
import type {
  SceneTemplate,
  TemplateCategory,
  TemplateLibrary,
  TemplateInstantiationParams,
} from "./template-types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class TemplateManager {
  private templates: Map<string, SceneTemplate> = new Map();
  private loaded: boolean = false;

  constructor() {
    // Templates will be loaded lazily on first access
  }

  /**
   * Get the data directory path (supports both dev and dist)
   */
  private getDataPath(): string {
    return join(__dirname, "../../data/scene-templates");
  }

  /**
   * Load all templates from the data directory
   */
  loadTemplates(): void {
    if (this.loaded) {
      return;
    }

    const customPath = process.env.FIBARO_TEMPLATES_PATH;
    const dataPath = customPath || this.getDataPath();

    logger.info(`Loading templates from: ${dataPath}`);

    try {
      this.loadTemplatesFromDirectory(dataPath);
      this.loaded = true;
      logger.info(`Loaded ${this.templates.size} templates`);
    } catch (error) {
      logger.warn("Failed to load templates", error);
      // Don't throw - templates are optional
    }
  }

  /**
   * Recursively load templates from a directory
   */
  private loadTemplatesFromDirectory(dirPath: string): void {
    try {
      const entries = readdirSync(dirPath);

      for (const entry of entries) {
        const fullPath = join(dirPath, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          this.loadTemplatesFromDirectory(fullPath);
        } else if (entry.endsWith(".json")) {
          try {
            const content = readFileSync(fullPath, "utf-8");
            const template = JSON.parse(content) as SceneTemplate;

            // Validate template schema
            const validation = validateTemplateSchema(template);
            if (!validation.valid) {
              logger.warn(
                `Invalid template schema in ${entry}: ${validation.errors.map((e) => e.message).join(", ")}`,
              );
              continue;
            }

            this.templates.set(template.id, template);
            logger.debug(`Loaded template: ${template.id} (${template.name})`);
          } catch (error) {
            logger.warn(`Failed to load template from ${entry}`, error);
          }
        }
      }
    } catch (error) {
      logger.warn(`Failed to read directory ${dirPath}`, error);
    }
  }

  /**
   * Get all templates
   */
  getAll(): SceneTemplate[] {
    this.loadTemplates();
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getByCategory(category: TemplateCategory): SceneTemplate[] {
    this.loadTemplates();
    return this.getAll().filter((t) => t.category === category);
  }

  /**
   * Get a single template by ID
   */
  getById(id: string): SceneTemplate | undefined {
    this.loadTemplates();
    return this.templates.get(id);
  }

  /**
   * Get template library metadata
   */
  getLibrary(): TemplateLibrary {
    this.loadTemplates();
    const templates = this.getAll();
    const categories: Record<TemplateCategory, number> = {
      lighting: 0,
      security: 0,
      energy: 0,
      climate: 0,
      custom: 0,
    };

    for (const template of templates) {
      categories[template.category]++;
    }

    return {
      templates,
      categories,
      total: templates.length,
    };
  }

  /**
   * Instantiate a template with parameters
   */
  instantiate(params: TemplateInstantiationParams): {
    lua: string;
    validation: { valid: boolean; errors: any[] };
  } {
    this.loadTemplates();

    const template = this.templates.get(params.template_id);
    if (!template) {
      return {
        lua: "",
        validation: {
          valid: false,
          errors: [{ parameter: "template_id", message: `Template '${params.template_id}' not found` }],
        },
      };
    }

    // Validate parameters
    const validation = validateTemplateParameters(template, params.parameters);
    if (!validation.valid) {
      return { lua: "", validation };
    }

    // Merge with defaults
    const fullParams: Record<string, any> = {};
    for (const param of template.parameters) {
      if (param.name in params.parameters) {
        fullParams[param.name] = params.parameters[param.name];
      } else if (param.default !== undefined) {
        fullParams[param.name] = param.default;
      }
    }

    // Replace placeholders in lua_template
    let lua = template.lua_template;
    for (const [key, value] of Object.entries(fullParams)) {
      const placeholder = `{{${key}}}`;
      const replacement = formatLuaValue(value);
      // Use global regex replace for compatibility
      lua = lua.replace(new RegExp(placeholder.replace(/[{}]/g, "\\$&"), "g"), replacement);
    }

    return { lua, validation: { valid: true, errors: [] } };
  }

  /**
   * Add a custom template
   */
  addTemplate(template: SceneTemplate): { success: boolean; error?: string } {
    // Validate template schema
    const validation = validateTemplateSchema(template);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.map((e) => e.message).join(", "),
      };
    }

    // Check for duplicate ID
    if (this.templates.has(template.id)) {
      return {
        success: false,
        error: `Template with ID '${template.id}' already exists`,
      };
    }

    this.templates.set(template.id, template);
    logger.info(`Added custom template: ${template.id} (${template.name})`);

    return { success: true };
  }

  /**
   * Remove a custom template
   */
  removeTemplate(templateId: string): { success: boolean; error?: string } {
    if (!this.templates.has(templateId)) {
      return {
        success: false,
        error: `Template '${templateId}' not found`,
      };
    }

    this.templates.delete(templateId);
    logger.info(`Removed template: ${templateId}`);

    return { success: true };
  }
}

// Singleton instance
let templateManager: TemplateManager | null = null;

export function getTemplateManager(): TemplateManager {
  if (!templateManager) {
    templateManager = new TemplateManager();
  }
  return templateManager;
}
