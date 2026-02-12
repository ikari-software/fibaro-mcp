# Fibaro MCP Server

Fibaro Home Center integration for the Model Context Protocol (MCP).

Use it with MCP-capable clients (Claude Desktop, Cursor, VS Code extensions, etc.) to control devices, run scenes, manage variables, and administer your Fibaro system.

## Features

### 🏠 Device Control
- List and filter devices by room or type
- Get detailed device information and current state
- Control devices with various actions (on/off, dimming, color control)
- Support for lights, switches, thermostats, and more
- **v3**: Bulk operations for multiple devices at once

### 🎬 Scene Management
- List all available scenes
- Get detailed scene information
- Execute and stop scenes programmatically
- **v3**: Scene templates with parameter substitution
- **v3**: Lua REPL for interactive testing

### 📍 Room & Section Management
- List all rooms and sections in your home
- Filter devices and scenes by room

### 🔧 System Integration
- Access global variables
- Get system information
- Retrieve weather data
- Monitor energy consumption
- **v3**: System backup and restore
- **v3**: Webhook server and MQTT bridge

### 📊 Analytics & History (v3)
- Device usage patterns and statistics
- Scene execution history and performance
- Energy consumption trends
- System health monitoring
- Analytics dashboard

### 🤖 Automation Builder (v3)
- Visual automation creation with JSON
- Multi-condition triggers (AND/OR logic)
- Device state, time, and variable conditions
- Generates valid Fibaro Lua code

## Installation

### Recommended (published package)

Most users should not need to clone this repo. Configure your MCP client to run the server via `npx`:

```json
{
  "command": "npx",
  "args": ["-y", "fibaro-mcp"]
}
```

### From source (development)

```bash
npm install
npm run build
```

## Configuration

You can configure the server in three ways (in priority order):

1. `FIBARO_HOST`/`FIBARO_USERNAME`/`FIBARO_PASSWORD` env vars (explicit)
2. `FIBARO_CONFIG=/absolute/path/to/fibaro.json` (single config file)
3. `.env` file (loaded automatically when the server starts)

- `FIBARO_HOST`: The hostname or IP address of your Fibaro Home Center (required)
- `FIBARO_USERNAME`: Your Fibaro username (required)
- `FIBARO_PASSWORD`: Your Fibaro password (required)
- `FIBARO_PORT`: The port number (optional, defaults to 443 for HTTPS, 80 for HTTP)
- `FIBARO_HTTPS`: Whether to use HTTPS (optional, defaults to true)

Tool listing mode:

- `FIBARO_TOOLSET`: `intent` (default), `legacy`, or `both`

### Example Configuration

```bash
export FIBARO_HOST="192.168.1.100"
export FIBARO_USERNAME="admin"
export FIBARO_PASSWORD="your-password"
export FIBARO_PORT="443"
export FIBARO_HTTPS="true"
```

### Example `FIBARO_CONFIG`

Create a JSON file anywhere on disk (do not commit it), e.g. `~/fibaro-mcp.json`:

```json
{
  "host": "192.168.1.100",
  "username": "admin",
  "password": "your-password",
  "port": 443,
  "https": true
}
```

Then set:

```bash
export FIBARO_CONFIG="$HOME/fibaro-mcp.json"
```

### Example `.env`

Create `.env` next to where you run the server:

```bash
FIBARO_HOST=192.168.1.100
FIBARO_USERNAME=admin
FIBARO_PASSWORD=your-password
FIBARO_PORT=443
FIBARO_HTTPS=true
```

## Setup (common MCP clients)

The server communicates over stdio. Most clients need:

- **Command**: `npx` (recommended) or `node` (local checkout)
- **Args**: `[-y, fibaro-mcp]` (recommended) or `[/absolute/path/to/repo/dist/index.js]`
- **Env**: either `FIBARO_CONFIG` or `FIBARO_HOST`/`FIBARO_USERNAME`/`FIBARO_PASSWORD`

### Agent-assisted setup (recommended)

If configuration is missing, instruct the agent to call the `first_run` tool.

The server will start even without Fibaro credentials so the agent can do this.

Example:

- Call: `first_run`
- Optionally provide: `client`, `os`, `repo_path`, `fibaro_host`, `fibaro_username`, `fibaro_https`, `fibaro_port`

The tool returns:

- commands to build (`npm install`, `npm run build`)
- a template `fibaro-mcp.json` for `FIBARO_CONFIG`
- a ready-to-paste MCP client configuration snippet

Security: don’t paste passwords into chat logs; don’t commit `fibaro-mcp.json` or `.env`.

### Claude Desktop

Add this configuration to your Claude Desktop config file:

### MacOS
`~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows
`%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fibaro": {
      "command": "npx",
      "args": ["-y", "fibaro-mcp"],
      "env": {
        "FIBARO_CONFIG": "/absolute/path/to/fibaro-mcp.json",
        "FIBARO_TOOLSET": "intent"
      }
    }
  }
}
```

### Cursor

Add the MCP server entry in Cursor’s MCP settings (JSON). Use the same structure as Claude Desktop:

```json
{
  "mcpServers": {
    "fibaro": {
      "command": "npx",
      "args": ["-y", "fibaro-mcp"],
      "env": {
        "FIBARO_CONFIG": "/absolute/path/to/fibaro-mcp.json"
      }
    }
  }
}
```

### VS Code (MCP-capable extensions)

Most MCP extensions use the same `command`/`args`/`env` shape. Prefer `FIBARO_CONFIG` so you don’t copy credentials into multiple places.

## Available Tools

By default, you’ll see a small “intent” toolset:

- `fibaro_device`
- `fibaro_scene`
- `fibaro_variable`
- `fibaro_quick_app`
- `fibaro_home`

You can also expose legacy tools with `FIBARO_TOOLSET=legacy` or `FIBARO_TOOLSET=both`.

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

## Documentation

- [QUICKSTART.md](QUICKSTART.md) - Getting started guide
- [EXAMPLES.md](EXAMPLES.md) - Usage examples
- [FEATURES.md](FEATURES.md) - Complete feature reference
- [LUA_MANAGEMENT.md](LUA_MANAGEMENT.md) - Lua scene management

### v3 Documentation

- [TEMPLATES.md](TEMPLATES.md) - Scene templates guide
- [ANALYTICS.md](ANALYTICS.md) - Analytics and insights
- [INTEGRATIONS.md](INTEGRATIONS.md) - Webhooks and MQTT
- [AUTOMATION.md](AUTOMATION.md) - Automation builder
- [MIGRATION_V3.md](MIGRATION_V3.md) - Migration from v2

## AI Assistant Usage Tips

When using this MCP server with AI assistants like Claude, follow these guidelines for efficient operation:

### Avoid Listing Everything First

**Don't** start by listing all devices, scenes, or rooms. The full lists can be over 1MB and waste context.

**Do** use targeted queries:
- Ask for a specific device by name: `fibaro_device operation=get name="Kitchen Light"`
- Filter by room: `fibaro_device operation=list room_id=5`
- Get only what you need: `fibaro_scene operation=get id=10`

### Use Name-Based Lookups

All tools support name-based lookups - you don't need IDs:
- `fibaro_device operation=control name="Living Room Lamp" action=turnOn`
- `fibaro_scene operation=run name="Good Night"`
- `fibaro_variable operation=get name=HomeMode`

### Prefer Intent Tools

The default `intent` toolset (`fibaro_device`, `fibaro_scene`, etc.) combines multiple operations into single tools, reducing API calls.

### Check Analytics Instead of Listing

For overview information, use analytics:
- `fibaro_analytics operation=system_health` - Quick health check
- `fibaro_analytics operation=dashboard` - Comprehensive overview

### Example Efficient Workflows

```
# Bad: Lists everything (1MB+)
fibaro_device operation=list
fibaro_scene operation=list

# Good: Targeted queries
fibaro_device operation=get name="Kitchen Light"
fibaro_scene operation=run name="Morning Routine"
```

## Development

### Use local code with npx-style config

If you want your MCP client config to look like the published `npx fibaro-mcp` setup but run your local working copy instead:

```bash
npm install
npm run build
npm link
```

Then set your MCP client to run:

- **Command**: `fibaro-mcp`
- **Args**: `[]`

To undo:

```bash
npm unlink
```

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

