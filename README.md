# Fibaro MCP Server

**Version 2.0.0** - The Complete Fibaro Home Automation Management Solution

A comprehensive Model Context Protocol (MCP) server that provides **full management** of literally everything your Fibaro Home Center offers! Control devices, create scenes, manage users, configure Z-Wave networks, and much more - all through natural language with AI assistants like Claude.

## 🎉 Version 2.0 - Revolutionary Release!

- **70+ Tools** (up from 27!)
- **~95% API Coverage** - Manage virtually everything
- **Full CRUD Operations** - Complete lifecycle management
- **15 Management Categories** - From devices to Z-Wave networks

## ✨ What's New in 2.0

- 🏘️ **Room & Section Management** - Full CRUD operations
- 👥 **User Management** - Complete user lifecycle
- 🚨 **Alarm Control** - Arm/disarm security systems
- 🔌 **Z-Wave Management** - Network healing, inclusion/exclusion
- 💾 **Backup & Restore** - System-level disaster recovery
- 📍 **Geofencing** - Location-based automation
- 🔌 **Plugin Management** - Install/manage plugins
- 🌍 **Profile Modes** - Home, Away, Vacation modes
- 🌡️ **Climate Zones** - Heating management
- ⚙️ **System Administration** - Settings, restart, logs

See [FEATURES.md](FEATURES.md) for the complete feature list!

## Features

### 🏠 Device Control
- List and filter devices by room or type
- Get detailed device information and current state
- Control devices with various actions (on/off, dimming, color control)
- Support for lights, switches, thermostats, and more

### 🎬 Scene Management
- List all available scenes
- Get detailed scene information
- Execute and stop scenes programmatically

### 📍 Room & Section Management
- List all rooms and sections in your home
- Filter devices and scenes by room

### 🔧 System Integration
- Access global variables
- Get system information
- Retrieve weather data
- Monitor energy consumption

### 📊 Real-time Resources
- Live device states
- Current weather conditions
- System status

## Installation

```bash
npm install
npm run build
```

## Configuration

The server requires the following environment variables to connect to your Fibaro Home Center:

- `FIBARO_HOST`: The hostname or IP address of your Fibaro Home Center (required)
- `FIBARO_USERNAME`: Your Fibaro username (required)
- `FIBARO_PASSWORD`: Your Fibaro password (required)
- `FIBARO_PORT`: The port number (optional, defaults to 443 for HTTPS, 80 for HTTP)
- `FIBARO_HTTPS`: Whether to use HTTPS (optional, defaults to true)

### Example Configuration

```bash
export FIBARO_HOST="192.168.1.100"
export FIBARO_USERNAME="admin"
export FIBARO_PASSWORD="your-password"
export FIBARO_PORT="443"
export FIBARO_HTTPS="true"
```

## Usage with Claude Desktop

Add this configuration to your Claude Desktop config file:

### MacOS
`~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
`%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fibaro": {
      "command": "node",
      "args": ["/absolute/path/to/fibaro-mcp/dist/index.js"],
      "env": {
        "FIBARO_HOST": "192.168.1.100",
        "FIBARO_USERNAME": "admin",
        "FIBARO_PASSWORD": "your-password",
        "FIBARO_PORT": "443",
        "FIBARO_HTTPS": "true"
      }
    }
  }
}
```

## Available Tools

### Device Management

#### `list_devices`
List all devices in your Fibaro system.
- Optional filters: `room_id`, `type`

#### `get_device`
Get detailed information about a specific device.
- Parameters: `device_id`

#### `control_device`
Execute any action on a device.
- Parameters: `device_id`, `action`, `args` (optional)

#### `turn_on`
Turn on a device (light, switch, etc.).
- Parameters: `device_id`

#### `turn_off`
Turn off a device.
- Parameters: `device_id`

#### `set_brightness`
Set brightness level for dimmable lights.
- Parameters: `device_id`, `level` (0-100)

#### `set_color`
Set RGB color for color-capable lights.
- Parameters: `device_id`, `r`, `g`, `b`, `w` (optional)

#### `set_temperature`
Set target temperature for thermostats.
- Parameters: `device_id`, `temperature`

### Scene Management

#### `list_scenes`
List all scenes in the system.
- Optional filter: `room_id`

#### `get_scene`
Get detailed information about a specific scene.
- Parameters: `scene_id`

#### `run_scene`
Execute a scene.
- Parameters: `scene_id`

#### `stop_scene`
Stop a running scene.
- Parameters: `scene_id`

### Room & Section Management

#### `list_rooms`
List all rooms in the system.

#### `list_sections`
List all sections in the system.

### Global Variables

#### `list_global_variables`
List all global variables.

#### `get_global_variable`
Get the value of a specific global variable.
- Parameters: `name`

#### `set_global_variable`
Set the value of a global variable.
- Parameters: `name`, `value`

### System Information

#### `get_system_info`
Get Fibaro Home Center system information.

#### `get_weather`
Get current weather information.

#### `get_energy_panel`
Get energy consumption data.

### Lua Script Management

#### `get_scene_lua`
Get the Lua script code from a scene.
- Parameters: `scene_id`

#### `create_scene`
Create a new Lua scene.
- Parameters: `name`, `room_id`, `lua` (optional)

#### `update_scene_lua`
Update the Lua code of an existing scene.
- Parameters: `scene_id`, `lua` (optional), `name` (optional), `room_id` (optional)

#### `delete_scene`
Delete a scene.
- Parameters: `scene_id`

#### `list_quick_apps`
List all Quick Apps (Lua-based applications) in the system.

#### `get_device_lua`
Get Lua code and Quick App variables from a device.
- Parameters: `device_id`

#### `create_quick_app`
Create a new Quick App (Lua application).
- Parameters: `name`, `type`, `code` (optional), `room_id` (optional)

#### `update_quick_app_code`
Update the Lua code of a Quick App.
- Parameters: `device_id`, `code`

#### `update_quick_app_variables`
Update Quick App variables.
- Parameters: `device_id`, `variables` (array)

#### `delete_device`
Delete a device (including Quick Apps).
- Parameters: `device_id`

## Available Resources

The server provides the following resources that can be accessed through the MCP protocol:

- `fibaro://devices` - Current state of all devices
- `fibaro://rooms` - List of all rooms
- `fibaro://scenes` - List of all scenes
- `fibaro://system` - System information
- `fibaro://weather` - Current weather

## Example Interactions

Here are some example prompts you can use with Claude:

- "Show me all the lights in my living room"
- "Turn off all lights in the bedroom"
- "Set the thermostat to 22 degrees"
- "What's the current temperature outside?"
- "Run the 'Good Night' scene"
- "Dim the kitchen lights to 50%"
- "Show me all devices that are currently on"
- "What's my current energy consumption?"
- "Show me the Lua code for scene 10"
- "Create a new Lua scene called 'Morning Routine'"
- "Update the Lua code in scene 15"
- "List all my Quick Apps"
- "Create a new Quick App for weather monitoring"
- "Update the code in Quick App 42"
- "Delete scene 20"

## Development

### Build
```bash
npm run build
```

### Development Mode (watch)
```bash
npm run dev
```

### Run directly
```bash
npm start
```

## API Coverage

This MCP server implements comprehensive Fibaro Home Center API support:

- ✅ Device listing and control
- ✅ Scene execution and management
- ✅ Room and section organization
- ✅ Global variables
- ✅ System information
- ✅ Weather data
- ✅ Energy monitoring
- ✅ RGB/RGBW light control
- ✅ Thermostat control
- ✅ Binary switches
- ✅ Dimmers
- ✅ **Full Lua script management** (create, read, update, delete)
- ✅ **Scene creation and editing with Lua code**
- ✅ **Quick App creation, modification, and management**
- ✅ Quick App variables management

## Security Notes

- The server accepts self-signed certificates by default (common in Fibaro installations)
- Credentials are passed via environment variables
- All communication with the Fibaro Home Center uses authentication
- Consider using HTTPS for production deployments

## Troubleshooting

### Connection Issues
- Verify your Fibaro Home Center is accessible from your network
- Check that the hostname/IP address is correct
- Ensure the port is correct (default: 443 for HTTPS)
- Verify your credentials are correct

### Device Control Issues
- Check that devices are enabled and visible in the Fibaro interface
- Verify the device supports the action you're trying to perform
- Check device IDs are correct (use `list_devices` to get IDs)

### Scene Issues
- Ensure scenes are properly configured in Fibaro
- Check scene IDs are correct (use `list_scenes` to get IDs)
- Verify scenes are not already running when starting them

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

**Cezar "ikari" Pokorski**  
GitHub: [@ikari-pl](https://github.com/ikari-pl/)  
Email: _@ikari.software

## Acknowledgments

Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk) by Anthropic.

