/**
 * Fibaro MCP Server - Device History Types
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

/**
 * Device history entry representing a state change
 */
export interface DeviceHistoryEntry {
  timestamp: number;
  deviceId: number;
  deviceName?: string;
  property: string;
  value: any;
  oldValue?: any;
  eventType?: string;
}

/**
 * Device history statistics
 */
export interface HistoryStats {
  deviceId: number;
  deviceName?: string;
  property: string;
  from: number;
  to: number;
  count: number;
  min?: number;
  max?: number;
  avg?: number;
  sum?: number;
  first: any;
  last: any;
  changes: number;
}

/**
 * History query parameters
 */
export interface HistoryQueryParams {
  deviceId: number;
  from?: number;
  to?: number;
  property?: string;
  limit?: number;
}

/**
 * Time interval for aggregation
 */
export type TimeInterval = "5m" | "15m" | "1h" | "6h" | "1d" | "1w";

/**
 * Aggregation function
 */
export type AggregationFunction = "last" | "avg" | "min" | "max" | "sum" | "count";

/**
 * Aggregated history entry
 */
export interface AggregatedHistoryEntry {
  timestamp: number;
  deviceId: number;
  property: string;
  value: number;
  count: number;
  min?: number;
  max?: number;
  avg?: number;
}

/**
 * History export format
 */
export interface HistoryExport {
  deviceId: number;
  deviceName?: string;
  property: string;
  from: number;
  to: number;
  entries: DeviceHistoryEntry[];
  stats?: HistoryStats;
}

/**
 * Scene execution record
 */
export interface SceneExecution {
  sceneId: number;
  sceneName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: "running" | "success" | "failure" | "timeout";
  error?: string;
  triggeredBy?: string;
}

/**
 * Scene performance statistics
 */
export interface ScenePerformanceStats {
  sceneId: number;
  sceneName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  lastExecution: number;
  lastStatus?: "success" | "failure" | "timeout";
}

/**
 * Scene history query parameters
 */
export interface SceneHistoryQueryParams {
  sceneId?: number;
  from?: number;
  to?: number;
  status?: "success" | "failure" | "timeout" | "running";
  limit?: number;
}
