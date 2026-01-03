#!/usr/bin/env node

/**
 * Fibaro MCP Server - Model Context Protocol Server for Fibaro Home Center
 * 
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { FibaroClient, FibaroConfig } from './fibaro-client.js';
import { getResources, getTools, handleResourceRead, handleToolCall } from './mcp-handlers.js';
import { toMcpError } from './errors.js';
import { z } from 'zod';

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
        name: 'fibaro-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private getClient(): FibaroClient {
    if (!this.fibaroClient) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Fibaro client not initialized. Please set FIBARO_HOST, FIBARO_USERNAME, and FIBARO_PASSWORD environment variables.'
      );
    }
    return this.fibaroClient;
  }

  private initializeClient() {
    const config: FibaroConfig = {
      host: process.env.FIBARO_HOST || '',
      username: process.env.FIBARO_USERNAME || '',
      password: process.env.FIBARO_PASSWORD || '',
      port: process.env.FIBARO_PORT ? parseInt(process.env.FIBARO_PORT) : undefined,
      https: process.env.FIBARO_HTTPS !== 'false',
    };

    try {
      ConfigSchema.parse(config);
      this.fibaroClient = new FibaroClient(config);
    } catch (error) {
      console.error('Failed to initialize Fibaro client:', error);
      throw new Error(
        'Missing required environment variables: FIBARO_HOST, FIBARO_USERNAME, FIBARO_PASSWORD'
      );
    }
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
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
        throw toMcpError(error, { operation: 'resource', uri });
      }
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const client = this.getClient();
      const { name, arguments: args } = request.params;

      try {
        return await handleToolCall(client as any, name, args);
      } catch (error) {
        throw toMcpError(error, { operation: 'tool', name });
      }
    });
  }

  async run() {
    this.initializeClient();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Fibaro MCP Server running on stdio');
  }
}

export { FibaroMCPServer };

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) {
  const server = new FibaroMCPServer();
  server.run().catch(console.error);
}
