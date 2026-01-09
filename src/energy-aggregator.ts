/**
 * Fibaro MCP Server - Energy Stats Aggregation Module
 *
 * Provides intelligent data aggregation/sampling for energy statistics
 * to handle large datasets from Fibaro's high-granularity logging.
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

/**
 * Supported aggregation intervals
 */
export type AggregationInterval = "1min" | "5min" | "15min" | "1hour" | "6hour" | "raw" | "auto";

/**
 * Supported metric types for energy data
 */
export type MetricType = "power" | "energy" | "voltage" | "current";

/**
 * Raw data point from Fibaro API
 */
export interface RawDataPoint {
  timestamp: number;
  value: number;
}

/**
 * Aggregated data point with min/max/avg statistics
 */
export interface AggregatedDataPoint {
  timestamp: number;
  avg: number;
  min: number;
  max: number;
  count: number;
  sum?: number; // For energy metrics that need total
}

/**
 * Parameters for the device stats aggregation
 */
export interface DeviceStatsParams {
  device_id: number;
  from: number;
  to: number;
  aggregation?: AggregationInterval;
  max_points?: number;
  metrics?: MetricType[];
}

/**
 * Metadata about the aggregation performed
 */
export interface AggregationMetadata {
  method: AggregationInterval;
  interval_seconds: number;
  total_points: number;
  raw_points_count: number;
  downsampled?: boolean;
  warnings?: string[];
}

/**
 * Aggregated metric data for a single metric type
 */
export interface MetricData {
  metric: MetricType;
  unit: string;
  data: AggregatedDataPoint[];
}

/**
 * Complete response structure for aggregated device stats
 */
export interface AggregatedDeviceStats {
  device_id: number;
  device_name?: string;
  time_range: {
    from: number;
    to: number;
    span_seconds: number;
  };
  aggregation: AggregationMetadata;
  metrics: MetricData[];
}

/**
 * Maps aggregation interval to seconds
 */
export const AGGREGATION_INTERVALS: Record<Exclude<AggregationInterval, "auto">, number> = {
  raw: 0,
  "1min": 60,
  "5min": 300,
  "15min": 900,
  "1hour": 3600,
  "6hour": 21600,
};

/**
 * Time span thresholds for auto-aggregation (in seconds)
 */
const AUTO_AGGREGATION_THRESHOLDS: Array<{ maxSpan: number; interval: AggregationInterval }> = [
  { maxSpan: 3600, interval: "raw" }, // <= 1 hour: raw data
  { maxSpan: 21600, interval: "5min" }, // <= 6 hours: 5min aggregation
  { maxSpan: 86400, interval: "15min" }, // <= 24 hours: 15min aggregation
  { maxSpan: 604800, interval: "1hour" }, // <= 7 days: 1hour aggregation
  { maxSpan: Infinity, interval: "6hour" }, // > 7 days: 6hour aggregation
];

/**
 * Unit mappings for metric types
 */
const METRIC_UNITS: Record<MetricType, string> = {
  power: "W",
  energy: "kWh",
  voltage: "V",
  current: "A",
};

/**
 * Default max points if not specified
 */
export const DEFAULT_MAX_POINTS = 1000;

/**
 * MCP response size limit (slightly under 1MB to be safe)
 */
export const MAX_RESPONSE_SIZE_BYTES = 900000;

/**
 * Determines the appropriate aggregation interval based on time span
 */
export function determineAggregationInterval(
  spanSeconds: number,
  requestedInterval?: AggregationInterval,
): AggregationInterval {
  if (requestedInterval && requestedInterval !== "auto") {
    return requestedInterval;
  }

  for (const threshold of AUTO_AGGREGATION_THRESHOLDS) {
    if (spanSeconds <= threshold.maxSpan) {
      return threshold.interval;
    }
  }

  return "6hour";
}

/**
 * Validates and normalizes the parameters for device stats
 */
export function validateParams(params: DeviceStatsParams): {
  valid: boolean;
  errors: string[];
  normalized: DeviceStatsParams;
} {
  const errors: string[] = [];
  const normalized = { ...params };

  if (typeof params.device_id !== "number" || params.device_id <= 0) {
    errors.push("device_id must be a positive number");
  }

  if (typeof params.from !== "number") {
    errors.push("from timestamp is required");
  }

  if (typeof params.to !== "number") {
    errors.push("to timestamp is required");
  }

  if (params.from >= params.to) {
    errors.push("from timestamp must be less than to timestamp");
  }

  // Normalize max_points
  if (params.max_points !== undefined) {
    if (typeof params.max_points !== "number" || params.max_points <= 0) {
      errors.push("max_points must be a positive number");
    }
  } else {
    normalized.max_points = DEFAULT_MAX_POINTS;
  }

  // Validate aggregation interval
  if (params.aggregation !== undefined) {
    const validIntervals: AggregationInterval[] = [
      "1min",
      "5min",
      "15min",
      "1hour",
      "6hour",
      "raw",
      "auto",
    ];
    if (!validIntervals.includes(params.aggregation)) {
      errors.push(
        `Invalid aggregation interval: ${params.aggregation}. Valid values: ${validIntervals.join(", ")}`,
      );
    }
  }

  // Validate metrics
  if (params.metrics !== undefined) {
    const validMetrics: MetricType[] = ["power", "energy", "voltage", "current"];
    for (const metric of params.metrics) {
      if (!validMetrics.includes(metric)) {
        errors.push(`Invalid metric: ${metric}. Valid values: ${validMetrics.join(", ")}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized,
  };
}

/**
 * Groups raw data points into time buckets based on the aggregation interval
 */
export function groupIntoBuckets(
  data: RawDataPoint[],
  intervalSeconds: number,
  from: number,
  to: number,
): Map<number, RawDataPoint[]> {
  const buckets = new Map<number, RawDataPoint[]>();

  if (intervalSeconds <= 0) {
    // Raw mode - each point is its own bucket
    for (const point of data) {
      buckets.set(point.timestamp, [point]);
    }
    return buckets;
  }

  for (const point of data) {
    // Calculate bucket start time
    const bucketStart = Math.floor(point.timestamp / intervalSeconds) * intervalSeconds;

    // Skip points outside our time range
    if (bucketStart < from - intervalSeconds || bucketStart > to) {
      continue;
    }

    if (!buckets.has(bucketStart)) {
      buckets.set(bucketStart, []);
    }
    buckets.get(bucketStart)!.push(point);
  }

  return buckets;
}

/**
 * Aggregates data points within a bucket using average
 * Used for: power, voltage, current
 */
export function aggregateAverage(points: RawDataPoint[]): AggregatedDataPoint {
  if (points.length === 0) {
    throw new Error("Cannot aggregate empty array");
  }

  const values = points.map((p) => p.value);
  const sum = values.reduce((a, b) => a + b, 0);

  return {
    timestamp: points[0].timestamp,
    avg: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    count: points.length,
  };
}

/**
 * Aggregates data points for energy metric (cumulative)
 * Returns the difference between first and last reading
 */
export function aggregateEnergy(points: RawDataPoint[]): AggregatedDataPoint {
  if (points.length === 0) {
    throw new Error("Cannot aggregate empty array");
  }

  // Sort by timestamp to ensure correct order
  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const values = sorted.map((p) => p.value);

  // Energy is cumulative, so we want the increase over the period
  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;

  return {
    timestamp: sorted[0].timestamp,
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    count: points.length,
    sum: delta >= 0 ? delta : 0, // Handle counter resets
  };
}

/**
 * Aggregates raw data points based on metric type and interval
 */
export function aggregateData(
  data: RawDataPoint[],
  metric: MetricType,
  intervalSeconds: number,
  from: number,
  to: number,
): AggregatedDataPoint[] {
  if (data.length === 0) {
    return [];
  }

  const buckets = groupIntoBuckets(data, intervalSeconds, from, to);

  const aggregated: AggregatedDataPoint[] = [];
  const bucketTimes = Array.from(buckets.keys()).sort((a, b) => a - b);

  for (const bucketTime of bucketTimes) {
    const points = buckets.get(bucketTime)!;
    if (points.length === 0) continue;

    // Update timestamp to bucket start
    const adjustedPoints = points.map((p) => ({
      ...p,
      timestamp: bucketTime,
    }));

    if (metric === "energy") {
      aggregated.push(aggregateEnergy(adjustedPoints));
    } else {
      aggregated.push(aggregateAverage(adjustedPoints));
    }
  }

  return aggregated;
}

/**
 * Downsamples aggregated data if it exceeds max_points
 * Uses LTTB (Largest Triangle Three Buckets) inspired approach
 */
export function downsample(data: AggregatedDataPoint[], maxPoints: number): AggregatedDataPoint[] {
  if (data.length <= maxPoints || maxPoints <= 2) {
    return data;
  }

  const result: AggregatedDataPoint[] = [];

  // Always keep first point
  result.push(data[0]);

  // Calculate bucket size for middle points
  const middlePoints = maxPoints - 2;
  const bucketSize = (data.length - 2) / middlePoints;

  for (let i = 0; i < middlePoints; i++) {
    const bucketStart = Math.floor(1 + i * bucketSize);
    const bucketEnd = Math.floor(1 + (i + 1) * bucketSize);

    // Find point with maximum deviation (simplified LTTB)
    let maxArea = -1;
    let maxIndex = bucketStart;

    const prevPoint = result[result.length - 1];
    const nextBucketStart = Math.min(bucketEnd, data.length - 1);

    for (let j = bucketStart; j < bucketEnd && j < data.length - 1; j++) {
      const point = data[j];
      const nextPoint = data[nextBucketStart];

      // Calculate triangle area
      const area = Math.abs(
        (prevPoint.timestamp - nextPoint.timestamp) * (point.avg - prevPoint.avg) -
          (prevPoint.timestamp - point.timestamp) * (nextPoint.avg - prevPoint.avg),
      );

      if (area > maxArea) {
        maxArea = area;
        maxIndex = j;
      }
    }

    result.push(data[maxIndex]);
  }

  // Always keep last point
  result.push(data[data.length - 1]);

  return result;
}

/**
 * Estimates the JSON size of the response
 */
export function estimateResponseSize(response: AggregatedDeviceStats): number {
  // Rough estimation: each data point is ~100-150 bytes in JSON
  const dataPointCount = response.metrics.reduce((sum, m) => sum + m.data.length, 0);
  const baseSize = 500; // Metadata overhead
  return baseSize + dataPointCount * 150;
}

/**
 * Progressively increases aggregation level until response fits in size limit
 */
export function ensureResponseFits(
  rawData: Map<MetricType, RawDataPoint[]>,
  params: DeviceStatsParams,
  deviceName?: string,
): AggregatedDeviceStats {
  const spanSeconds = params.to - params.from;
  const maxPoints = params.max_points || DEFAULT_MAX_POINTS;
  const warnings: string[] = [];

  // Determine initial aggregation interval
  let currentInterval = determineAggregationInterval(spanSeconds, params.aggregation);
  let intervalSeconds = AGGREGATION_INTERVALS[currentInterval === "auto" ? "raw" : currentInterval];

  // List of progressively larger intervals
  const intervalProgression: AggregationInterval[] = [
    "raw",
    "1min",
    "5min",
    "15min",
    "1hour",
    "6hour",
  ];
  let currentIntervalIndex = intervalProgression.indexOf(currentInterval);
  if (currentIntervalIndex === -1) currentIntervalIndex = 0;

  let response: AggregatedDeviceStats;
  let attempts = 0;
  const maxAttempts = intervalProgression.length;

  do {
    const metrics: MetricData[] = [];
    let totalRawPoints = 0;

    for (const [metric, data] of rawData) {
      totalRawPoints += data.length;

      let aggregated = aggregateData(data, metric, intervalSeconds, params.from, params.to);

      // Apply downsampling if needed
      if (aggregated.length > maxPoints) {
        aggregated = downsample(aggregated, maxPoints);
      }

      metrics.push({
        metric,
        unit: METRIC_UNITS[metric],
        data: aggregated,
      });
    }

    response = {
      device_id: params.device_id,
      device_name: deviceName,
      time_range: {
        from: params.from,
        to: params.to,
        span_seconds: spanSeconds,
      },
      aggregation: {
        method: currentInterval,
        interval_seconds: intervalSeconds,
        total_points: metrics.reduce((sum, m) => sum + m.data.length, 0),
        raw_points_count: totalRawPoints,
        downsampled: metrics.some(
          (m) => m.data.length < (rawData.get(m.metric)?.length || 0) && intervalSeconds === 0,
        ),
        warnings: warnings.length > 0 ? warnings : undefined,
      },
      metrics,
    };

    const estimatedSize = estimateResponseSize(response);

    if (estimatedSize <= MAX_RESPONSE_SIZE_BYTES) {
      break;
    }

    // Try next aggregation level
    currentIntervalIndex++;
    attempts++;

    if (currentIntervalIndex < intervalProgression.length) {
      currentInterval = intervalProgression[currentIntervalIndex];
      intervalSeconds = AGGREGATION_INTERVALS[currentInterval];
      warnings.push(
        `Response size exceeded limit, increased aggregation to ${currentInterval}`,
      );
    }
  } while (attempts < maxAttempts);

  return response;
}

/**
 * Main aggregation function that processes raw Fibaro API data
 */
export function aggregateDeviceStats(
  rawApiResponse: any,
  params: DeviceStatsParams,
  deviceName?: string,
): AggregatedDeviceStats {
  // Parse raw API response into metric-specific data
  const rawData = new Map<MetricType, RawDataPoint[]>();
  const requestedMetrics = params.metrics || (["power", "energy", "voltage", "current"] as MetricType[]);

  // Fibaro API returns data in various formats, handle common cases
  if (Array.isArray(rawApiResponse)) {
    // Simple array of {timestamp, value} or similar
    for (const metric of requestedMetrics) {
      const metricData = extractMetricData(rawApiResponse, metric);
      if (metricData.length > 0) {
        rawData.set(metric, metricData);
      }
    }
  } else if (typeof rawApiResponse === "object" && rawApiResponse !== null) {
    // Object with metric-specific arrays
    for (const metric of requestedMetrics) {
      const data = rawApiResponse[metric] || rawApiResponse[`${metric}Data`] || [];
      const metricData = extractMetricData(data, metric);
      if (metricData.length > 0) {
        rawData.set(metric, metricData);
      }
    }
  }

  // If no data found, return empty result
  if (rawData.size === 0) {
    const spanSeconds = params.to - params.from;
    const interval = determineAggregationInterval(spanSeconds, params.aggregation);
    return {
      device_id: params.device_id,
      device_name: deviceName,
      time_range: {
        from: params.from,
        to: params.to,
        span_seconds: spanSeconds,
      },
      aggregation: {
        method: interval,
        interval_seconds: AGGREGATION_INTERVALS[interval === "auto" ? "raw" : interval],
        total_points: 0,
        raw_points_count: 0,
        warnings: ["No data found for the specified time range and metrics"],
      },
      metrics: [],
    };
  }

  return ensureResponseFits(rawData, params, deviceName);
}

/**
 * Extracts metric data from various Fibaro API response formats
 */
function extractMetricData(data: any[], metric: MetricType): RawDataPoint[] {
  if (!Array.isArray(data)) return [];

  const result: RawDataPoint[] = [];

  for (const item of data) {
    if (item === null || item === undefined) continue;

    let timestamp: number | undefined;
    let value: number | undefined;

    // Handle different data formats
    if (Array.isArray(item) && item.length >= 2) {
      // [timestamp, value] format
      timestamp = item[0];
      value = item[1];
    } else if (typeof item === "object") {
      // Object format with various possible field names
      timestamp =
        item.timestamp || item.time || item.t || item.ts || item.date;
      value =
        item.value ??
        item.v ??
        item[metric] ??
        item[`${metric}Value`] ??
        item.avg ??
        item.reading;
    }

    if (typeof timestamp === "number" && typeof value === "number" && !isNaN(value)) {
      result.push({ timestamp, value });
    }
  }

  // Sort by timestamp
  result.sort((a, b) => a.timestamp - b.timestamp);

  return result;
}

/**
 * Formats the aggregated stats for display/response
 * Rounds numbers to reasonable precision
 */
export function formatForResponse(stats: AggregatedDeviceStats): AggregatedDeviceStats {
  return {
    ...stats,
    metrics: stats.metrics.map((metric) => ({
      ...metric,
      data: metric.data.map((point) => ({
        ...point,
        avg: Math.round(point.avg * 100) / 100,
        min: Math.round(point.min * 100) / 100,
        max: Math.round(point.max * 100) / 100,
        sum: point.sum !== undefined ? Math.round(point.sum * 1000) / 1000 : undefined,
      })),
    })),
  };
}
