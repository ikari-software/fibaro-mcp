/**
 * Fibaro MCP Server - Analytics Types
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

/**
 * Device usage pattern analysis
 */
export interface DeviceUsagePattern {
  deviceId: number;
  deviceName: string;
  deviceType: string;
  activations: number;
  avgDailyUsage: number;
  peakHours: number[];
  lastActive: number;
  totalOnTime?: number; // milliseconds
  avgOnDuration?: number; // milliseconds
}

/**
 * Energy consumption trend
 */
export interface EnergyTrend {
  timestamp: number;
  totalConsumption: number;
  byRoom: Record<number, number>;
  byDeviceType: Record<string, number>;
  devices: Array<{
    deviceId: number;
    deviceName: string;
    consumption: number;
  }>;
}

/**
 * System health metrics
 */
export interface SystemHealthMetrics {
  timestamp: number;
  deadDevices: number;
  deadDeviceIds: number[];
  failedScenes: number;
  failedSceneIds: number[];
  avgResponseTime: number;
  uptime: number;
  errorRate: number;
  warningCount: number;
}

/**
 * Scene execution frequency
 */
export interface SceneFrequency {
  sceneId: number;
  sceneName: string;
  executions: number;
  avgExecutionsPerDay: number;
  lastExecution: number;
  successRate: number;
  avgDuration: number;
}

/**
 * Analytics dashboard data
 */
export interface AnalyticsDashboard {
  period: {
    from: number;
    to: number;
    days: number;
  };
  topDevices: DeviceUsagePattern[];
  energyTrends: EnergyTrend[];
  systemHealth: SystemHealthMetrics;
  topScenes: SceneFrequency[];
  summary: {
    totalActivations: number;
    totalEnergyConsumption: number;
    mostActiveDevice: string;
    mostUsedScene: string;
    healthScore: number; // 0-100
  };
}

/**
 * Analytics query options
 */
export interface AnalyticsOptions {
  from?: number;
  to?: number;
  device_ids?: number[];
  scene_ids?: number[];
  room_ids?: number[];
  group_by?: "hour" | "day" | "week" | "month";
  limit?: number;
}

/**
 * Hourly usage distribution
 */
export interface HourlyDistribution {
  hour: number; // 0-23
  count: number;
  percentage: number;
}

/**
 * Room activity summary
 */
export interface RoomActivitySummary {
  roomId: number;
  roomName: string;
  activations: number;
  activeDevices: number;
  totalDevices: number;
  avgDailyActivations: number;
  energyConsumption?: number;
}
