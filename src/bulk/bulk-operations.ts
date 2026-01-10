/**
 * Fibaro MCP Server - Bulk Operations Manager
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { logger } from "../logger.js";
import { getQueryEngine } from "./query-engine.js";
import type {
  DeviceQuery,
  BulkOperationResult,
  BulkAction,
  BulkOperationOptions,
  DeviceOperationResult,
  RollbackEntry,
} from "./bulk-types.js";

export class BulkOperationsManager {
  private queryEngine = getQueryEngine();
  private readonly DEFAULT_CONCURRENCY = 5;

  /**
   * Execute bulk operation on devices matching query
   */
  async executeBulkOperation(
    client: any,
    query: DeviceQuery,
    action: BulkAction,
    options: BulkOperationOptions = {}
  ): Promise<BulkOperationResult> {
    const startTime = Date.now();

    logger.info("Executing bulk operation", {
      query,
      action,
      options,
    });

    // Validate query
    const validation = this.queryEngine.validateQuery(query);
    if (!validation.valid) {
      throw new Error(`Invalid query: ${validation.errors.join(", ")}`);
    }

    // Get all devices and filter by query
    const allDevices = await client.getDevices();
    const targetDevices = this.queryEngine.filterDevices(allDevices, query);

    logger.info(`Selected ${targetDevices.length} devices for bulk operation`);

    if (targetDevices.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        results: [],
        duration: Date.now() - startTime,
        query,
      };
    }

    // Dry run mode
    if (options.dry_run) {
      logger.info("Dry run mode - no actions will be executed");
      return {
        total: targetDevices.length,
        successful: 0,
        failed: 0,
        skipped: targetDevices.length,
        results: targetDevices.map((d) => ({
          deviceId: d.id,
          deviceName: d.name,
          success: true,
          value: "[DRY RUN] Would execute action",
        })),
        duration: Date.now() - startTime,
        query,
      };
    }

    // Execute operations
    const results = options.parallel
      ? await this.executeParallel(
          client,
          targetDevices,
          action,
          options.concurrency || this.DEFAULT_CONCURRENCY,
          options.stop_on_error || false
        )
      : await this.executeSequential(
          client,
          targetDevices,
          action,
          options.stop_on_error || false
        );

    // Handle rollback if needed
    if (options.rollback_on_error && results.failed > 0) {
      logger.warn("Rolling back operations due to failures");
      await this.rollbackOperations(client, results.results, action);
    }

    const duration = Date.now() - startTime;

    logger.info("Bulk operation completed", {
      total: results.total,
      successful: results.successful,
      failed: results.failed,
      duration,
    });

    return {
      ...results,
      duration,
      query,
    };
  }

  /**
   * Get preview of devices that would be affected by query
   */
  async previewQuery(client: any, query: DeviceQuery): Promise<any[]> {
    const validation = this.queryEngine.validateQuery(query);
    if (!validation.valid) {
      throw new Error(`Invalid query: ${validation.errors.join(", ")}`);
    }

    const allDevices = await client.getDevices();
    const targetDevices = this.queryEngine.filterDevices(allDevices, query);

    return targetDevices.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      roomID: d.roomID,
      enabled: d.enabled,
    }));
  }

  // Private helper methods

  private async executeSequential(
    client: any,
    devices: any[],
    action: BulkAction,
    stopOnError: boolean
  ): Promise<Omit<BulkOperationResult, "duration" | "query">> {
    const results: DeviceOperationResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const device of devices) {
      try {
        const result = await this.executeDeviceAction(client, device, action);
        results.push(result);

        if (result.success) {
          successful++;
        } else {
          failed++;
          if (stopOnError) {
            logger.warn("Stopping bulk operation due to error");
            break;
          }
        }
      } catch (error) {
        const errorResult: DeviceOperationResult = {
          deviceId: device.id,
          deviceName: device.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
        results.push(errorResult);
        failed++;

        if (stopOnError) {
          logger.warn("Stopping bulk operation due to error");
          break;
        }
      }
    }

    return {
      total: devices.length,
      successful,
      failed,
      skipped: devices.length - results.length,
      results,
    };
  }

  private async executeParallel(
    client: any,
    devices: any[],
    action: BulkAction,
    concurrency: number,
    stopOnError: boolean
  ): Promise<Omit<BulkOperationResult, "duration" | "query">> {
    const results: DeviceOperationResult[] = [];
    let successful = 0;
    let failed = 0;
    let shouldStop = false;

    // Process devices in chunks
    for (let i = 0; i < devices.length; i += concurrency) {
      if (shouldStop) break;

      const chunk = devices.slice(i, i + concurrency);
      const chunkPromises = chunk.map((device) =>
        this.executeDeviceAction(client, device, action).catch((error) => ({
          deviceId: device.id,
          deviceName: device.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }))
      );

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      for (const result of chunkResults) {
        if (result.success) {
          successful++;
        } else {
          failed++;
          if (stopOnError) {
            shouldStop = true;
            break;
          }
        }
      }
    }

    return {
      total: devices.length,
      successful,
      failed,
      skipped: devices.length - results.length,
      results,
    };
  }

  private async executeDeviceAction(
    client: any,
    device: any,
    action: BulkAction
  ): Promise<DeviceOperationResult> {
    try {
      switch (action.type) {
        case "device_action": {
          if (!action.action) {
            throw new Error("Device action requires 'action' field");
          }
          await client.callAction(device.id, action.action, action.args || []);
          return {
            deviceId: device.id,
            deviceName: device.name,
            success: true,
          };
        }

        case "set_property": {
          if (!action.property || action.value === undefined) {
            throw new Error("Set property requires 'property' and 'value' fields");
          }
          await client.setProperty(device.id, action.property, action.value);
          return {
            deviceId: device.id,
            deviceName: device.name,
            success: true,
            value: action.value,
          };
        }

        case "update_config": {
          if (!action.config) {
            throw new Error("Update config requires 'config' field");
          }
          await client.updateDevice(device.id, action.config);
          return {
            deviceId: device.id,
            deviceName: device.name,
            success: true,
          };
        }

        case "enable": {
          await client.updateDevice(device.id, { enabled: true });
          return {
            deviceId: device.id,
            deviceName: device.name,
            success: true,
            value: true,
          };
        }

        case "disable": {
          await client.updateDevice(device.id, { enabled: false });
          return {
            deviceId: device.id,
            deviceName: device.name,
            success: true,
            value: false,
          };
        }

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      return {
        deviceId: device.id,
        deviceName: device.name,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async rollbackOperations(
    client: any,
    results: DeviceOperationResult[],
    originalAction: BulkAction
  ): Promise<void> {
    const successfulResults = results.filter((r) => r.success);
    if (successfulResults.length === 0) {
      return;
    }

    logger.info(`Rolling back ${successfulResults.length} successful operations`);

    for (const result of successfulResults) {
      try {
        const rollbackAction = this.getRollbackAction(originalAction, result);
        if (rollbackAction) {
          const device = { id: result.deviceId, name: result.deviceName };
          await this.executeDeviceAction(client, device, rollbackAction);
          logger.debug(`Rolled back operation for device ${result.deviceId}`);
        }
      } catch (error) {
        logger.error(`Failed to rollback operation for device ${result.deviceId}`, error);
      }
    }
  }

  private getRollbackAction(
    originalAction: BulkAction,
    result: DeviceOperationResult
  ): BulkAction | null {
    switch (originalAction.type) {
      case "enable":
        return { type: "disable" };

      case "disable":
        return { type: "enable" };

      case "set_property":
        // Would need to store previous values to rollback properly
        // For now, we can't rollback property changes without previous state
        logger.warn("Cannot rollback set_property without previous state tracking");
        return null;

      default:
        logger.warn(`No rollback strategy for action type: ${originalAction.type}`);
        return null;
    }
  }
}

// Singleton instance
let bulkOperationsManager: BulkOperationsManager | null = null;

export function getBulkOperationsManager(): BulkOperationsManager {
  if (!bulkOperationsManager) {
    bulkOperationsManager = new BulkOperationsManager();
  }
  return bulkOperationsManager;
}
