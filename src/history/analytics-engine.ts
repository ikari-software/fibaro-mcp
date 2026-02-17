/**
 * Fibaro MCP Server - Analytics Engine
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { logger } from "../logger.js";
import type { FibaroClientLike } from "../fibaro-client.js";
import type {
  DeviceUsagePattern,
  EnergyTrend,
  SystemHealthMetrics,
  SceneFrequency,
  AnalyticsDashboard,
  AnalyticsOptions,
  HourlyDistribution,
  RoomActivitySummary,
} from "./analytics-types.js";

export class AnalyticsEngine {
  /**
   * Analyze device usage patterns from event log
   */
  async analyzeDeviceUsage(
    client: FibaroClientLike,
    options: AnalyticsOptions = {}
  ): Promise<DeviceUsagePattern[]> {
    const from = options.from || Date.now() - 7 * 24 * 3600000; // Default: 7 days
    const to = options.to || Date.now();
    const days = (to - from) / (24 * 3600000);

    logger.debug("Analyzing device usage", { from, to, days });

    // Get event log
    const events = await client.getEventLog({ from, to });
    const devices = await client.getDevices();

    // Filter device-related events
    const deviceEvents = events.filter(
      (e: any) =>
        e.type === "DEVICE_EVENT" ||
        e.type === "DEVICE_PROPERTY_CHANGED" ||
        (e.data && (e.data.deviceId || e.data.device_id))
    );

    // Group events by device
    const deviceMap = new Map<number, any[]>();
    for (const event of deviceEvents) {
      const deviceId = event.deviceId || event.data?.deviceId || event.data?.device_id;
      if (deviceId) {
        if (!deviceMap.has(deviceId)) {
          deviceMap.set(deviceId, []);
        }
        deviceMap.get(deviceId)!.push(event);
      }
    }

    // Filter by device_ids if specified
    let deviceIds = Array.from(deviceMap.keys());
    if (options.device_ids && options.device_ids.length > 0) {
      deviceIds = deviceIds.filter((id) => options.device_ids!.includes(id));
    }

    // Calculate usage patterns
    const patterns: DeviceUsagePattern[] = [];

    for (const deviceId of deviceIds) {
      const device = devices.find((d: any) => d.id === deviceId);
      if (!device) continue;

      const deviceEvents = deviceMap.get(deviceId) || [];
      const activations = deviceEvents.length;
      const avgDailyUsage = days > 0 ? activations / days : activations;

      // Calculate peak hours
      const hourCounts = new Array(24).fill(0);
      for (const event of deviceEvents) {
        const hour = new Date(event.timestamp || event.created).getHours();
        hourCounts[hour]++;
      }
      const maxCount = hourCounts.reduce((a, b) => (a > b ? a : b));
      const peakHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .filter((h) => h.count >= maxCount * 0.8)
        .map((h) => h.hour)
        .sort((a, b) => a - b);

      // Find last active time
      const lastActive =
        deviceEvents.length > 0
          ? deviceEvents.reduce((max: number, e: any) => { const t = e.timestamp || e.created; return t > max ? t : max; }, 0)
          : 0;

      patterns.push({
        deviceId,
        deviceName: device.name,
        deviceType: device.type,
        activations,
        avgDailyUsage,
        peakHours,
        lastActive,
      });
    }

    // Sort by activations descending
    patterns.sort((a, b) => b.activations - a.activations);

    // Limit results if specified
    if (options.limit && options.limit > 0) {
      return patterns.slice(0, options.limit);
    }

    return patterns;
  }

  /**
   * Analyze energy consumption trends.
   *
   * NOTE: The Fibaro HC2 API provides current device readings (power/energy)
   * but does not expose per-interval historical energy data through the event log.
   * This method returns a single snapshot of current consumption broken down
   * by room and device type. For true historical energy data, use
   * fibaro_home op=energy_graph which queries the HC2 summary-graph API.
   */
  async analyzeEnergyTrends(
    client: FibaroClientLike,
    options: AnalyticsOptions = {}
  ): Promise<EnergyTrend[]> {
    logger.debug("Analyzing energy consumption snapshot");

    // Get devices with power consumption
    const devices = await client.getDevices();
    const powerDevices = devices.filter(
      (d: any) =>
        d.properties?.power !== undefined || d.properties?.energy !== undefined
    );

    const trend: EnergyTrend = {
      timestamp: Date.now(),
      totalConsumption: 0,
      byRoom: {},
      byDeviceType: {},
      devices: [],
    };

    for (const device of powerDevices) {
      const power = Number(device.properties?.power) || 0;
      const energy = Number(device.properties?.energy) || 0;
      // Prefer energy (cumulative kWh) if available, otherwise use power (W)
      const consumption = energy || power;

      if (consumption > 0) {
        trend.totalConsumption += consumption;

        // By room
        const roomId = device.roomID;
        if (roomId) {
          trend.byRoom[roomId] = (trend.byRoom[roomId] || 0) + consumption;
        }

        // By device type
        const deviceType = device.type || "unknown";
        trend.byDeviceType[deviceType] =
          (trend.byDeviceType[deviceType] || 0) + consumption;

        // Individual devices
        trend.devices.push({
          deviceId: device.id,
          deviceName: device.name,
          consumption,
        });
      }
    }

    // Sort devices by consumption
    trend.devices.sort((a, b) => b.consumption - a.consumption);

    return [trend];
  }

  /**
   * Analyze scene execution frequency
   */
  async analyzeSceneFrequency(
    client: FibaroClientLike,
    options: AnalyticsOptions = {}
  ): Promise<SceneFrequency[]> {
    const from = options.from || Date.now() - 7 * 24 * 3600000;
    const to = options.to || Date.now();
    const days = (to - from) / (24 * 3600000);

    logger.debug("Analyzing scene frequency", { from, to, days });

    // Get event log
    const events = await client.getEventLog({ from, to });
    const scenes = await client.getScenes();

    // Filter scene events
    const sceneEvents = events.filter(
      (e: any) =>
        e.type === "SCENE_STARTED" ||
        e.type === "SCENE_FINISHED" ||
        e.type === "SCENE_FAILED" ||
        (e.data && (e.data.sceneId || e.data.scene_id))
    );

    // Group by scene
    const sceneMap = new Map<number, any[]>();
    for (const event of sceneEvents) {
      const sceneId = event.sceneId || event.data?.sceneId || event.data?.scene_id;
      if (sceneId) {
        if (!sceneMap.has(sceneId)) {
          sceneMap.set(sceneId, []);
        }
        sceneMap.get(sceneId)!.push(event);
      }
    }

    // Filter by scene_ids if specified
    let sceneIds = Array.from(sceneMap.keys());
    if (options.scene_ids && options.scene_ids.length > 0) {
      sceneIds = sceneIds.filter((id) => options.scene_ids!.includes(id));
    }

    // Calculate frequency metrics
    const frequencies: SceneFrequency[] = [];

    for (const sceneId of sceneIds) {
      const scene = scenes.find((s: any) => s.id === sceneId);
      if (!scene) continue;

      const sceneEvents = sceneMap.get(sceneId) || [];
      const executions = sceneEvents.filter(
        (e: any) => e.type === "SCENE_STARTED" || !e.type
      ).length;
      const avgExecutionsPerDay = days > 0 ? executions / days : executions;

      // Calculate success rate
      const finished = sceneEvents.filter((e: any) => e.type === "SCENE_FINISHED").length;
      const failed = sceneEvents.filter((e: any) => e.type === "SCENE_FAILED").length;
      const total = finished + failed;
      const successRate = total > 0 ? (finished / total) * 100 : 100;

      // Find last execution
      const lastExecution =
        sceneEvents.length > 0
          ? sceneEvents.reduce((max: number, e: any) => { const t = e.timestamp || e.created; return t > max ? t : max; }, 0)
          : 0;

      // Calculate average duration from paired SCENE_STARTED / SCENE_FINISHED events
      const starts = sceneEvents.filter((e: any) => e.type === "SCENE_STARTED")
        .sort((a: any, b: any) => (a.timestamp || a.created) - (b.timestamp || b.created));
      const finishes = sceneEvents.filter((e: any) => e.type === "SCENE_FINISHED")
        .sort((a: any, b: any) => (a.timestamp || a.created) - (b.timestamp || b.created));
      let durationSum = 0;
      let durationCount = 0;
      let fIdx = 0;
      for (const start of starts) {
        const st = start.timestamp || start.created;
        while (fIdx < finishes.length && (finishes[fIdx].timestamp || finishes[fIdx].created) <= st) {
          fIdx++;
        }
        if (fIdx < finishes.length) {
          durationSum += (finishes[fIdx].timestamp || finishes[fIdx].created) - st;
          durationCount++;
          fIdx++;
        }
      }
      const avgDuration = durationCount > 0 ? durationSum / durationCount : 0;

      frequencies.push({
        sceneId,
        sceneName: scene.name,
        executions,
        avgExecutionsPerDay,
        lastExecution,
        successRate,
        avgDuration,
      });
    }

    // Sort by executions descending
    frequencies.sort((a, b) => b.executions - a.executions);

    // Limit results if specified
    if (options.limit && options.limit > 0) {
      return frequencies.slice(0, options.limit);
    }

    return frequencies;
  }

  /**
   * Analyze system health metrics
   */
  async analyzeSystemHealth(client: FibaroClientLike): Promise<SystemHealthMetrics> {
    logger.debug("Analyzing system health");

    const devices = await client.getDevices();
    const events = await client.getEventLog({
      from: Date.now() - 24 * 3600000, // Last 24 hours
    });

    // Dead devices
    const deadDevices = devices.filter((d: any) => d.dead === true);
    const deadDeviceIds = deadDevices.map((d: any) => d.id);

    // Failed scenes
    const failedSceneEvents = events.filter((e: any) => e.type === "SCENE_FAILED");
    const failedSceneIds = [
      ...new Set(
        failedSceneEvents.map((e: any) => e.sceneId || e.data?.sceneId || e.data?.scene_id)
      ),
    ].filter((id): id is number => id !== undefined);

    // Error rate
    const errorEvents = events.filter(
      (e: any) => e.type === "ERROR" || e.type === "CRITICAL"
    );
    const warningEvents = events.filter((e: any) => e.type === "WARNING");
    const totalEvents = events.length;
    const errorRate = totalEvents > 0 ? (errorEvents.length / totalEvents) * 100 : 0;

    // System uptime (from system info)
    let uptime = 0;
    try {
      const systemInfo = await client.getSystemInfo();
      uptime = systemInfo.uptime || 0;
    } catch (error) {
      logger.warn("Failed to get system uptime", error);
    }

    // Not measurable from event logs alone — requires API-level instrumentation
    const avgResponseTime = 0;

    return {
      timestamp: Date.now(),
      totalDevices: devices.length,
      deadDevices: deadDevices.length,
      deadDeviceIds,
      failedScenes: failedSceneIds.length,
      failedSceneIds,
      avgResponseTime,
      uptime,
      errorRate,
      warningCount: warningEvents.length,
    };
  }

  /**
   * Generate comprehensive analytics dashboard
   */
  async generateDashboard(
    client: FibaroClientLike,
    options: AnalyticsOptions = {}
  ): Promise<AnalyticsDashboard> {
    const from = options.from || Date.now() - 7 * 24 * 3600000;
    const to = options.to || Date.now();
    const days = (to - from) / (24 * 3600000);

    logger.info("Generating analytics dashboard", { from, to, days });

    // Gather all analytics data in parallel
    const [topDevices, energyTrends, systemHealth, topScenes] = await Promise.all([
      this.analyzeDeviceUsage(client, { ...options, limit: 10 }),
      this.analyzeEnergyTrends(client, options),
      this.analyzeSystemHealth(client),
      this.analyzeSceneFrequency(client, { ...options, limit: 10 }),
    ]);

    // Calculate summary
    const totalActivations = topDevices.reduce((sum, d) => sum + d.activations, 0);
    const totalEnergyConsumption = energyTrends.reduce(
      (sum, t) => sum + t.totalConsumption,
      0
    );
    const mostActiveDevice = topDevices[0]?.deviceName || "N/A";
    const mostUsedScene = topScenes[0]?.sceneName || "N/A";

    // Calculate health score (0-100)
    const healthScore = this.calculateHealthScore(systemHealth, systemHealth.totalDevices);

    return {
      period: {
        from,
        to,
        days,
      },
      topDevices,
      energyTrends,
      systemHealth,
      topScenes,
      summary: {
        totalActivations,
        totalEnergyConsumption,
        mostActiveDevice,
        mostUsedScene,
        healthScore,
      },
    };
  }

  /**
   * Get hourly distribution of device activations
   */
  async getHourlyDistribution(
    client: FibaroClientLike,
    options: AnalyticsOptions = {}
  ): Promise<HourlyDistribution[]> {
    const from = options.from || Date.now() - 7 * 24 * 3600000;
    const to = options.to || Date.now();

    const events = await client.getEventLog({ from, to });
    const deviceEvents = events.filter(
      (e: any) =>
        e.type === "DEVICE_EVENT" ||
        e.type === "DEVICE_PROPERTY_CHANGED" ||
        (e.data && (e.data.deviceId || e.data.device_id))
    );

    const hourCounts = new Array(24).fill(0);
    for (const event of deviceEvents) {
      const hour = new Date(event.timestamp || event.created).getHours();
      hourCounts[hour]++;
    }

    const total = hourCounts.reduce((sum, count) => sum + count, 0);

    return hourCounts.map((count, hour) => ({
      hour,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }

  /**
   * Get room activity summary
   */
  async getRoomActivity(
    client: FibaroClientLike,
    options: AnalyticsOptions = {}
  ): Promise<RoomActivitySummary[]> {
    const from = options.from || Date.now() - 7 * 24 * 3600000;
    const to = options.to || Date.now();
    const days = (to - from) / (24 * 3600000);

    const devices = await client.getDevices();
    const rooms = await client.getRooms();
    const events = await client.getEventLog({ from, to });

    const deviceEvents = events.filter(
      (e: any) =>
        e.type === "DEVICE_EVENT" ||
        e.type === "DEVICE_PROPERTY_CHANGED" ||
        (e.data && (e.data.deviceId || e.data.device_id))
    );

    // Group events by device
    const deviceEventMap = new Map<number, number>();
    for (const event of deviceEvents) {
      const deviceId = event.deviceId || event.data?.deviceId || event.data?.device_id;
      if (deviceId) {
        deviceEventMap.set(deviceId, (deviceEventMap.get(deviceId) || 0) + 1);
      }
    }

    // Calculate room summaries
    const summaries: RoomActivitySummary[] = [];

    for (const room of rooms) {
      const roomDevices = devices.filter((d: any) => d.roomID === room.id);
      const totalDevices = roomDevices.length;

      let activations = 0;
      let activeDevices = 0;

      for (const device of roomDevices) {
        const deviceActivations = deviceEventMap.get(device.id) || 0;
        if (deviceActivations > 0) {
          activations += deviceActivations;
          activeDevices++;
        }
      }

      const avgDailyActivations = days > 0 ? activations / days : activations;

      summaries.push({
        roomId: room.id,
        roomName: room.name,
        activations,
        activeDevices,
        totalDevices,
        avgDailyActivations,
      });
    }

    // Sort by activations descending
    summaries.sort((a, b) => b.activations - a.activations);

    // Filter by room_ids if specified
    if (options.room_ids && options.room_ids.length > 0) {
      return summaries.filter((s) => options.room_ids!.includes(s.roomId));
    }

    return summaries;
  }

  // Private helper methods

  private calculateHealthScore(
    health: SystemHealthMetrics,
    totalDevices: number
  ): number {
    let score = 100;

    // Deduct for dead devices (max -30 points)
    if (totalDevices > 0) {
      const deadPercentage = (health.deadDevices / totalDevices) * 100;
      score -= Math.min(deadPercentage, 30);
    }

    // Deduct for failed scenes (max -20 points)
    score -= Math.min(health.failedScenes * 2, 20);

    // Deduct for error rate (max -30 points)
    score -= Math.min(health.errorRate, 30);

    // Deduct for warnings (max -20 points)
    score -= Math.min(health.warningCount / 5, 20);

    return Math.max(0, Math.round(score));
  }
}

// Singleton instance
let analyticsEngine: AnalyticsEngine | null = null;

export function getAnalyticsEngine(): AnalyticsEngine {
  if (!analyticsEngine) {
    analyticsEngine = new AnalyticsEngine();
  }
  return analyticsEngine;
}
