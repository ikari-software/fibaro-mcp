/**
 * Fibaro MCP Server - Webhook Server
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { logger } from "../logger.js";
import type { IWebhookServer, WebhookConfig, WebhookRoute } from "./integration-types.js";

export class WebhookServer implements IWebhookServer {
  private app: any = null;
  private server: any = null;
  private config: WebhookConfig;
  private client: any;
  private running: boolean = false;
  private express: any = null;

  constructor(config: WebhookConfig, client: any) {
    this.config = config;
    this.client = client;
  }

  /**
   * Start the webhook server
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn("Webhook server is already running");
      return;
    }

    if (!this.config.enabled) {
      throw new Error("Webhook server is not enabled in configuration");
    }

    // Try to load Express
    try {
      this.express = await this.loadExpress();
    } catch (error) {
      throw new Error(
        "Express is not installed. Install it with: npm install express\n" +
          "This is an optional feature that requires express as a peer dependency."
      );
    }

    try {
      this.app = this.express();
      this.setupMiddleware();
      this.setupRoutes();

      await new Promise<void>((resolve, reject) => {
        this.server = this.app.listen(
          this.config.port,
          this.config.host || "0.0.0.0",
          () => {
            this.running = true;
            logger.info(
              `Webhook server started on ${this.config.host || "0.0.0.0"}:${this.config.port}`
            );
            resolve();
          }
        );

        this.server.on("error", (error: Error) => {
          logger.error("Failed to start webhook server", error);
          reject(error);
        });
      });
    } catch (error) {
      logger.error("Failed to start webhook server", error);
      throw error;
    }
  }

  /**
   * Stop the webhook server
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          this.running = false;
          logger.info("Webhook server stopped");
          resolve();
        });
      });
    }
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the port the server is listening on
   */
  getPort(): number {
    return this.config.port;
  }

  /**
   * Add a new webhook route
   */
  addRoute(route: WebhookRoute): void {
    if (!this.app) {
      throw new Error("Webhook server not initialized");
    }

    const handler = this.createRouteHandler(route);

    switch (route.method) {
      case "GET":
        this.app.get(route.path, handler);
        break;
      case "POST":
        this.app.post(route.path, handler);
        break;
      case "PUT":
        this.app.put(route.path, handler);
        break;
      case "DELETE":
        this.app.delete(route.path, handler);
        break;
    }

    logger.info(`Added webhook route: ${route.method} ${route.path}`);
  }

  /**
   * Remove a webhook route
   */
  removeRoute(path: string, method: string): void {
    // Express doesn't support removing routes dynamically
    // This would require using a routing library like express-dynamic-middleware
    logger.warn("Route removal not implemented in Express");
  }

  // Private helper methods

  private async loadExpress(): Promise<any> {
    try {
      const module = await import("express");
      return module.default;
    } catch (error) {
      throw new Error("Express not found");
    }
  }

  private setupMiddleware(): void {
    // JSON body parser
    this.app.use(this.express.json());

    // Authentication middleware
    if (this.config.authToken) {
      this.app.use((req: any, res: any, next: any) => {
        const token = req.headers.authorization?.replace("Bearer ", "");
        if (token !== this.config.authToken) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        next();
      });
    }

    // Logging middleware
    this.app.use((req: any, res: any, next: any) => {
      logger.debug(`Webhook request: ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get("/health", (req: any, res: any) => {
      res.json({ status: "ok" });
    });

    // Add configured routes
    for (const route of this.config.routes) {
      this.addRoute(route);
    }
  }

  private createRouteHandler(route: WebhookRoute): (req: any, res: any) => Promise<void> {
    return async (req: any, res: any) => {
      try {
        logger.info(`Webhook triggered: ${route.method} ${route.path}`, {
          action: route.action,
        });

        // Use custom handler if provided
        if (route.handler) {
          await route.handler(req, res);
          return;
        }

        // Execute action based on type
        switch (route.action) {
          case "run_scene": {
            if (!route.sceneId) {
              return res.status(400).json({ error: "sceneId required for run_scene action" });
            }
            await this.client.runScene(route.sceneId);
            res.json({ success: true, message: `Scene ${route.sceneId} triggered` });
            break;
          }

          case "device_action": {
            if (!route.deviceId || !route.actionName) {
              return res.status(400).json({
                error: "deviceId and actionName required for device_action",
              });
            }
            const args = req.body.args || [];
            await this.client.callAction(route.deviceId, route.actionName, args);
            res.json({
              success: true,
              message: `Device ${route.deviceId} action ${route.actionName} executed`,
            });
            break;
          }

          case "set_variable": {
            if (!route.variableName) {
              return res.status(400).json({
                error: "variableName required for set_variable action",
              });
            }
            const value = req.body.value || req.query.value;
            if (value === undefined) {
              return res.status(400).json({ error: "value required" });
            }
            await this.client.setGlobalVariable(route.variableName, String(value));
            res.json({
              success: true,
              message: `Variable ${route.variableName} set to ${value}`,
            });
            break;
          }

          case "custom": {
            // Custom action - no default handler
            res.json({
              success: true,
              message: "Custom action executed",
              body: req.body,
            });
            break;
          }

          default:
            res.status(400).json({ error: `Unknown action: ${route.action}` });
        }
      } catch (error) {
        logger.error("Webhook handler error", error);
        res.status(500).json({
          error: error instanceof Error ? error.message : "Internal server error",
        });
      }
    };
  }
}

// Factory function to create webhook server
export async function createWebhookServer(
  config: WebhookConfig,
  client: any
): Promise<WebhookServer> {
  return new WebhookServer(config, client);
}
