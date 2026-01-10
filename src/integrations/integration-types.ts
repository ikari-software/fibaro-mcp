/**
 * Fibaro MCP Server - Integration Types
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

/**
 * Webhook configuration
 */
export interface WebhookConfig {
  enabled: boolean;
  port: number;
  host?: string;
  authToken?: string;
  routes: WebhookRoute[];
}

/**
 * Webhook route definition
 */
export interface WebhookRoute {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  action: "run_scene" | "device_action" | "set_variable" | "custom";
  sceneId?: number;
  deviceId?: number;
  actionName?: string;
  variableName?: string;
  handler?: (req: any, res: any) => Promise<void>;
}

/**
 * MQTT configuration
 */
export interface MqttConfig {
  enabled: boolean;
  broker: string;
  clientId: string;
  username?: string;
  password?: string;
  subscriptions: MqttSubscription[];
  publishState: boolean;
  publishInterval?: number; // ms
  qos?: 0 | 1 | 2;
}

/**
 * MQTT subscription definition
 */
export interface MqttSubscription {
  topic: string;
  action: "run_scene" | "device_action" | "set_variable";
  sceneId?: number;
  deviceId?: number;
  actionName?: string;
  variableName?: string;
  valueTransform?: (payload: string) => any;
}

/**
 * Integration status
 */
export interface IntegrationStatus {
  webhook: {
    enabled: boolean;
    running: boolean;
    port?: number;
    error?: string;
  };
  mqtt: {
    enabled: boolean;
    connected: boolean;
    broker?: string;
    error?: string;
  };
}

/**
 * Webhook server interface
 */
export interface IWebhookServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getPort(): number;
  addRoute(route: WebhookRoute): void;
  removeRoute(path: string, method: string): void;
}

/**
 * MQTT bridge interface
 */
export interface IMqttBridge {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  subscribe(subscription: MqttSubscription): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  publish(topic: string, message: string, options?: { qos?: 0 | 1 | 2; retain?: boolean }): Promise<void>;
  startStatePublishing(): void;
  stopStatePublishing(): void;
}
