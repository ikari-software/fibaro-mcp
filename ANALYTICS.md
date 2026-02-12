# Analytics and Insights Guide

The Analytics Engine provides deep insights into your Fibaro smart home system by analyzing device usage patterns, energy consumption, scene performance, and system health.

## Overview

The analytics system offers:
- **Device Usage Analysis** - Understand how devices are used throughout the day
- **Energy Trends** - Track power consumption by room, device type, and time period
- **Scene Performance** - Monitor scene execution success rates and timing
- **System Health** - Get an overall health score with actionable recommendations
- **Dashboard** - Comprehensive overview combining all metrics

## Using Analytics

### Quick Start

Get a comprehensive dashboard of your system:

```
fibaro_analytics operation=dashboard
```

Or access it as a resource:

```
Read resource: fibaro://analytics/dashboard
```

### Device Usage Analysis

Analyze how your devices are being used:

```
fibaro_analytics operation=device_usage days=30
```

Returns for each device:
- `activations` - Total number of times activated
- `avgDailyActivations` - Average activations per day
- `peakHour` - Hour of day with most activity (0-23)
- `peakDay` - Day of week with most activity (0=Sunday)
- `lastUsed` - Timestamp of last activation

**Example output:**
```json
{
  "deviceId": 42,
  "deviceName": "Living Room Light",
  "activations": 450,
  "avgDailyActivations": 15,
  "peakHour": 19,
  "peakDay": 6,
  "lastUsed": 1704067200000
}
```

### Energy Trends

Track energy consumption patterns:

```
fibaro_analytics operation=energy_trends days=7
```

Analyzes:
- Total energy consumption (kWh)
- Consumption by room
- Consumption by device type
- Hourly usage patterns
- Cost estimates (if configured)

**Filter by room:**
```
fibaro_analytics operation=energy_trends days=7 room_id=5
```

### Scene Frequency Analysis

Monitor how often scenes run and their success rates:

```
fibaro_analytics operation=scene_frequency days=30
```

Returns for each scene:
- `executions` - Total execution count
- `successRate` - Percentage of successful runs (0-100)
- `avgDuration` - Average execution time in milliseconds
- `lastRun` - Timestamp of last execution
- `failures` - Number of failed executions

### System Health Check

Get an overall health assessment:

```
fibaro_analytics operation=system_health
```

Returns a health score (0-100) based on:
- Dead or unresponsive devices
- Failed scene executions
- Error rate trends
- Device communication issues

**Health score interpretation:**
| Score | Status | Meaning |
|-------|--------|---------|
| 90-100 | Excellent | System running optimally |
| 70-89 | Good | Minor issues, system functional |
| 50-69 | Fair | Several issues need attention |
| 0-49 | Poor | Critical issues require immediate action |

### Hourly Distribution

See when your home is most active:

```
fibaro_analytics operation=hourly_distribution days=7
```

Returns activity counts for each hour (0-23), useful for:
- Identifying peak usage times
- Optimizing automation schedules
- Understanding daily patterns

### Room Activity Summary

Compare activity across rooms:

```
fibaro_analytics operation=room_activity days=7
```

For each room:
- Device count
- Total activations
- Most active device
- Energy consumption (if available)

## Dashboard Resource

The analytics dashboard is available as an MCP resource:

```
fibaro://analytics/dashboard
```

This provides a formatted overview including:
- System health score and status
- Device statistics
- Energy summary
- Top active devices
- Recent scene performance
- Recommendations

## Time Ranges

All analytics operations support a `days` parameter:

| Value | Description |
|-------|-------------|
| 1 | Last 24 hours |
| 7 | Last week (default) |
| 30 | Last month |
| 90 | Last quarter |
| 365 | Last year |

**Custom date ranges** are also supported:

```
fibaro_analytics operation=device_usage from=1704067200000 to=1704672000000
```

## Filtering

### By Room

Limit analysis to specific room(s):

```
fibaro_analytics operation=energy_trends room_id=5
fibaro_analytics operation=device_usage room_ids=[5, 7, 12]
```

### By Device Type

Focus on specific device types:

```
fibaro_analytics operation=device_usage device_type=com.fibaro.binarySwitch
```

### By Device

Analyze a specific device:

```
fibaro_analytics operation=device_usage device_id=42
```

## Use Cases

### Optimize Automation Timing

Use hourly distribution to find the best times for automations:

```
fibaro_analytics operation=hourly_distribution days=30
```

If activity peaks at 7 AM and 6 PM, schedule morning routines and evening scenes accordingly.

### Identify Energy Hogs

Find devices consuming the most power:

```
fibaro_analytics operation=energy_trends days=30
```

Look at consumption by device type to identify optimization opportunities.

### Monitor Scene Reliability

Track scene performance to catch issues early:

```
fibaro_analytics operation=scene_frequency days=7
```

Investigate any scenes with success rates below 95%.

### Detect Unused Devices

Find devices that may have stopped working:

```
fibaro_analytics operation=device_usage days=30
```

Look for devices with zero activations that should be active.

### Weekly Health Check

Run a comprehensive check:

```
fibaro_analytics operation=system_health
```

Address any warnings or errors in the recommendations.

## API Reference

### fibaro_analytics

| Operation | Description |
|-----------|-------------|
| `dashboard` | Comprehensive overview of all metrics |
| `device_usage` | Device activation patterns and statistics |
| `energy_trends` | Energy consumption analysis |
| `scene_frequency` | Scene execution statistics |
| `system_health` | Overall system health score |
| `hourly_distribution` | Activity by hour of day |
| `room_activity` | Activity summary by room |

### Common Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `days` | number | Analysis period (default: 7) |
| `from` | number | Start timestamp (milliseconds) |
| `to` | number | End timestamp (milliseconds) |
| `room_id` | number | Filter by room |
| `device_id` | number | Filter by device |
| `device_type` | string | Filter by device type |

## Performance Notes

- Analytics queries scan the Fibaro event log
- Large time ranges (90+ days) may take longer
- Consider caching dashboard results for frequent access
- The system health check is lightweight and can run frequently

## Related

- [Device History](FEATURES.md#device-history) - Raw historical data access
- [Scene History](FEATURES.md#scene-history) - Detailed scene execution logs
- [Energy Aggregation](FEATURES.md#energy-aggregation) - Power consumption calculations
