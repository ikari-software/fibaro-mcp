# Lua Script Management Guide

The Fibaro MCP server provides **full management capabilities** for Lua scripts, including creation, reading, updating, and deletion of both scenes and Quick Apps.

## Overview

You can now:
- ✅ Read Lua code from scenes and Quick Apps
- ✅ Create new Lua scenes with custom code
- ✅ Update existing scene Lua code
- ✅ Delete scenes
- ✅ Create new Quick Apps with Lua code
- ✅ Update Quick App Lua code
- ✅ Manage Quick App variables
- ✅ Delete Quick Apps and other devices

## Scene Management

### Reading Scene Code

```typescript
// Ask Claude:
"Show me the Lua code for scene 15"
```

The tool `get_scene_lua` will retrieve the complete Lua code from any scene.

### Creating Lua Scenes

```typescript
// Ask Claude:
"Create a new Lua scene called 'Evening Routine' in room 5 that turns on device 12"

// Behind the scenes:
create_scene({
  name: "Evening Routine",
  room_id: 5,
  lua: "fibaro.call(12, 'turnOn')"
})
```

**Lua Scene Template:**
```lua
-- This is a standard Fibaro Lua scene

-- Turn on a device
fibaro.call(12, "turnOn")

-- Set device value
fibaro.call(15, "setValue", 50)

-- Get device value
local value = fibaro.getValue(20, "value")

-- Debug logging
fibaro.debug("Scene", "Scene executed successfully")

-- Wait (sleep)
fibaro.sleep(5000) -- 5 seconds

-- Conditional logic
if tonumber(fibaro.getValue(10, "value")) > 50 then
  fibaro.call(12, "turnOff")
end
```

### Updating Scene Code

```typescript
// Ask Claude:
"Update scene 15 to also turn off device 20"

// Or:
"Change the name of scene 15 to 'New Evening Routine' and move it to room 8"

// Behind the scenes:
update_scene_lua({
  scene_id: 15,
  lua: "fibaro.call(12, 'turnOn')\nfibaro.call(20, 'turnOff')",
  name: "New Evening Routine",  // optional
  room_id: 8                      // optional
})
```

### Deleting Scenes

```typescript
// Ask Claude:
"Delete scene 20"

// Behind the scenes:
delete_scene({ scene_id: 20 })
```

## Quick App Management

Quick Apps are Lua-based virtual devices that can perform complex automation tasks.

### Listing Quick Apps

```typescript
// Ask Claude:
"What Quick Apps do I have?"

// Behind the scenes:
list_quick_apps()
```

### Reading Quick App Code

```typescript
// Ask Claude:
"Show me the Lua code for device 42"

// Behind the scenes:
get_device_lua({ device_id: 42 })

// Returns:
{
  device: { /* device info */ },
  code: "-- Quick App Lua code",
  quickAppVariables: [
    { name: "apiKey", value: "xxx" },
    { name: "interval", value: "300" }
  ]
}
```

### Creating Quick Apps

```typescript
// Ask Claude:
"Create a new Quick App called 'Weather Monitor' with type com.fibaro.quickApp"

// Behind the scenes:
create_quick_app({
  name: "Weather Monitor",
  type: "com.fibaro.quickApp",
  room_id: 5,  // optional
  code: `
    function QuickApp:onInit()
      self:debug("Quick App initialized")
      -- Your code here
    end
  `
})
```

**Quick App Template:**
```lua
-- Quick App Class Definition

function QuickApp:onInit()
    self:debug("Quick App", "Initializing...")
    
    -- Initialize variables
    self.apiKey = self:getVariable("apiKey")
    
    -- Set up a timer
    self.timer = setInterval(function()
        self:updateData()
    end, 300000) -- 5 minutes
end

function QuickApp:updateData()
    self:debug("Quick App", "Updating data...")
    
    -- Your logic here
    local data = self:fetchData()
    
    -- Update device properties
    self:updateProperty("value", data.value)
    self:updateProperty("unit", data.unit)
end

function QuickApp:fetchData()
    -- HTTP request example
    local http = net.HTTPClient()
    http:request("https://api.example.com/data", {
        success = function(response)
            self:processResponse(response.data)
        end,
        error = function(err)
            self:error("Failed to fetch data:", err)
        end
    })
end

function QuickApp:button1Clicked()
    -- Button press handler
    self:debug("Button 1 clicked")
    self:updateData()
end
```

### Updating Quick App Code

```typescript
// Ask Claude:
"Update the code in Quick App 42 to check data every 10 minutes instead of 5"

// Behind the scenes:
update_quick_app_code({
  device_id: 42,
  code: "-- Updated Quick App code with 600000 interval"
})
```

### Managing Quick App Variables

Quick Apps can have variables that store configuration:

```typescript
// Ask Claude:
"Set the API key for Quick App 42 to 'my-secret-key'"

// Behind the scenes:
update_quick_app_variables({
  device_id: 42,
  variables: [
    { name: "apiKey", value: "my-secret-key", type: "password" },
    { name: "interval", value: "600", type: "number" },
    { name: "enabled", value: "true", type: "boolean" }
  ]
})
```

**Variable Types:**
- `string` - Text values
- `number` - Numeric values
- `boolean` - True/false values
- `password` - Hidden/encrypted values

### Deleting Quick Apps

```typescript
// Ask Claude:
"Delete Quick App 42"

// Behind the scenes:
delete_device({ device_id: 42 })
```

## Common Fibaro Lua Functions

### Device Control
```lua
-- Turn on/off
fibaro.call(deviceId, "turnOn")
fibaro.call(deviceId, "turnOff")

-- Set value (dimmer, thermostat, etc.)
fibaro.call(deviceId, "setValue", value)

-- Set color (RGB)
fibaro.call(deviceId, "setColor", r, g, b, w)

-- Get device property
local value = fibaro.getValue(deviceId, "value")
local name = fibaro.getName(deviceId)
local roomId = fibaro.getRoomID(deviceId)
```

### Global Variables
```lua
-- Get global variable
local value = fibaro.getGlobalVariable("MyVariable")

-- Set global variable
fibaro.setGlobalVariable("MyVariable", "new value")
```

### Scenes
```lua
-- Start scene
fibaro.scene("start", {sceneId})

-- Stop scene
fibaro.scene("stop", {sceneId})

-- Kill scene
fibaro.scene("kill", {sceneId})
```

### Logging
```lua
-- Debug logging (only in debug mode)
fibaro.debug("tag", "message")

-- Trace logging
fibaro.trace("tag", "message")

-- Error logging
fibaro.error("tag", "error message")
```

### Time & Date
```lua
-- Current timestamp
local timestamp = os.time()

-- Date formatting
local dateStr = os.date("%Y-%m-%d %H:%M:%S")

-- Sleep/wait
fibaro.sleep(5000) -- milliseconds
```

### HTTP Requests (Quick Apps)
```lua
local http = net.HTTPClient()
http:request("https://api.example.com", {
    options = {
        headers = {
            ["Content-Type"] = "application/json"
        },
        method = "GET"
    },
    success = function(response)
        -- Handle success
        local data = json.decode(response.data)
    end,
    error = function(err)
        -- Handle error
        fibaro.error("HTTP Error", err)
    end
})
```

## Best Practices

### 1. Error Handling
Always wrap your code in pcall for error handling:
```lua
local status, err = pcall(function()
    -- Your code here
    fibaro.call(12, "turnOn")
end)

if not status then
    fibaro.error("Scene", "Error: " .. tostring(err))
end
```

### 2. Logging
Use appropriate log levels:
```lua
fibaro.debug("Scene", "Debug information")  -- Development only
fibaro.trace("Scene", "Trace information")   -- Detailed execution
fibaro.error("Scene", "Error occurred")      -- Errors only
```

### 3. Resource Management
Clean up timers and resources:
```lua
function QuickApp:onInit()
    self.timer = setInterval(function()
        self:update()
    end, 60000)
end

function QuickApp:onRelease()
    if self.timer then
        clearInterval(self.timer)
    end
end
```

### 4. Variables
Use Quick App variables for configuration:
```lua
function QuickApp:onInit()
    self.config = {
        apiKey = self:getVariable("apiKey"),
        interval = tonumber(self:getVariable("interval")) or 300,
        enabled = self:getVariable("enabled") == "true"
    }
end
```

## Advanced Examples

### Scene: Conditional Lighting
```lua
-- Get current time
local hour = tonumber(os.date("%H"))

-- Get outdoor brightness sensor
local brightness = tonumber(fibaro.getValue(50, "value"))

-- Turn on lights if dark and evening
if hour >= 18 and brightness < 100 then
    fibaro.call(12, "turnOn")
    fibaro.call(15, "setValue", 70)
    fibaro.debug("Lights", "Evening lights activated")
else
    fibaro.debug("Lights", "Conditions not met")
end
```

### Quick App: Weather Monitor
```lua
function QuickApp:onInit()
    self:updateView("label", "text", "Initializing...")
    self.apiKey = self:getVariable("apiKey")
    
    -- Update every 10 minutes
    self.timer = setInterval(function()
        self:fetchWeather()
    end, 600000)
    
    self:fetchWeather() -- Initial fetch
end

function QuickApp:fetchWeather()
    local http = net.HTTPClient()
    local url = "https://api.openweathermap.org/data/2.5/weather?q=London&appid=" .. self.apiKey
    
    http:request(url, {
        success = function(response)
            local data = json.decode(response.data)
            local temp = math.floor(data.main.temp - 273.15) -- Kelvin to Celsius
            
            self:updateProperty("value", temp)
            self:updateProperty("unit", "°C")
            self:updateView("label", "text", temp .. "°C")
            
            self:debug("Weather updated:", temp .. "°C")
        end,
        error = function(err)
            self:error("Failed to fetch weather:", err)
        end
    })
end

function QuickApp:button1Clicked()
    self:fetchWeather()
end
```

## Natural Language Examples with Claude

Here are some things you can ask Claude to do:

**Creating:**
- "Create a new Lua scene that turns on all living room lights at sunset"
- "Make a Quick App that monitors my home temperature every 5 minutes"
- "Create a scene in room 3 that dims lights to 30% when I watch movies"

**Reading:**
- "Show me the Lua code for scene 15"
- "What does my Weather Quick App do?"
- "List all Quick Apps with their code"

**Updating:**
- "Update scene 10 to also close the blinds"
- "Change the interval in my weather Quick App to 10 minutes"
- "Modify scene 5 to turn off device 20 instead of 12"

**Deleting:**
- "Delete the old scene 8"
- "Remove Quick App 42"

**Complex:**
- "Find all scenes that control device 12 and update them to use device 15"
- "Create a new scene based on scene 10 but with different devices"
- "Analyze my Quick Apps and tell me which ones are using the most resources"

## Security Considerations

⚠️ **Important:**
- Lua code has full access to your Fibaro system
- Be careful with code from untrusted sources
- Review code before executing
- Use Quick App variables for sensitive data (API keys)
- Test scenes in a safe environment first

## Troubleshooting

### Scene won't execute
- Check Lua syntax errors in the scene
- Verify device IDs are correct
- Check scene is enabled and visible
- Review Fibaro system logs

### Quick App not responding
- Verify Quick App is enabled
- Check for Lua errors in device properties
- Ensure Quick App type is correct
- Review Quick App logs

### Code changes not taking effect
- Fibaro may cache Lua code
- Try disabling and re-enabling the scene/Quick App
- Restart the Fibaro Home Center if needed

## Resources

- [Fibaro Lua API Documentation](http://manuals.fibaro.com/knowledge-base-browse/)
- [Fibaro Forum](https://forum.fibaro.com/)
- Fibaro Home Center built-in documentation: `http://your-hc-ip/docs/`

---

For more examples and use cases, see [EXAMPLES.md](EXAMPLES.md).

