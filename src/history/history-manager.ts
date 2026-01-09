/**
 * Fibaro MCP Server - Device History Manager
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { logger } from "../logger.js";
import type {
  DeviceHistoryEntry,
  HistoryStats,
  HistoryQueryParams,
  TimeInterval,
  AggregationFunction,
  AggregatedHistoryEntry,
  HistoryExport,
  SceneExecution,
  ScenePerformanceStats,
  SceneHistoryQueryParams,
} from "./history-types.js";

export class HistoryManager {
  /**
   * Query device history from event log
   */
  async queryDeviceHistory(
    client: any,
    params: HistoryQueryParams,
  ): Promise<DeviceHistoryEntry[]> {
    const { deviceId, from, to, property, limit = 1000 } = params;

    // Build event log query parameters
    const eventLogParams: any = {};
    if (from) eventLogParams.from = from;
    if (to) eventLogParams.to = to;
    eventLogParams.limit = limit * 2; // Get more events to filter

    try {
      const events = await client.getEventLog(eventLogParams);
      logger.debug(`Retrieved ${events.length} events from log`);

      // Filter and transform events for this device
      const history: DeviceHistoryEntry[] = [];

      for (const event of events) {
        // Check if event is related to this device
        if (!this.isDeviceEvent(event, deviceId)) {
          continue;
        }

        // Extract device state change information
        const entry = this.parseDeviceEvent(event, deviceId);
        if (!entry) {
          continue;
        }

        // Filter by property if specified
        if (property && entry.property !== property) {
          continue;
        }

        history.push(entry);

        // Apply limit
        if (history.length >= limit) {
          break;
        }
      }

      logger.debug(`Filtered to ${history.length} device history entries`);
      return history;
    } catch (error) {
      logger.error("Failed to query device history", error);
      throw error;
    }
  }

  /**
   * Calculate statistics for device history
   */
  calculateStats(
    entries: DeviceHistoryEntry[],
    deviceId: number,
    property: string,
    from: number,
    to: number,
  ): HistoryStats {
    if (entries.length === 0) {
      return {
        deviceId,
        property,
        from,
        to,
        count: 0,
        first: null,
        last: null,
        changes: 0,
      };
    }

    const values: number[] = [];
    let changes = 0;
    let lastValue: any = undefined;

    for (const entry of entries) {
      const value = entry.value;

      // Track numeric values for statistics
      if (typeof value === "number" && !isNaN(value)) {
        values.push(value);
      }

      // Count changes
      if (lastValue !== undefined && lastValue !== value) {
        changes++;
      }
      lastValue = value;
    }

    const stats: HistoryStats = {
      deviceId,
      deviceName: entries[0].deviceName,
      property,
      from,
      to,
      count: entries.length,
      first: entries[0].value,
      last: entries[entries.length - 1].value,
      changes,
    };

    // Calculate numeric statistics if we have numeric values
    if (values.length > 0) {
      stats.min = Math.min(...values);
      stats.max = Math.max(...values);
      stats.avg = values.reduce((a, b) => a + b, 0) / values.length;
      stats.sum = values.reduce((a, b) => a + b, 0);
    }

    return stats;
  }

  /**
   * Aggregate history entries by time interval
   */
  aggregateByInterval(
    entries: DeviceHistoryEntry[],
    interval: TimeInterval,
    aggregation: AggregationFunction,
  ): AggregatedHistoryEntry[] {
    if (entries.length === 0) {
      return [];
    }

    const intervalMs = this.getIntervalMilliseconds(interval);
    const buckets = new Map<number, DeviceHistoryEntry[]>();

    // Group entries into time buckets
    for (const entry of entries) {
      const bucketTime = Math.floor(entry.timestamp / intervalMs) * intervalMs;
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, []);
      }
      buckets.get(bucketTime)!.push(entry);
    }

    // Aggregate each bucket
    const aggregated: AggregatedHistoryEntry[] = [];
    for (const [timestamp, bucketEntries] of Array.from(buckets.entries()).sort(
      (a, b) => a[0] - b[0],
    )) {
      const numericValues = bucketEntries
        .map((e) => e.value)
        .filter((v) => typeof v === "number" && !isNaN(v)) as number[];

      if (numericValues.length === 0) {
        continue;
      }

      const entry: AggregatedHistoryEntry = {
        timestamp,
        deviceId: bucketEntries[0].deviceId,
        property: bucketEntries[0].property,
        value: this.applyAggregation(numericValues, aggregation),
        count: bucketEntries.length,
      };

      if (aggregation === "avg" || aggregation === "last") {
        entry.min = Math.min(...numericValues);
        entry.max = Math.max(...numericValues);
        entry.avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      }

      aggregated.push(entry);
    }

    return aggregated;
  }

  /**
   * Export device history to structured format
   */
  async exportHistory(
    client: any,
    params: HistoryQueryParams,
    includeStats: boolean = true,
  ): Promise<HistoryExport> {
    const entries = await this.queryDeviceHistory(client, params);

    const exportData: HistoryExport = {
      deviceId: params.deviceId,
      property: params.property || "all",
      from: params.from || 0,
      to: params.to || Date.now(),
      entries,
    };

    if (includeStats && entries.length > 0) {
      exportData.stats = this.calculateStats(
        entries,
        params.deviceId,
        params.property || "value",
        params.from || 0,
        params.to || Date.now(),
      );
    }

    // Try to get device name
    try {
      const device = await client.getDevice(params.deviceId);
      exportData.deviceName = device.name;
      if (exportData.stats) {
        exportData.stats.deviceName = device.name;
      }
    } catch (error) {
      logger.warn(`Could not get device name for device ${params.deviceId}`);
    }

    return exportData;
  }

  /**
   * Query scene execution history
   */
  async querySceneHistory(
    client: any,
    params: SceneHistoryQueryParams,
  ): Promise<SceneExecution[]> {
    const { sceneId, from, to, status, limit = 1000 } = params;

    const eventLogParams: any = {};
    if (from) eventLogParams.from = from;
    if (to) eventLogParams.to = to;
    eventLogParams.limit = limit * 3; // Get more events to find scene executions

    try {
      const events = await client.getEventLog(eventLogParams);
      const executions: SceneExecution[] = [];
      const activeScenes = new Map<number, SceneExecution>();

      for (const event of events) {
        const sceneEvent = this.parseSceneEvent(event);
        if (!sceneEvent) {
          continue;
        }

        // Filter by scene ID if specified
        if (sceneId && sceneEvent.sceneId !== sceneId) {
          continue;
        }

        // Track scene starts and completions
        if (sceneEvent.type === "start") {
          activeScenes.set(sceneEvent.sceneId, {
            sceneId: sceneEvent.sceneId,
            sceneName: sceneEvent.sceneName,
            startTime: sceneEvent.timestamp,
            status: "running",
          });
        } else if (sceneEvent.type === "end" || sceneEvent.type === "error") {
          const execution = activeScenes.get(sceneEvent.sceneId);
          if (execution) {
            execution.endTime = sceneEvent.timestamp;
            execution.duration = sceneEvent.timestamp - execution.startTime;
            execution.status = sceneEvent.type === "error" ? "failure" : "success";
            if (sceneEvent.error) {
              execution.error = sceneEvent.error;
            }

            // Filter by status if specified
            if (!status || execution.status === status) {
              executions.push(execution);
            }

            activeScenes.delete(sceneEvent.sceneId);
          }
        }

        if (executions.length >= limit) {
          break;
        }
      }

      // Add still-running scenes
      for (const execution of activeScenes.values()) {
        if (!status || status === "running") {
          executions.push(execution);
        }
      }

      return executions.slice(0, limit);
    } catch (error) {
      logger.error("Failed to query scene history", error);
      throw error;
    }
  }

  /**
   * Calculate scene performance statistics
   */
  calculateSceneStats(executions: SceneExecution[]): ScenePerformanceStats | null {
    if (executions.length === 0) {
      return null;
    }

    const sceneId = executions[0].sceneId;
    const sceneName = executions[0].sceneName;

    const completedExecutions = executions.filter((e) => e.duration !== undefined);
    const successfulExecutions = executions.filter((e) => e.status === "success");
    const failedExecutions = executions.filter((e) => e.status === "failure");

    const durations = completedExecutions.map((e) => e.duration!).filter((d) => d > 0);

    return {
      sceneId,
      sceneName,
      totalExecutions: executions.length,
      successfulExecutions: successfulExecutions.length,
      failedExecutions: failedExecutions.length,
      successRate:
        executions.length > 0 ? (successfulExecutions.length / executions.length) * 100 : 0,
      avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
      lastExecution: executions[0].startTime,
      lastStatus: executions[0].status !== "running" ? executions[0].status : undefined,
    };
  }

  // Helper methods

  private isDeviceEvent(event: any, deviceId: number): boolean {
    // Check various event formats for device ID
    return (
      event.deviceID === deviceId ||
      event.deviceId === deviceId ||
      event.id === deviceId ||
      (event.data && (event.data.deviceID === deviceId || event.data.deviceId === deviceId))
    );
  }

  private parseDeviceEvent(event: any, deviceId: number): DeviceHistoryEntry | null {
    try {
      // Extract timestamp
      const timestamp = event.timestamp || event.created || event.time || Date.now();

      // Extract property and value
      let property = "value";
      let value: any = null;
      let oldValue: any = undefined;

      if (event.property !== undefined) {
        property = event.property;
        value = event.value;
        oldValue = event.oldValue;
      } else if (event.data) {
        property = event.data.property || "value";
        value = event.data.value !== undefined ? event.data.value : event.data.newValue;
        oldValue = event.data.oldValue;
      } else if (event.value !== undefined) {
        value = event.value;
      }

      return {
        timestamp,
        deviceId,
        deviceName: event.deviceName || event.name,
        property,
        value,
        oldValue,
        eventType: event.type,
      };
    } catch (error) {
      logger.debug("Failed to parse device event", error);
      return null;
    }
  }

  private parseSceneEvent(event: any): {
    sceneId: number;
    sceneName: string;
    timestamp: number;
    type: "start" | "end" | "error";
    error?: string;
  } | null {
    try {
      // Look for scene-related events
      if (
        !event.type ||
        (!event.type.includes("scene") && !event.type.includes("Scene"))
      ) {
        return null;
      }

      const timestamp = event.timestamp || event.created || event.time || Date.now();

      let sceneId: number | null = null;
      let sceneName = "Unknown Scene";
      let type: "start" | "end" | "error" = "start";
      let error: string | undefined;

      // Extract scene ID
      if (event.sceneId) sceneId = event.sceneId;
      else if (event.sceneID) sceneId = event.sceneID;
      else if (event.data && event.data.sceneId) sceneId = event.data.sceneId;
      else if (event.data && event.data.id) sceneId = event.data.id;

      if (sceneId === null) {
        return null;
      }

      // Extract scene name
      if (event.sceneName) sceneName = event.sceneName;
      else if (event.name) sceneName = event.name;
      else if (event.data && event.data.name) sceneName = event.data.name;

      // Determine event type
      const eventType = (event.type || "").toLowerCase();
      if (eventType.includes("start") || eventType.includes("run")) {
        type = "start";
      } else if (eventType.includes("end") || eventType.includes("finish") || eventType.includes("complete")) {
        type = "end";
      } else if (eventType.includes("error") || eventType.includes("fail")) {
        type = "error";
        error = event.message || event.error || "Scene execution failed";
      }

      return { sceneId, sceneName, timestamp, type, error };
    } catch (error) {
      return null;
    }
  }

  private getIntervalMilliseconds(interval: TimeInterval): number {
    const intervals: Record<TimeInterval, number> = {
      "5m": 5 * 60 * 1000,
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "1d": 24 * 60 * 60 * 1000,
      "1w": 7 * 24 * 60 * 60 * 1000,
    };
    return intervals[interval];
  }

  private applyAggregation(values: number[], aggregation: AggregationFunction): number {
    if (values.length === 0) {
      return 0;
    }

    switch (aggregation) {
      case "last":
        return values[values.length - 1];
      case "avg":
        return values.reduce((a, b) => a + b, 0) / values.length;
      case "min":
        return Math.min(...values);
      case "max":
        return Math.max(...values);
      case "sum":
        return values.reduce((a, b) => a + b, 0);
      case "count":
        return values.length;
      default:
        return values[values.length - 1];
    }
  }
}

// Singleton instance
let historyManager: HistoryManager | null = null;

export function getHistoryManager(): HistoryManager {
  if (!historyManager) {
    historyManager = new HistoryManager();
  }
  return historyManager;
}
