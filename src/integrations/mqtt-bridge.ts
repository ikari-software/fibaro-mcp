/**
 * Fibaro MCP Server - MQTT Bridge
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { logger } from "../logger.js";
import type { IMqttBridge, MqttConfig, MqttSubscription } from "./integration-types.js";

export class MqttBridge implements IMqttBridge {
  private client: any = null;
  private config: MqttConfig;
  private fibaroClient: any;
  private connected: boolean = false;
  private statePublishInterval: any = null;
  private mqtt: any = null;
  private subscriptions: Map<string, MqttSubscription> = new Map();

  constructor(config: MqttConfig, fibaroClient: any) {
    this.config = config;
    this.fibaroClient = fibaroClient;
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    if (this.connected) {
      logger.warn("MQTT client is already connected");
      return;
    }

    if (!this.config.enabled) {
      throw new Error("MQTT bridge is not enabled in configuration");
    }

    // Try to load MQTT library
    try {
      this.mqtt = await this.loadMqtt();
    } catch (error) {
      throw new Error(
        "MQTT library is not installed. Install it with: npm install mqtt\n" +
          "This is an optional feature that requires mqtt as a peer dependency."
      );
    }

    try {
      const options: any = {
        clientId: this.config.clientId,
      };

      if (this.config.username) {
        options.username = this.config.username;
      }
      if (this.config.password) {
        options.password = this.config.password;
      }

      this.client = this.mqtt.connect(this.config.broker, options);

      await new Promise<void>((resolve, reject) => {
        this.client.on("connect", async () => {
          this.connected = true;
          logger.info(`MQTT connected to ${this.config.broker}`);

          // Subscribe to configured topics
          for (const sub of this.config.subscriptions) {
            await this.subscribe(sub);
          }

          resolve();
        });

        this.client.on("error", (error: Error) => {
          logger.error("MQTT connection error", error);
          if (!this.connected) {
            reject(error);
          }
        });

        this.client.on("close", () => {
          this.connected = false;
          logger.warn("MQTT connection closed");
        });

        this.client.on("message", (topic: string, message: Buffer) => {
          this.handleMessage(topic, message.toString());
        });
      });

      // Start state publishing if enabled
      if (this.config.publishState) {
        this.startStatePublishing();
      }
    } catch (error) {
      logger.error("Failed to connect to MQTT broker", error);
      throw error;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    this.stopStatePublishing();

    if (this.client) {
      await new Promise<void>((resolve) => {
        this.client.end(() => {
          this.connected = false;
          logger.info("MQTT disconnected");
          resolve();
        });
      });
    }
  }

  /**
   * Check if connected to broker
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Subscribe to a topic
   */
  async subscribe(subscription: MqttSubscription): Promise<void> {
    if (!this.client) {
      throw new Error("MQTT client not initialized");
    }

    await new Promise<void>((resolve, reject) => {
      this.client.subscribe(
        subscription.topic,
        { qos: this.config.qos || 0 },
        (error: Error) => {
          if (error) {
            logger.error(`Failed to subscribe to ${subscription.topic}`, error);
            reject(error);
          } else {
            this.subscriptions.set(subscription.topic, subscription);
            logger.info(`Subscribed to MQTT topic: ${subscription.topic}`);
            resolve();
          }
        }
      );
    });
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(topic: string): Promise<void> {
    if (!this.client) {
      throw new Error("MQTT client not initialized");
    }

    await new Promise<void>((resolve, reject) => {
      this.client.unsubscribe(topic, (error: Error) => {
        if (error) {
          logger.error(`Failed to unsubscribe from ${topic}`, error);
          reject(error);
        } else {
          this.subscriptions.delete(topic);
          logger.info(`Unsubscribed from MQTT topic: ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Publish a message to a topic
   */
  async publish(
    topic: string,
    message: string,
    options?: { qos?: 0 | 1 | 2; retain?: boolean }
  ): Promise<void> {
    if (!this.client) {
      throw new Error("MQTT client not initialized");
    }

    await new Promise<void>((resolve, reject) => {
      this.client.publish(
        topic,
        message,
        {
          qos: options?.qos || this.config.qos || 0,
          retain: options?.retain || false,
        },
        (error: Error) => {
          if (error) {
            logger.error(`Failed to publish to ${topic}`, error);
            reject(error);
          } else {
            logger.debug(`Published to MQTT topic ${topic}: ${message}`);
            resolve();
          }
        }
      );
    });
  }

  /**
   * Start publishing device states periodically
   */
  startStatePublishing(): void {
    if (this.statePublishInterval) {
      return;
    }

    const interval = this.config.publishInterval || 60000; // Default: 1 minute

    this.statePublishInterval = setInterval(async () => {
      try {
        await this.publishDeviceStates();
      } catch (error) {
        logger.error("Failed to publish device states", error);
      }
    }, interval);

    logger.info(`Started MQTT state publishing (interval: ${interval}ms)`);

    // Publish initial states
    this.publishDeviceStates().catch((error) => {
      logger.error("Failed to publish initial device states", error);
    });
  }

  /**
   * Stop publishing device states
   */
  stopStatePublishing(): void {
    if (this.statePublishInterval) {
      clearInterval(this.statePublishInterval);
      this.statePublishInterval = null;
      logger.info("Stopped MQTT state publishing");
    }
  }

  // Private helper methods

  private async loadMqtt(): Promise<any> {
    try {
      const module = await import("mqtt");
      return module;
    } catch (error) {
      throw new Error("MQTT library not found");
    }
  }

  private async handleMessage(topic: string, message: string): Promise<void> {
    logger.debug(`MQTT message received on ${topic}: ${message}`);

    const subscription = this.subscriptions.get(topic);
    if (!subscription) {
      logger.warn(`No subscription handler found for topic: ${topic}`);
      return;
    }

    try {
      // Transform value if transformer provided
      const value = subscription.valueTransform
        ? subscription.valueTransform(message)
        : message;

      // Execute action based on type
      switch (subscription.action) {
        case "run_scene": {
          if (!subscription.sceneId) {
            logger.error("sceneId required for run_scene action");
            return;
          }
          await this.fibaroClient.runScene(subscription.sceneId);
          logger.info(`Scene ${subscription.sceneId} triggered by MQTT`);
          break;
        }

        case "device_action": {
          if (!subscription.deviceId || !subscription.actionName) {
            logger.error("deviceId and actionName required for device_action");
            return;
          }
          const args = Array.isArray(value) ? value : [value];
          await this.fibaroClient.callAction(
            subscription.deviceId,
            subscription.actionName,
            args
          );
          logger.info(
            `Device ${subscription.deviceId} action ${subscription.actionName} executed by MQTT`
          );
          break;
        }

        case "set_variable": {
          if (!subscription.variableName) {
            logger.error("variableName required for set_variable action");
            return;
          }
          await this.fibaroClient.setGlobalVariable(
            subscription.variableName,
            String(value)
          );
          logger.info(`Variable ${subscription.variableName} set to ${value} by MQTT`);
          break;
        }

        default:
          logger.warn(`Unknown action: ${subscription.action}`);
      }
    } catch (error) {
      logger.error(`Failed to handle MQTT message on ${topic}`, error);
    }
  }

  private async publishDeviceStates(): Promise<void> {
    try {
      const devices = await this.fibaroClient.getDevices();

      for (const device of devices) {
        const topic = `fibaro/devices/${device.id}/state`;
        const state = {
          id: device.id,
          name: device.name,
          type: device.type,
          roomID: device.roomID,
          enabled: device.enabled,
          properties: device.properties,
        };

        await this.publish(topic, JSON.stringify(state), { retain: true });
      }

      logger.debug(`Published states for ${devices.length} devices to MQTT`);
    } catch (error) {
      logger.error("Failed to publish device states", error);
      throw error;
    }
  }
}

// Factory function to create MQTT bridge
export async function createMqttBridge(
  config: MqttConfig,
  fibaroClient: any
): Promise<MqttBridge> {
  return new MqttBridge(config, fibaroClient);
}
