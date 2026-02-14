# Fibaro MCP Server - AI Assistant Guidelines

This file provides instructions for AI assistants (like Claude) when using the Fibaro MCP tools.

## Critical: Avoid Large List Operations

**NEVER** start by listing all devices, scenes, or rooms without filters. These operations can return over 1MB of data and waste context window.

### Bad Patterns (Avoid)
```
fibaro_device operation=list          # Lists ALL devices - can be 1MB+
fibaro_scene operation=list           # Lists ALL scenes
fibaro://devices                      # Resource with all device states
```

### Good Patterns (Use These)
```
# Get specific device by name
fibaro_device operation=get name="Kitchen Light"

# Filter devices by room
fibaro_device operation=list room_id=5

# Get specific scene
fibaro_scene operation=get name="Good Night"

# Use analytics for overview
fibaro_analytics operation=system_health
fibaro_analytics operation=dashboard
```

## Name-Based Lookups

All tools support looking up items by name - you rarely need IDs:

```
# Control device by name
fibaro_device operation=control name="Living Room Lamp" action=turnOn

# Run scene by name
fibaro_scene operation=run name="Morning Routine"

# Get variable by name
fibaro_variable operation=get name=HomeMode
```

## Efficient Information Gathering

1. **For system overview**: Use `fibaro_analytics operation=dashboard`
2. **For health check**: Use `fibaro_analytics operation=system_health`
3. **For specific device**: Use `fibaro_device operation=get name="..."`
4. **For room devices**: Use `fibaro_device operation=list room_id=X`

## Getting Energy/Power Data

For aggregated power consumption:

```
# Historical power/energy data from HC2 summary-graph API (RECOMMENDED)
# For devices:
fibaro_home op=energy_graph from=1767943794 to=1767947394 device_id=955
fibaro_home op=energy_graph from=1767943794 to=1767947394 device_id=955 property=energy

# For rooms:
fibaro_home op=energy_graph from=1767943794 to=1767947394 grouping=rooms room_id=226

# Device stats with auto-aggregation
fibaro_home op=device_stats device_id=42 from=1704067200 to=1704153600

# Energy trends analysis (by room, device type)
fibaro_analytics operation=energy_trends days=7

# For a specific room's energy
fibaro_analytics operation=energy_trends days=7 room_id=5
```

**Recommended**: Use `fibaro_home op=energy_graph` for historical power/energy data. It uses the native HC2 summary-graph API which provides accurate aggregated data for both devices and rooms.

The `fibaro_home op=device_stats` automatically aggregates based on time span:
- ≤1 hour: raw data
- ≤6 hours: 5-minute buckets
- ≤24 hours: 15-minute buckets
- ≤7 days: 1-hour buckets
- >7 days: 6-hour buckets

## Tool Summary

| Tool | Use For |
|------|---------|
| `fibaro_device` | Device control and info |
| `fibaro_scene` | Scene management |
| `fibaro_variable` | Global variables |
| `fibaro_home` | System info, weather, energy_graph, device_stats |
| `fibaro_analytics` | System insights, energy trends |
| `fibaro_template` | Scene templates |
| `fibaro_automation` | Create automations |
| `fibaro_bulk` | Bulk device operations |
| `fibaro_history` | Device state history |
| `fibaro_backup` | System backup/restore |
| `fibaro_repl` | Lua code testing |

## When User Asks "Show Me All..."

If the user asks to see all devices/scenes/rooms, explain that listing everything uses significant context and offer alternatives:

1. Filter by room or type
2. Search by name pattern
3. Use the analytics dashboard for an overview
4. Ask which specific items they need
