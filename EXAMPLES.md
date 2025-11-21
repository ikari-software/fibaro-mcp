# Fibaro MCP Examples

This document provides practical examples of using the Fibaro MCP server with Claude.

## Device Control Examples

### List All Devices
```
User: Show me all my devices
Claude: [Calls list_devices and displays formatted list]
```

### Filter Devices by Room
```
User: What devices are in room 5?
Claude: [Calls list_devices with room_id: 5]
```

### Get Device Details
```
User: Show me details for device 123
Claude: [Calls get_device with device_id: 123]
```

### Turn Devices On/Off
```
User: Turn on device 45
Claude: [Calls turn_on with device_id: 45]

User: Turn off the light with ID 67
Claude: [Calls turn_off with device_id: 67]
```

### Dimming Lights
```
User: Set light 12 to 75% brightness
Claude: [Calls set_brightness with device_id: 12, level: 75]

User: Dim bedroom light to 30%
Claude: [First finds bedroom light ID, then calls set_brightness]
```

### Setting RGB Colors
```
User: Set light 20 to red
Claude: [Calls set_color with device_id: 20, r: 255, g: 0, b: 0]

User: Make the living room light purple
Claude: [Finds living room light, calls set_color with purple values]
```

### Temperature Control
```
User: Set thermostat 15 to 22 degrees
Claude: [Calls set_temperature with device_id: 15, temperature: 22]

User: Lower the bedroom temperature by 2 degrees
Claude: [Gets current temp, calculates new temp, calls set_temperature]
```

## Scene Management Examples

### List Scenes
```
User: What scenes do I have?
Claude: [Calls list_scenes and shows formatted list]
```

### Run a Scene
```
User: Run scene 8
Claude: [Calls run_scene with scene_id: 8]

User: Execute the Good Night scene
Claude: [Finds scene by name, calls run_scene]
```

### Stop a Scene
```
User: Stop scene 10
Claude: [Calls stop_scene with scene_id: 10]
```

## Room and Organization Examples

### List Rooms
```
User: Show me all my rooms
Claude: [Calls list_rooms]
```

### List Sections
```
User: What sections are in my house?
Claude: [Calls list_sections]
```

### Devices by Room
```
User: List all lights in the living room
Claude: [Gets room ID for living room, calls list_devices with room_id and filters by light type]
```

## Global Variables Examples

### List Variables
```
User: Show all global variables
Claude: [Calls list_global_variables]
```

### Get Variable Value
```
User: What's the value of the HomeMode variable?
Claude: [Calls get_global_variable with name: "HomeMode"]
```

### Set Variable Value
```
User: Set HomeMode to "Away"
Claude: [Calls set_global_variable with name: "HomeMode", value: "Away"]
```

## System Information Examples

### System Info
```
User: What's my Fibaro system information?
Claude: [Calls get_system_info]
```

### Weather
```
User: What's the weather like?
Claude: [Calls get_weather]
```

### Energy Monitoring
```
User: Show me my energy consumption
Claude: [Calls get_energy_panel]
```

## Complex Multi-Step Examples

### Evening Routine
```
User: Help me set up an evening routine: dim all living room lights to 30%, turn off all bedroom devices, and set temperature to 20 degrees

Claude:
1. [Calls list_devices with filter for living room]
2. [Calls set_brightness for each light with level: 30]
3. [Calls list_devices with filter for bedroom]
4. [Calls turn_off for each device]
5. [Finds thermostat, calls set_temperature with 20]
```

### Device Status Report
```
User: Give me a report of all devices that are currently on

Claude:
1. [Calls list_devices]
2. [Filters devices with value > 0 or state == on]
3. [Presents formatted report with device names, rooms, and current states]
```

### Smart Lighting Scene
```
User: Create a movie mode: turn off all lights except living room, set living room to 20% brightness

Claude:
1. [Calls list_devices to get all lights]
2. [Filters for non-living room lights, calls turn_off for each]
3. [Filters for living room lights, calls set_brightness with level: 20]
```

### Energy Optimization
```
User: Turn off all devices consuming power in empty rooms

Claude:
1. [Calls get_energy_panel to identify consuming devices]
2. [Correlates with room occupancy or user-specified empty rooms]
3. [Calls turn_off for devices in those rooms]
```

## Lua Script Management Examples

### View Scene Lua Code
```
User: Show me the Lua code for scene 15
Claude: [Calls get_scene_lua with scene_id: 15]
```

### Create a New Lua Scene
```
User: Create a new scene called "Evening Lights" in room 5 with this Lua code:
      fibaro.call(12, "turnOn")
      fibaro.call(15, "setValue", 50)

Claude: [Calls create_scene with name: "Evening Lights", room_id: 5, lua: <code>]
Result: Scene "Evening Lights" created successfully with ID: 42
```

### Update Scene Lua Code
```
User: Update scene 15 to turn on device 20 instead
Claude: [Calls update_scene_lua with scene_id: 15, lua: "fibaro.call(20, 'turnOn')"]
Result: Scene updated successfully

User: Rename scene 15 to "New Name" and move it to room 3
Claude: [Calls update_scene_lua with scene_id: 15, name: "New Name", room_id: 3]
```

### Delete a Scene
```
User: Delete scene 20
Claude: [Calls delete_scene with scene_id: 20]
Result: Scene 20 deleted successfully
```

### List Quick Apps
```
User: What Quick Apps do I have installed?
Claude: [Calls list_quick_apps]
```

### Create a Quick App
```
User: Create a new Quick App called "Temperature Monitor" with type com.fibaro.quickApp
Claude: [Calls create_quick_app with appropriate parameters]
Result: Quick App "Temperature Monitor" created successfully with ID: 55

User: Create a weather Quick App in room 2 with custom Lua code
Claude: [Calls create_quick_app with name, type, room_id, and code]
```

### Update Quick App Code
```
User: Update the code in Quick App 42 to add logging
Claude: [Calls update_quick_app_code with device_id: 42, code: <new code>]
Result: Quick App 42 code updated successfully

User: Modify device 55 to check temperature every 5 minutes
Claude: [Gets current code, modifies it, calls update_quick_app_code]
```

### Manage Quick App Variables
```
User: Set the API key variable for Quick App 42
Claude: [Calls update_quick_app_variables with appropriate structure]

User: Update multiple variables in Quick App 55: interval=300, enabled=true
Claude: [Calls update_quick_app_variables with array of variables]
```

### View Quick App Code and Variables
```
User: Show me the Lua code for device 42
Claude: [Calls get_device_lua with device_id: 42]

User: I want to see the code and variables for my weather Quick App
Claude: [Finds weather Quick App, calls get_device_lua]
```

### Delete Quick App
```
User: Delete Quick App 55
Claude: [Calls delete_device with device_id: 55]
Result: Device 55 deleted successfully
```

### Complex Lua Management Workflow
```
User: Create a new scene that dims all living room lights to 30%, then update it to also close the blinds

Claude:
1. [Calls list_devices to find living room lights]
2. [Generates Lua code to dim each light]
3. [Calls create_scene with generated code]
4. [Gets existing scene code]
5. [Modifies code to add blind control]
6. [Calls update_scene_lua with modified code]
```

### Analyze and Modify Scenes
```
User: Show me all Lua scenes and their code
Claude: 
1. [Calls list_scenes]
2. [Filters for isLua: true scenes]
3. [Calls get_scene_lua for each Lua scene]
4. [Presents formatted list with code snippets]

User: Find all scenes that control device 20 and update them to use device 21 instead
Claude:
1. [Gets all Lua scenes]
2. [Checks each scene's code for device 20 references]
3. [Updates each matching scene with modified code]
4. [Reports changes made]
```

## Advanced Custom Actions

### Using control_device for Custom Actions
```
User: Execute the 'lock' action on device 88
Claude: [Calls control_device with device_id: 88, action: "lock"]

User: Call setArmed with argument true on device 99
Claude: [Calls control_device with device_id: 99, action: "setArmed", args: [true]]
```

## Resource Access Examples

### Reading Resources
The MCP resources provide direct access to live data:

- `fibaro://devices` - Get all device states in one call
- `fibaro://rooms` - Get room configuration
- `fibaro://scenes` - Get scene definitions
- `fibaro://system` - Get system status
- `fibaro://weather` - Get current weather

These resources are automatically updated and can be accessed by Claude when needed for context.

## Tips for Natural Language Interaction

1. **Be specific about device IDs when you know them:**
   - "Turn on device 45" is faster than "Turn on the kitchen light"

2. **Use room names for bulk operations:**
   - "Turn off all devices in the bedroom"

3. **Combine multiple operations:**
   - "Set the living room to movie mode: dim lights to 20% and close blinds"

4. **Ask for recommendations:**
   - "What scenes should I run for bedtime?"

5. **Request status reports:**
   - "What's currently consuming the most energy?"
   - "Which lights are on right now?"

## Error Handling

If an operation fails, Claude will provide helpful information:

```
User: Turn on device 999
Claude: I couldn't find device 999. Let me show you available devices...
[Calls list_devices]
```

## Best Practices

1. **Use descriptive device names in Fibaro** - Makes natural language interaction easier
2. **Organize devices into rooms** - Enables bulk operations by location
3. **Create meaningful scenes** - Allows for complex operations with single commands
4. **Use global variables** - Great for system-wide states like "HomeMode" or "VacationMode"
5. **Regular system checks** - Ask Claude to check system status periodically

