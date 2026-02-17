# Automation Builder Guide

The Automation Builder provides a powerful, code-free way to create complex Fibaro automations using a structured JSON format. It generates valid Fibaro Lua code that uses proper API calls.

## Overview

The automation system supports:
- **Multi-condition triggers** with AND/OR logic
- **Device state conditions** using `fibaro.getValue()`
- **Time-based conditions** including sunrise/sunset
- **Variable conditions** using `fibaro.getGlobalVariable()`
- **Chained actions** with delays
- **Validation** before deployment

## Creating an Automation

### Basic Structure

An automation consists of:
1. **Name and description** - Identifies the automation
2. **Conditions** - When to trigger (AND/OR groups)
3. **Actions** - What to do when triggered

```
fibaro_automation op=create automation={
  "name": "Evening Lights",
  "description": "Turn on lights at sunset",
  "conditions": {...},
  "actions": [...]
}
```

### Example: Motion-Activated Light

```json
{
  "name": "Hallway Motion Light",
  "description": "Turn on hallway light when motion detected, off after 2 minutes",
  "conditions": {
    "operator": "AND",
    "conditions": [
      {
        "type": "device_state",
        "deviceId": 42,
        "property": "value",
        "operator": "==",
        "value": true
      }
    ]
  },
  "actions": [
    {
      "type": "device_action",
      "deviceId": 15,
      "action": "turnOn"
    },
    {
      "type": "delay",
      "delay": 120000
    },
    {
      "type": "device_action",
      "deviceId": 15,
      "action": "turnOff"
    }
  ]
}
```

## Conditions

### Condition Groups

Conditions can be grouped with logical operators:

```json
{
  "operator": "AND",
  "conditions": [
    { "type": "device_state", ... },
    { "type": "time", ... }
  ]
}
```

| Operator | Description |
|----------|-------------|
| `AND` | All conditions must be true |
| `OR` | Any condition can be true |

### Nested Groups

Groups can be nested for complex logic:

```json
{
  "operator": "AND",
  "conditions": [
    {
      "operator": "OR",
      "conditions": [
        { "type": "device_state", "deviceId": 1, "property": "value", "operator": "==", "value": true },
        { "type": "device_state", "deviceId": 2, "property": "value", "operator": "==", "value": true }
      ]
    },
    { "type": "time", "operator": "between", "start": "18:00", "end": "23:00" }
  ]
}
```

This translates to: `(device1 OR device2) AND evening_time`

### Condition Types

#### device_state

Check a device property value using `fibaro.getValue()`:

```json
{
  "type": "device_state",
  "deviceId": 42,
  "property": "value",
  "operator": "==",
  "value": true
}
```

**Operators:** `==`, `!=`, `>`, `<`, `>=`, `<=`

**Common properties:**
| Property | Description | Example Values |
|----------|-------------|----------------|
| `value` | Primary value (on/off, level) | `true`, `false`, `0-100` |
| `dead` | Device unreachable | `true`, `false` |
| `armed` | Sensor armed state | `true`, `false` |
| `batteryLevel` | Battery percentage | `0-100` |

**Generated Lua:**
```lua
fibaro.getValue(42, "value") == true
```

#### variable

Check a global variable using `fibaro.getGlobalVariable()`:

```json
{
  "type": "variable",
  "variableName": "HomeMode",
  "operator": "==",
  "value": "home"
}
```

**Generated Lua:**
```lua
fibaro.getGlobalVariable("HomeMode") == "home"
```

#### time

Check current time:

```json
{
  "type": "time",
  "operator": "between",
  "start": "22:00",
  "end": "06:00"
}
```

**Operators:**
| Operator | Description | Parameters |
|----------|-------------|------------|
| `after` | After specified time | `time` |
| `before` | Before specified time | `time` |
| `between` | Between two times | `start`, `end` |

**Time format:** `HH:MM` (24-hour)

**Generated Lua:**
```lua
local hour = os.date("*t").hour
local minute = os.date("*t").min
local currentMinutes = hour * 60 + minute
currentMinutes >= 22 * 60 or currentMinutes < 6 * 60
```

#### sun_position

Trigger based on sunrise/sunset:

```json
{
  "type": "sun_position",
  "position": "sunset",
  "offset": -30
}
```

**Parameters:**
| Name | Description |
|------|-------------|
| `position` | `sunrise` or `sunset` |
| `offset` | Minutes before (negative) or after (positive) |

**Generated Lua:**
```lua
fibaro.getValue(1, "sunsetHour") -- Uses Fibaro's built-in sun calculations
```

#### custom

For advanced users, inject custom Lua conditions:

```json
{
  "type": "custom",
  "lua": "fibaro.getValue(42, 'power') > 100"
}
```

## Actions

Actions are executed in sequence. Each action type generates proper Fibaro API calls.

### device_action

Execute a device action using `fibaro.call()`:

```json
{
  "type": "device_action",
  "deviceId": 15,
  "action": "turnOn"
}
```

**With arguments:**
```json
{
  "type": "device_action",
  "deviceId": 15,
  "action": "setValue",
  "args": [75]
}
```

**Generated Lua:**
```lua
fibaro.call(15, "turnOn")
fibaro.call(15, "setValue", 75)
```

**Common actions:**
| Action | Description | Args |
|--------|-------------|------|
| `turnOn` | Turn device on | - |
| `turnOff` | Turn device off | - |
| `toggle` | Toggle state | - |
| `setValue` | Set brightness/level | `[0-100]` |
| `setColor` | Set RGB color | `[r, g, b, w]` |

### scene

Execute another scene using `fibaro.scene()`:

```json
{
  "type": "scene",
  "sceneId": 5
}
```

**Generated Lua:**
```lua
fibaro.scene("start", {5})
```

### delay

Wait before the next action using `fibaro.sleep()`:

```json
{
  "type": "delay",
  "delay": 5000
}
```

**Delay is in milliseconds.**

**Generated Lua:**
```lua
fibaro.sleep(5000) -- 5.000s delay
```

### variable_set

Set a global variable using `fibaro.setGlobalVariable()`:

```json
{
  "type": "variable_set",
  "variableName": "LastMotion",
  "value": "kitchen"
}
```

**Generated Lua:**
```lua
fibaro.setGlobalVariable("LastMotion", "kitchen")
```

### notification

Send a debug notification using `fibaro.debug()`:

```json
{
  "type": "notification",
  "message": "Motion detected in kitchen"
}
```

**Generated Lua:**
```lua
fibaro.debug("tag", "Motion detected in kitchen")
```

### custom

For advanced users, inject custom Lua code:

```json
{
  "type": "custom",
  "lua": "-- Custom code here\nlocal x = 42\nfibaro.call(x, 'turnOn')"
}
```

## Validation

Before deploying, validate your automation:

```
fibaro_automation op=validate automation={...}
```

The validator checks:
- Required fields (name, conditions, actions)
- Condition structure and operators
- Action parameters
- Device ID references
- Variable names
- Time format validity

**Example validation output:**
```json
{
  "valid": false,
  "errors": [
    "Action 2: device_action requires deviceId"
  ],
  "warnings": [
    "Using custom Lua condition - ensure syntax is correct"
  ]
}
```

## Generating Lua Code

Preview the generated Lua without deploying:

```
fibaro_automation op=generate_lua automation={...}
```

This returns the complete Lua scene code that would be created.

## Deploying Automations

Create and deploy the automation to Fibaro:

```
fibaro_automation op=create automation={...} deploy=true
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `automation` | object | The automation definition |
| `deploy` | boolean | If true, create scene on Fibaro (default: false) |

When `deploy=true`:
1. Validates the automation
2. Generates Lua code
3. Creates the scene on your Fibaro system
4. Returns the scene ID

## Example Automations

### Good Morning Routine

```json
{
  "name": "Good Morning",
  "description": "Morning routine at 6:30 AM on weekdays",
  "conditions": {
    "operator": "AND",
    "conditions": [
      {
        "type": "time",
        "operator": "between",
        "start": "06:25",
        "end": "06:35"
      },
      {
        "type": "variable",
        "variableName": "WeekdayMode",
        "operator": "==",
        "value": "true"
      }
    ]
  },
  "actions": [
    {
      "type": "device_action",
      "deviceId": 10,
      "action": "setValue",
      "args": [30]
    },
    {
      "type": "delay",
      "delay": 60000
    },
    {
      "type": "device_action",
      "deviceId": 10,
      "action": "setValue",
      "args": [100]
    },
    {
      "type": "notification",
      "message": "Good morning! Lights ramping up."
    }
  ]
}
```

### Security Night Mode

```json
{
  "name": "Night Security",
  "description": "Arm sensors and dim lights at night",
  "conditions": {
    "operator": "AND",
    "conditions": [
      {
        "type": "time",
        "operator": "after",
        "time": "23:00"
      },
      {
        "type": "variable",
        "variableName": "HomeMode",
        "operator": "==",
        "value": "home"
      }
    ]
  },
  "actions": [
    {
      "type": "variable_set",
      "variableName": "NightMode",
      "value": "true"
    },
    {
      "type": "device_action",
      "deviceId": 20,
      "action": "setValue",
      "args": [10]
    },
    {
      "type": "scene",
      "sceneId": 15
    }
  ]
}
```

### Energy Saver

```json
{
  "name": "Energy Saver",
  "description": "Turn off lights when room is empty for 10 minutes",
  "conditions": {
    "operator": "AND",
    "conditions": [
      {
        "type": "device_state",
        "deviceId": 42,
        "property": "value",
        "operator": "==",
        "value": false
      },
      {
        "type": "device_state",
        "deviceId": 15,
        "property": "value",
        "operator": "==",
        "value": true
      }
    ]
  },
  "actions": [
    {
      "type": "delay",
      "delay": 600000
    },
    {
      "type": "device_action",
      "deviceId": 15,
      "action": "turnOff"
    },
    {
      "type": "notification",
      "message": "Lights turned off - room empty"
    }
  ]
}
```

## API Reference

### fibaro_automation

| Operation | Description |
|-----------|-------------|
| `create` | Create automation (optionally deploy to Fibaro) |
| `validate` | Validate automation structure |
| `generate_lua` | Preview generated Lua code |

All operations use the `op` parameter: `fibaro_automation op=create ...`

### Automation Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Automation name |
| `description` | string | No | Description |
| `conditions` | ConditionGroup | Yes | Trigger conditions |
| `actions` | Action[] | Yes | Actions to execute |

## Fibaro Lua API Reference

The automation builder generates code using these Fibaro API calls:

| Function | Description |
|----------|-------------|
| `fibaro.getValue(deviceId, property)` | Get device property |
| `fibaro.call(deviceId, action, ...)` | Execute device action |
| `fibaro.setGlobalVariable(name, value)` | Set global variable |
| `fibaro.getGlobalVariable(name)` | Get global variable |
| `fibaro.scene("start", {sceneId})` | Execute scene |
| `fibaro.sleep(ms)` | Delay execution |
| `fibaro.debug(tag, message)` | Debug logging |

## Related

- [Scene Templates](TEMPLATES.md) - Pre-built automation patterns
- [Lua Management](LUA_MANAGEMENT.md) - Direct Lua scene management
- [Examples](EXAMPLES.md) - More automation examples
