#!/usr/bin/env node

/**
 * Fibaro MCP Server - Model Context Protocol Server for Fibaro Home Center
 *
 * @see https://github.com/ikari-software/fibaro-mcp
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { FibaroClient, FibaroConfig } from "./fibaro-client.js";
import { getResources, getTools, handleResourceRead, handleToolCall } from "./mcp-handlers.js";
import { toMcpError } from "./errors.js";
import { logger } from "./logger.js";
import { z } from "zod";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";

// Configuration schema
const ConfigSchema = z.object({
  host: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  port: z.number().optional(),
  https: z.boolean().optional(),
});

class FibaroMCPServer {
  private server: Server;
  private fibaroClient: FibaroClient | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "fibaro-mcp",
        version: "2.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private getClient(): FibaroClient {
    if (!this.fibaroClient) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Fibaro client not initialized. Configure via .env, FIBARO_CONFIG, or set FIBARO_HOST, FIBARO_USERNAME, and FIBARO_PASSWORD environment variables.",
      );
    }
    return this.fibaroClient;
  }

  private initializeClient() {
    dotenv.config();

    let fileConfig: Partial<FibaroConfig> = {};
    const configPath = process.env.FIBARO_CONFIG;
    if (configPath) {
      try {
        const raw = readFileSync(configPath, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          fileConfig = parsed as Partial<FibaroConfig>;
        }
      } catch (error) {
        logger.error("Failed to read FIBARO_CONFIG file", error);
        throw new Error("Failed to read FIBARO_CONFIG file");
      }
    }

    const config: FibaroConfig = {
      host: process.env.FIBARO_HOST || fileConfig.host || "",
      username: process.env.FIBARO_USERNAME || fileConfig.username || "",
      password: process.env.FIBARO_PASSWORD || fileConfig.password || "",
      port: process.env.FIBARO_PORT
        ? parseInt(process.env.FIBARO_PORT)
        : fileConfig.port !== undefined
          ? Number(fileConfig.port)
          : undefined,
      https:
        process.env.FIBARO_HTTPS !== undefined
          ? process.env.FIBARO_HTTPS !== "false"
          : fileConfig.https,
    };

    try {
      ConfigSchema.parse(config);
      this.fibaroClient = new FibaroClient(config);
    } catch (error) {
      logger.error("Failed to initialize Fibaro client", error);
      throw new Error(
        "Missing required configuration: provide host/username/password via .env, FIBARO_CONFIG, or environment variables (FIBARO_HOST, FIBARO_USERNAME, FIBARO_PASSWORD)",
      );
    }
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      logger.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => getTools());

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => getResources());

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const client = this.getClient();
      const uri = request.params.uri;

      try {
        return await handleResourceRead(client as any, uri);
      } catch (error) {
        throw toMcpError(error, { operation: "resource", uri });
      }
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        if (name === "first_run") {
          return await handleToolCall({} as any, name, args);
        }

        const client = this.getClient();
        return await handleToolCall(client as any, name, args);
      } catch (error) {
        throw toMcpError(error, { operation: "tool", name });
      }
    });
  }

  async run() {
    try {
      this.initializeClient();
    } catch (error) {
      logger.warn(
        "Fibaro MCP Server started without Fibaro configuration. Call the first_run tool to generate setup instructions.",
      );
    }
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info("Fibaro MCP Server running on stdio");
  }
}

export { FibaroMCPServer };

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const server = new FibaroMCPServer();
  server.run().catch((error) => logger.error("Server error", error));
}
