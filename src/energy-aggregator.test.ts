import { describe, expect, it } from "vitest";
import {
  AggregationInterval,
  AggregatedDataPoint,
  RawDataPoint,
  DeviceStatsParams,
  MetricType,
  determineAggregationInterval,
  validateParams,
  groupIntoBuckets,
  aggregateAverage,
  aggregateEnergy,
  aggregateData,
  downsample,
  estimateResponseSize,
  aggregateDeviceStats,
  formatForResponse,
  AGGREGATION_INTERVALS,
  DEFAULT_MAX_POINTS,
} from "./energy-aggregator.js";

describe("determineAggregationInterval", () => {
  it("returns raw for spans <= 1 hour when auto", () => {
    expect(determineAggregationInterval(3600)).toBe("raw");
    expect(determineAggregationInterval(1800)).toBe("raw");
    expect(determineAggregationInterval(60)).toBe("raw");
  });

  it("returns 5min for spans <= 6 hours when auto", () => {
    expect(determineAggregationInterval(3601)).toBe("5min");
    expect(determineAggregationInterval(21600)).toBe("5min");
  });

  it("returns 15min for spans <= 24 hours when auto", () => {
    expect(determineAggregationInterval(21601)).toBe("15min");
    expect(determineAggregationInterval(86400)).toBe("15min");
  });

  it("returns 1hour for spans <= 7 days when auto", () => {
    expect(determineAggregationInterval(86401)).toBe("1hour");
    expect(determineAggregationInterval(604800)).toBe("1hour");
  });

  it("returns 6hour for spans > 7 days when auto", () => {
    expect(determineAggregationInterval(604801)).toBe("6hour");
    expect(determineAggregationInterval(2592000)).toBe("6hour"); // 30 days
  });

  it("respects explicit interval when provided", () => {
    expect(determineAggregationInterval(3600, "1hour")).toBe("1hour");
    expect(determineAggregationInterval(86400, "raw")).toBe("raw");
    expect(determineAggregationInterval(100, "6hour")).toBe("6hour");
  });

  it("treats auto same as undefined", () => {
    expect(determineAggregationInterval(3600, "auto")).toBe("raw");
    expect(determineAggregationInterval(86400, "auto")).toBe("15min");
  });
});

describe("validateParams", () => {
  const validParams: DeviceStatsParams = {
    device_id: 955,
    from: 1736294400,
    to: 1736380800,
  };

  it("accepts valid params", () => {
    const result = validateParams(validParams);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("sets default max_points", () => {
    const result = validateParams(validParams);
    expect(result.normalized.max_points).toBe(DEFAULT_MAX_POINTS);
  });

  it("preserves explicit max_points", () => {
    const result = validateParams({ ...validParams, max_points: 500 });
    expect(result.normalized.max_points).toBe(500);
  });

  it("rejects invalid device_id", () => {
    const result = validateParams({ ...validParams, device_id: -1 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("device_id must be a positive number");
  });

  it("rejects when from >= to", () => {
    const result = validateParams({ ...validParams, from: 1736380800, to: 1736294400 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("from timestamp must be less than to timestamp");
  });

  it("rejects invalid aggregation interval", () => {
    const result = validateParams({
      ...validParams,
      aggregation: "invalid" as AggregationInterval,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid aggregation interval"))).toBe(true);
  });

  it("accepts valid aggregation intervals", () => {
    const intervals: AggregationInterval[] = ["raw", "1min", "5min", "15min", "1hour", "6hour", "auto"];
    for (const interval of intervals) {
      const result = validateParams({ ...validParams, aggregation: interval });
      expect(result.valid).toBe(true);
    }
  });

  it("rejects invalid metrics", () => {
    const result = validateParams({
      ...validParams,
      metrics: ["power", "invalid" as MetricType],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("Invalid metric"))).toBe(true);
  });

  it("accepts valid metrics", () => {
    const result = validateParams({
      ...validParams,
      metrics: ["power", "energy", "voltage", "current"],
    });
    expect(result.valid).toBe(true);
  });

  it("rejects negative max_points", () => {
    const result = validateParams({ ...validParams, max_points: -100 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("max_points must be a positive number");
  });
});

describe("groupIntoBuckets", () => {
  const sampleData: RawDataPoint[] = [
    { timestamp: 1000, value: 100 },
    { timestamp: 1030, value: 110 },
    { timestamp: 1060, value: 120 },
    { timestamp: 1090, value: 130 },
    { timestamp: 1120, value: 140 },
    { timestamp: 1150, value: 150 },
  ];

  it("groups data into 60-second buckets", () => {
    const buckets = groupIntoBuckets(sampleData, 60, 1000, 1200);
    expect(buckets.size).toBe(3);

    const bucket960 = buckets.get(960); // floor(1000/60)*60 = 960
    expect(bucket960).toBeDefined();
    expect(bucket960).toHaveLength(2);

    const bucket1020 = buckets.get(1020);
    expect(bucket1020).toBeDefined();
    expect(bucket1020).toHaveLength(2);

    const bucket1080 = buckets.get(1080);
    expect(bucket1080).toBeDefined();
    expect(bucket1080).toHaveLength(2);
  });

  it("returns individual points for raw mode (intervalSeconds = 0)", () => {
    const buckets = groupIntoBuckets(sampleData, 0, 1000, 1200);
    expect(buckets.size).toBe(6);
    for (const [key, points] of buckets) {
      expect(points).toHaveLength(1);
    }
  });

  it("handles empty data", () => {
    const buckets = groupIntoBuckets([], 60, 1000, 2000);
    expect(buckets.size).toBe(0);
  });

  it("handles single data point", () => {
    const buckets = groupIntoBuckets([{ timestamp: 1000, value: 100 }], 60, 1000, 2000);
    expect(buckets.size).toBe(1);
  });

  it("filters out data points outside time range", () => {
    const data: RawDataPoint[] = [
      { timestamp: 500, value: 50 }, // Before range
      { timestamp: 1000, value: 100 }, // In range
      { timestamp: 2500, value: 250 }, // After range
    ];
    const buckets = groupIntoBuckets(data, 60, 900, 1100);
    expect(buckets.size).toBe(1);
  });
});

describe("aggregateAverage", () => {
  it("calculates correct statistics", () => {
    const points: RawDataPoint[] = [
      { timestamp: 1000, value: 100 },
      { timestamp: 1010, value: 200 },
      { timestamp: 1020, value: 150 },
    ];

    const result = aggregateAverage(points);
    expect(result.avg).toBe(150);
    expect(result.min).toBe(100);
    expect(result.max).toBe(200);
    expect(result.count).toBe(3);
    expect(result.timestamp).toBe(1000);
  });

  it("handles single point", () => {
    const points: RawDataPoint[] = [{ timestamp: 1000, value: 100 }];
    const result = aggregateAverage(points);
    expect(result.avg).toBe(100);
    expect(result.min).toBe(100);
    expect(result.max).toBe(100);
    expect(result.count).toBe(1);
  });

  it("throws on empty array", () => {
    expect(() => aggregateAverage([])).toThrow("Cannot aggregate empty array");
  });

  it("handles negative values", () => {
    const points: RawDataPoint[] = [
      { timestamp: 1000, value: -50 },
      { timestamp: 1010, value: 50 },
    ];
    const result = aggregateAverage(points);
    expect(result.avg).toBe(0);
    expect(result.min).toBe(-50);
    expect(result.max).toBe(50);
  });
});

describe("aggregateEnergy", () => {
  it("calculates energy delta correctly", () => {
    const points: RawDataPoint[] = [
      { timestamp: 1000, value: 100 },
      { timestamp: 1010, value: 105 },
      { timestamp: 1020, value: 110 },
    ];

    const result = aggregateEnergy(points);
    expect(result.sum).toBe(10); // 110 - 100
    expect(result.count).toBe(3);
  });

  it("handles unsorted data", () => {
    const points: RawDataPoint[] = [
      { timestamp: 1020, value: 110 },
      { timestamp: 1000, value: 100 },
      { timestamp: 1010, value: 105 },
    ];

    const result = aggregateEnergy(points);
    expect(result.sum).toBe(10);
  });

  it("handles counter reset (returns 0 for negative delta)", () => {
    const points: RawDataPoint[] = [
      { timestamp: 1000, value: 100 },
      { timestamp: 1010, value: 50 }, // Counter reset
    ];

    const result = aggregateEnergy(points);
    expect(result.sum).toBe(0);
  });

  it("throws on empty array", () => {
    expect(() => aggregateEnergy([])).toThrow("Cannot aggregate empty array");
  });
});

describe("aggregateData", () => {
  const sampleData: RawDataPoint[] = [
    { timestamp: 1000, value: 100 },
    { timestamp: 1030, value: 110 },
    { timestamp: 1060, value: 120 },
    { timestamp: 1090, value: 130 },
  ];

  it("aggregates power data using average", () => {
    const result = aggregateData(sampleData, "power", 60, 900, 1200);
    expect(result.length).toBeGreaterThan(0);
    // Check that avg is calculated correctly
    for (const point of result) {
      expect(point.avg).toBeDefined();
      expect(point.min).toBeDefined();
      expect(point.max).toBeDefined();
    }
  });

  it("aggregates energy data using sum/delta", () => {
    const result = aggregateData(sampleData, "energy", 60, 900, 1200);
    expect(result.length).toBeGreaterThan(0);
    for (const point of result) {
      expect(point.sum).toBeDefined();
    }
  });

  it("handles empty data", () => {
    const result = aggregateData([], "power", 60, 1000, 2000);
    expect(result).toHaveLength(0);
  });

  it("returns raw points when intervalSeconds is 0", () => {
    const result = aggregateData(sampleData, "power", 0, 900, 1200);
    expect(result.length).toBe(sampleData.length);
  });

  it("aggregates voltage using average", () => {
    const result = aggregateData(sampleData, "voltage", 120, 900, 1200);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].sum).toBeUndefined();
  });

  it("aggregates current using average", () => {
    const result = aggregateData(sampleData, "current", 120, 900, 1200);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].sum).toBeUndefined();
  });
});

describe("downsample", () => {
  it("returns original data if below max_points", () => {
    const data: AggregatedDataPoint[] = [
      { timestamp: 1000, avg: 100, min: 90, max: 110, count: 10 },
      { timestamp: 1060, avg: 105, min: 95, max: 115, count: 10 },
    ];
    const result = downsample(data, 10);
    expect(result).toEqual(data);
  });

  it("downsamples to max_points", () => {
    const data: AggregatedDataPoint[] = [];
    for (let i = 0; i < 100; i++) {
      data.push({
        timestamp: 1000 + i * 60,
        avg: 100 + Math.sin(i * 0.1) * 50,
        min: 80 + Math.sin(i * 0.1) * 40,
        max: 120 + Math.sin(i * 0.1) * 60,
        count: 10,
      });
    }

    const result = downsample(data, 20);
    expect(result.length).toBe(20);

    // First and last points should be preserved
    expect(result[0]).toEqual(data[0]);
    expect(result[result.length - 1]).toEqual(data[data.length - 1]);
  });

  it("handles edge case with maxPoints <= 2", () => {
    const data: AggregatedDataPoint[] = [
      { timestamp: 1000, avg: 100, min: 90, max: 110, count: 10 },
      { timestamp: 1060, avg: 105, min: 95, max: 115, count: 10 },
      { timestamp: 1120, avg: 110, min: 100, max: 120, count: 10 },
    ];
    const result = downsample(data, 2);
    expect(result).toEqual(data); // Returns original when maxPoints <= 2
  });

  it("preserves data order after downsampling", () => {
    const data: AggregatedDataPoint[] = [];
    for (let i = 0; i < 50; i++) {
      data.push({
        timestamp: 1000 + i * 60,
        avg: 100 + i,
        min: 90 + i,
        max: 110 + i,
        count: 10,
      });
    }

    const result = downsample(data, 10);

    // Verify timestamps are in order
    for (let i = 1; i < result.length; i++) {
      expect(result[i].timestamp).toBeGreaterThan(result[i - 1].timestamp);
    }
  });
});

describe("estimateResponseSize", () => {
  it("estimates size based on data points", () => {
    const response = {
      device_id: 955,
      device_name: "Test Device",
      time_range: { from: 1000, to: 2000, span_seconds: 1000 },
      aggregation: {
        method: "5min" as AggregationInterval,
        interval_seconds: 300,
        total_points: 100,
        raw_points_count: 1000,
      },
      metrics: [
        {
          metric: "power" as MetricType,
          unit: "W",
          data: new Array(100).fill({
            timestamp: 1000,
            avg: 100,
            min: 90,
            max: 110,
            count: 10,
          }),
        },
      ],
    };

    const size = estimateResponseSize(response);
    expect(size).toBeGreaterThan(500);
    expect(size).toBeLessThan(100000);
  });

  it("returns minimal size for empty response", () => {
    const response = {
      device_id: 955,
      time_range: { from: 1000, to: 2000, span_seconds: 1000 },
      aggregation: {
        method: "5min" as AggregationInterval,
        interval_seconds: 300,
        total_points: 0,
        raw_points_count: 0,
      },
      metrics: [],
    };

    const size = estimateResponseSize(response);
    expect(size).toBe(500); // Base overhead only
  });
});

describe("aggregateDeviceStats", () => {
  const baseParams: DeviceStatsParams = {
    device_id: 955,
    from: 1736294400,
    to: 1736298000, // 1 hour span
  };

  it("handles array format response", () => {
    const rawResponse = [
      { timestamp: 1736294400, power: 100 },
      { timestamp: 1736294460, power: 110 },
      { timestamp: 1736294520, power: 105 },
    ];

    const result = aggregateDeviceStats(rawResponse, {
      ...baseParams,
      metrics: ["power"],
    });

    expect(result.device_id).toBe(955);
    expect(result.time_range.span_seconds).toBe(3600);
  });

  it("handles object format response with metric arrays", () => {
    const rawResponse = {
      power: [
        { timestamp: 1736294400, value: 100 },
        { timestamp: 1736294460, value: 110 },
      ],
      energy: [
        { timestamp: 1736294400, value: 50 },
        { timestamp: 1736294460, value: 51 },
      ],
    };

    const result = aggregateDeviceStats(rawResponse, baseParams);

    expect(result.metrics.length).toBeGreaterThan(0);
  });

  it("handles [timestamp, value] tuple format", () => {
    const rawResponse = {
      power: [
        [1736294400, 100],
        [1736294460, 110],
        [1736294520, 105],
      ],
    };

    const result = aggregateDeviceStats(rawResponse, {
      ...baseParams,
      metrics: ["power"],
    });

    expect(result.metrics.length).toBe(1);
    expect(result.metrics[0].metric).toBe("power");
  });

  it("returns empty metrics for no data", () => {
    const result = aggregateDeviceStats({}, baseParams);

    expect(result.metrics).toHaveLength(0);
    expect(result.aggregation.warnings).toContain(
      "No data found for the specified time range and metrics",
    );
  });

  it("includes device_name when provided", () => {
    const rawResponse = {
      power: [[1736294400, 100]],
    };

    const result = aggregateDeviceStats(rawResponse, baseParams, "PC-desk");
    expect(result.device_name).toBe("PC-desk");
  });

  it("filters metrics based on params.metrics", () => {
    const rawResponse = {
      power: [[1736294400, 100]],
      energy: [[1736294400, 50]],
      voltage: [[1736294400, 230]],
    };

    const result = aggregateDeviceStats(rawResponse, {
      ...baseParams,
      metrics: ["power", "voltage"],
    });

    const metricNames = result.metrics.map((m) => m.metric);
    expect(metricNames).toContain("power");
    expect(metricNames).toContain("voltage");
    expect(metricNames).not.toContain("energy");
  });

  it("uses correct units for each metric", () => {
    const rawResponse = {
      power: [[1736294400, 100]],
      energy: [[1736294400, 50]],
      voltage: [[1736294400, 230]],
      current: [[1736294400, 0.5]],
    };

    const result = aggregateDeviceStats(rawResponse, baseParams);

    const powerMetric = result.metrics.find((m) => m.metric === "power");
    const energyMetric = result.metrics.find((m) => m.metric === "energy");
    const voltageMetric = result.metrics.find((m) => m.metric === "voltage");
    const currentMetric = result.metrics.find((m) => m.metric === "current");

    expect(powerMetric?.unit).toBe("W");
    expect(energyMetric?.unit).toBe("kWh");
    expect(voltageMetric?.unit).toBe("V");
    expect(currentMetric?.unit).toBe("A");
  });

  it("applies auto aggregation based on time span", () => {
    // 24 hour span should use 15min aggregation
    const params: DeviceStatsParams = {
      device_id: 955,
      from: 1736294400,
      to: 1736380800, // 24 hours later
    };

    const rawResponse = {
      power: new Array(1000).fill(0).map((_, i) => [
        params.from + i * 60,
        100 + Math.random() * 50,
      ]),
    };

    const result = aggregateDeviceStats(rawResponse, params);

    expect(result.aggregation.method).toBe("15min");
    expect(result.aggregation.interval_seconds).toBe(900);
  });

  it("respects explicit aggregation interval", () => {
    const rawResponse = {
      power: [[1736294400, 100]],
    };

    const result = aggregateDeviceStats(rawResponse, {
      ...baseParams,
      aggregation: "1hour",
    });

    expect(result.aggregation.method).toBe("1hour");
  });
});

describe("formatForResponse", () => {
  it("rounds values to reasonable precision", () => {
    const stats = {
      device_id: 955,
      device_name: "Test",
      time_range: { from: 1000, to: 2000, span_seconds: 1000 },
      aggregation: {
        method: "5min" as AggregationInterval,
        interval_seconds: 300,
        total_points: 1,
        raw_points_count: 10,
      },
      metrics: [
        {
          metric: "power" as MetricType,
          unit: "W",
          data: [
            {
              timestamp: 1000,
              avg: 100.123456789,
              min: 90.987654321,
              max: 110.111111111,
              count: 10,
              sum: 1.23456789,
            },
          ],
        },
      ],
    };

    const formatted = formatForResponse(stats);

    expect(formatted.metrics[0].data[0].avg).toBe(100.12);
    expect(formatted.metrics[0].data[0].min).toBe(90.99);
    expect(formatted.metrics[0].data[0].max).toBe(110.11);
    expect(formatted.metrics[0].data[0].sum).toBe(1.235);
  });

  it("preserves undefined sum", () => {
    const stats = {
      device_id: 955,
      time_range: { from: 1000, to: 2000, span_seconds: 1000 },
      aggregation: {
        method: "5min" as AggregationInterval,
        interval_seconds: 300,
        total_points: 1,
        raw_points_count: 10,
      },
      metrics: [
        {
          metric: "power" as MetricType,
          unit: "W",
          data: [
            {
              timestamp: 1000,
              avg: 100,
              min: 90,
              max: 110,
              count: 10,
            },
          ],
        },
      ],
    };

    const formatted = formatForResponse(stats);
    expect(formatted.metrics[0].data[0].sum).toBeUndefined();
  });
});

describe("AGGREGATION_INTERVALS constant", () => {
  it("has correct second values", () => {
    expect(AGGREGATION_INTERVALS["raw"]).toBe(0);
    expect(AGGREGATION_INTERVALS["1min"]).toBe(60);
    expect(AGGREGATION_INTERVALS["5min"]).toBe(300);
    expect(AGGREGATION_INTERVALS["15min"]).toBe(900);
    expect(AGGREGATION_INTERVALS["1hour"]).toBe(3600);
    expect(AGGREGATION_INTERVALS["6hour"]).toBe(21600);
  });
});

describe("edge cases", () => {
  it("handles data with gaps", () => {
    const dataWithGaps: RawDataPoint[] = [
      { timestamp: 1000, value: 100 },
      { timestamp: 1060, value: 110 },
      // Gap here
      { timestamp: 3000, value: 150 },
      { timestamp: 3060, value: 160 },
    ];

    const result = aggregateData(dataWithGaps, "power", 60, 900, 3200);

    // Should have buckets for both clusters of data
    expect(result.length).toBeGreaterThan(1);
  });

  it("handles very large values", () => {
    const largeValues: RawDataPoint[] = [
      { timestamp: 1000, value: 1e10 },
      { timestamp: 1060, value: 2e10 },
    ];

    const result = aggregateAverage(largeValues);
    expect(result.avg).toBe(1.5e10);
  });

  it("handles very small values", () => {
    const smallValues: RawDataPoint[] = [
      { timestamp: 1000, value: 0.0001 },
      { timestamp: 1060, value: 0.0002 },
    ];

    const result = aggregateAverage(smallValues);
    expect(result.avg).toBe(0.00015);
  });

  it("handles zero values", () => {
    const zeros: RawDataPoint[] = [
      { timestamp: 1000, value: 0 },
      { timestamp: 1060, value: 0 },
    ];

    const result = aggregateAverage(zeros);
    expect(result.avg).toBe(0);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
  });

  it("handles mixed positive and negative values", () => {
    const mixed: RawDataPoint[] = [
      { timestamp: 1000, value: -100 },
      { timestamp: 1060, value: 100 },
    ];

    const result = aggregateAverage(mixed);
    expect(result.avg).toBe(0);
    expect(result.min).toBe(-100);
    expect(result.max).toBe(100);
  });

  it("handles single data point across long time range", () => {
    const params: DeviceStatsParams = {
      device_id: 955,
      from: 1736294400,
      to: 1736380800, // 24 hours
    };

    const rawResponse = {
      power: [[1736294400, 100]],
    };

    const result = aggregateDeviceStats(rawResponse, params);

    expect(result.metrics[0].data.length).toBe(1);
  });

  it("handles data at exact time boundaries", () => {
    const data: RawDataPoint[] = [
      { timestamp: 0, value: 100 },
      { timestamp: 60, value: 110 },
      { timestamp: 120, value: 120 },
    ];

    const buckets = groupIntoBuckets(data, 60, 0, 180);
    expect(buckets.size).toBe(3);
  });

  it("handles various Fibaro API response field names", () => {
    // Test different field name variations
    const variations = [
      { power: [{ timestamp: 1000, value: 100 }] },
      { power: [{ time: 1000, v: 100 }] },
      { power: [{ ts: 1000, reading: 100 }] },
      { power: [{ t: 1000, avg: 100 }] },
    ];

    for (const rawResponse of variations) {
      const result = aggregateDeviceStats(rawResponse, {
        device_id: 1,
        from: 900,
        to: 1100,
        metrics: ["power"],
      });

      expect(result.metrics.length).toBe(1);
      expect(result.metrics[0].data.length).toBeGreaterThan(0);
    }
  });

  it("filters out null and undefined values in raw data", () => {
    const rawResponse = {
      power: [
        { timestamp: 1000, value: 100 },
        null,
        undefined,
        { timestamp: 1060, value: 110 },
      ],
    };

    const result = aggregateDeviceStats(rawResponse, {
      device_id: 1,
      from: 900,
      to: 1200,
      metrics: ["power"],
    });

    expect(result.metrics[0].data.length).toBeGreaterThan(0);
  });

  it("filters out NaN values", () => {
    const rawResponse = {
      power: [
        { timestamp: 1000, value: 100 },
        { timestamp: 1060, value: NaN },
        { timestamp: 1120, value: 120 },
      ],
    };

    const result = aggregateDeviceStats(rawResponse, {
      device_id: 1,
      from: 900,
      to: 1200,
      metrics: ["power"],
    });

    // Should have data from valid points only
    expect(result.metrics.length).toBe(1);
  });
});

describe("performance with large datasets", () => {
  it("handles 100k data points efficiently", () => {
    const largeData: RawDataPoint[] = [];
    for (let i = 0; i < 100000; i++) {
      largeData.push({
        timestamp: 1736294400 + i,
        value: 100 + Math.sin(i * 0.01) * 50,
      });
    }

    const start = Date.now();
    const result = aggregateData(largeData, "power", 3600, 1736294400, 1736394400);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    expect(result.length).toBeLessThan(30); // ~28 hours of data with 1-hour buckets
  });

  it("downsamples large aggregated data efficiently", () => {
    const largeAggregated: AggregatedDataPoint[] = [];
    for (let i = 0; i < 10000; i++) {
      largeAggregated.push({
        timestamp: 1000 + i * 60,
        avg: 100 + Math.sin(i * 0.01) * 50,
        min: 80 + Math.sin(i * 0.01) * 40,
        max: 120 + Math.sin(i * 0.01) * 60,
        count: 10,
      });
    }

    const start = Date.now();
    const result = downsample(largeAggregated, 1000);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // Should be very fast
    expect(result.length).toBe(1000);
  });
});

describe("backward compatibility", () => {
  it("works with minimal params (existing API contract)", () => {
    const rawResponse = {
      power: [[1736294400, 100]],
    };

    // Should work with just device_id, from, to
    const result = aggregateDeviceStats(rawResponse, {
      device_id: 955,
      from: 1736294400,
      to: 1736298000,
    });

    expect(result.device_id).toBe(955);
    expect(result.metrics.length).toBeGreaterThan(0);
  });
});
