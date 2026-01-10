import {
  ErrorCode,
  McpError,
  type CallToolResult,
  type ListResourcesResult,
  type ListToolsResult,
  type ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import { findMatches, isPluralishQuery } from "./name-lookup.js";
import {
  aggregateDeviceStats,
  validateParams,
  formatForResponse,
  type AggregationInterval,
  type MetricType,
} from "./energy-aggregator.js";

export type FibaroClientLike = {
  getDevices: () => Promise<any[]>;
  getDevice: (id: number) => Promise<any>;
  callAction: (deviceId: number, action: string, args?: any[]) => Promise<any>;
  turnOn: (deviceId: number) => Promise<void>;
  turnOff: (deviceId: number) => Promise<void>;
  setBrightness: (deviceId: number, level: number) => Promise<void>;
  setColor: (deviceId: number, r: number, g: number, b: number, w?: number) => Promise<void>;
  setTemperature: (deviceId: number, temperature: number) => Promise<void>;
  getRooms: () => Promise<any[]>;
  getSections: () => Promise<any[]>;
  getScenes: () => Promise<any[]>;
  getScene: (sceneId: number) => Promise<any>;
  runScene: (sceneId: number) => Promise<void>;
  stopScene: (sceneId: number) => Promise<void>;
  getGlobalVariables: () => Promise<any[]>;
  getGlobalVariable: (name: string) => Promise<any>;
  setGlobalVariable: (name: string, value: string) => Promise<void>;
  getSystemInfo: () => Promise<any>;
  getWeather: () => Promise<any>;
  getEnergyPanel: () => Promise<any>;
  getSceneLua: (sceneId: number) => Promise<string>;
  getQuickApps: () => Promise<any[]>;
  getDeviceLua: (deviceId: number) => Promise<any>;
  createScene: (scene: {
    name: string;
    roomID: number;
    lua?: string;
    type?: string;
    isLua?: boolean;
  }) => Promise<any>;
  updateScene: (sceneId: number, updates: any) => Promise<any>;
  deleteScene: (sceneId: number) => Promise<void>;
  createQuickApp: (qa: any) => Promise<any>;
  updateQuickAppCode: (deviceId: number, code: string) => Promise<void>;
  updateQuickAppVariables: (deviceId: number, variables: any[]) => Promise<void>;
  deleteQuickApp: (deviceId: number) => Promise<void>;
  deleteDevice: (deviceId: number) => Promise<void>;
  createRoom: (room: any) => Promise<any>;
  updateRoom: (roomId: number, updates: any) => Promise<any>;
  deleteRoom: (roomId: number) => Promise<void>;
  createSection: (section: any) => Promise<any>;
  updateSection: (sectionId: number, updates: any) => Promise<any>;
  deleteSection: (sectionId: number) => Promise<void>;
  getPanels: () => Promise<any>;
  getClimateZones: () => Promise<any[]>;
  setClimateMode: (zoneId: number, mode: string) => Promise<void>;
  getUsers: () => Promise<any[]>;
  getUser: (userId: number) => Promise<any>;
  getUserSettings: (userId: number) => Promise<any>;
  getSystemSettings: () => Promise<any>;
  createUser: (user: any) => Promise<any>;
  updateUser: (userId: number, updates: any) => Promise<any>;
  deleteUser: (userId: number) => Promise<void>;
  getProfiles: () => Promise<any[]>;
  getActiveProfile: () => Promise<any>;
  setActiveProfile: (profileId: number) => Promise<void>;
  getNotifications: () => Promise<any[]>;
  sendNotification: (notification: any) => Promise<any>;
  getAlarms: () => Promise<any>;
  getAlarmPartitions: () => Promise<any>;
  getAlarmDevices: () => Promise<any>;
  armAlarm: (partitionId: number) => Promise<void>;
  disarmAlarm: (partitionId: number) => Promise<void>;
  getLastEvents: (limit?: number) => Promise<any>;
  getHistory: (params?: any) => Promise<any>;
  getDeviceStats: (deviceId: number, params?: any) => Promise<any>;
  createGlobalVariable: (variable: any) => Promise<any>;
  deleteGlobalVariable: (name: string) => Promise<void>;
  createBackup: () => Promise<any>;
  getBackups: () => Promise<any[]>;
  restoreBackup: (backupId: string) => Promise<void>;
  getSettings: () => Promise<any>;
  updateSettings: (settings: Record<string, any>) => Promise<void>;
  restartSystem: () => Promise<void>;
  getEventLog: (params?: any) => Promise<any>;
  getGeofences: () => Promise<any[]>;
  createGeofence: (geofence: any) => Promise<any>;
  updateGeofence: (geofenceId: number, updates: any) => Promise<any>;
  deleteGeofence: (geofenceId: number) => Promise<void>;
  getPlugins: () => Promise<any[]>;
  installPlugin: (url: string) => Promise<any>;
  uninstallPlugin: (pluginId: string) => Promise<any>;
  restartPlugin: (pluginId: string) => Promise<any>;
  triggerCustomEvent: (name: string, data?: any) => Promise<any>;
  getZWaveNetwork: () => Promise<any>;
  startZWaveInclusion: () => Promise<void>;
  stopZWaveInclusion: () => Promise<void>;
  startZWaveExclusion: () => Promise<void>;
  stopZWaveExclusion: () => Promise<void>;
  removeFailedZWaveNode: (nodeId: number) => Promise<void>;
  healZWaveNetwork: () => Promise<void>;
};

export function getTools(): ListToolsResult {
  const toolset = (process.env.FIBARO_TOOLSET || "intent").toLowerCase();

  const withFormat = (tools: any[]) => {
    return tools.map((t) => {
      const inputSchema = t?.inputSchema;
      if (!inputSchema || inputSchema.type !== "object") return t;
      const properties = inputSchema.properties || {};
      if (properties.format) return t;
      return {
        ...t,
        inputSchema: {
          ...inputSchema,
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            ...properties,
          },
        },
      };
    });
  };

  const intentTools: ListToolsResult = {
    tools: [
      {
        name: "first_run",
        description:
          "Setup helper. Use this when configuration is missing. Returns step-by-step instructions plus config templates for common MCP clients.",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            client: {
              type: "string",
              description:
                "Which MCP client you are using (Claude Desktop / Cursor / VS Code extension / Other)",
            },
            os: {
              type: "string",
              description: "Your OS (macOS / Windows / Linux)",
            },
            repo_path: {
              type: "string",
              description:
                "Absolute path to this repo (used to build the node args pointing to dist/index.js)",
            },
            fibaro_host: {
              type: "string",
              description: "Fibaro Home Center host (IP or hostname)",
            },
            fibaro_username: {
              type: "string",
              description: "Fibaro username",
            },
            fibaro_https: {
              type: "boolean",
              description: "Whether Fibaro uses HTTPS (default: true)",
            },
            fibaro_port: {
              type: "number",
              description: "Port (default: 443 for HTTPS, 80 for HTTP)",
            },
          },
        },
      },
      {
        name: "fibaro_device",
        description:
          "Device intent tool: list/get/control devices and perform common actions (turn on/off, set brightness/color/temperature, call arbitrary action, read Quick App Lua).",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description:
                "Operation: list|get|action|turn_on|turn_off|set_brightness|set_color|set_temperature|delete|get_lua",
            },
            device_id: { type: "number", description: "Device ID (required for most ops)" },
            action: { type: "string", description: "Fibaro action name (for op=action)" },
            args: { type: "array", items: {}, description: "Action arguments (for op=action)" },
            level: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Brightness % (op=set_brightness)",
            },
            r: { type: "number", minimum: 0, maximum: 255 },
            g: { type: "number", minimum: 0, maximum: 255 },
            b: { type: "number", minimum: 0, maximum: 255 },
            w: {
              type: "number",
              minimum: 0,
              maximum: 255,
              description: "Optional white channel (0-255)",
            },
            temperature: {
              type: "number",
              description: "Target temperature °C (op=set_temperature)",
            },
            room_id: { type: "number", description: "Filter for op=list" },
            section_id: { type: "number", description: "Filter for op=list" },
            type: { type: "string", description: "Filter by Fibaro device type for op=list" },
            base_type: { type: "string", description: "Filter by baseType for op=list" },
            name: {
              type: "string",
              description: "Filter by name (case-insensitive, ignores diacritics) for op=list",
            },
            interface: {
              type: "string",
              description: "Filter by interface/capability for op=list",
            },
            parent_id: { type: "number", description: "Filter by parent device ID for op=list" },
            enabled: { type: "boolean", description: "Filter by enabled for op=list" },
            visible: { type: "boolean", description: "Filter by visible for op=list" },
            dead: { type: "boolean", description: "Filter by dead/unresponsive for op=list" },
            properties: {
              type: "array",
              items: { type: "string" },
              description: "For op=list: return only selected properties (same as list_devices)",
            },
          },
          required: ["op"],
        },
      },
      {
        name: "fibaro_scene",
        description:
          "Scene intent tool: list/get/run/stop scenes and manage Lua scenes (create, update Lua, get Lua, delete).",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description: "Operation: list|get|run|stop|get_lua|create|update_lua|delete",
            },
            scene_id: { type: "number" },
            room_id: {
              type: "number",
              description: "Filter for op=list or target room for op=create/update_lua",
            },
            name: { type: "string", description: "Scene name (op=create/update_lua)" },
            lua: { type: "string", description: "Lua code (op=create/update_lua)" },
          },
          required: ["op"],
        },
      },
      {
        name: "fibaro_variable",
        description: "Variable intent tool: list/get/set/create/delete global variables.",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: { type: "string", description: "Operation: list|get|set|create|delete" },
            name: { type: "string", description: "Variable name" },
            value: { type: "string", description: "Variable value (op=set/create)" },
            variable: { type: "object", description: "Advanced create payload (op=create)" },
          },
          required: ["op"],
        },
      },
      {
        name: "fibaro_quick_app",
        description:
          "Quick App intent tool: list/create/update code/update variables/get lua/delete.",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description: "Operation: list|create|update_code|update_variables|get_lua|delete",
            },
            device_id: { type: "number", description: "Quick App device ID" },
            name: { type: "string", description: "Quick App name (op=create)" },
            type: { type: "string", description: "Quick App type (op=create)" },
            room_id: { type: "number", description: "Room ID (op=create)" },
            code: { type: "string", description: "Lua code (op=create/update_code)" },
            variables: {
              type: "array",
              items: {
                type: "object",
                properties: { name: { type: "string" }, value: {}, type: { type: "string" } },
                required: ["name", "value"],
              },
              description: "Variables array (op=update_variables)",
            },
          },
          required: ["op"],
        },
      },
      {
        name: "fibaro_home",
        description:
          "Home/system intent tool: rooms/sections/users/profiles/notifications/alarms/zwave/backups/settings/weather/system info/custom events/plugins.",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description:
                "Operation: system_info|weather|energy_panel|rooms|sections|create_room|update_room|delete_room|create_section|update_section|delete_section|users|create_user|update_user|delete_user|profiles|get_active_profile|set_active_profile|notifications|send_notification|alarms|arm_alarm|disarm_alarm|zwave_network|start_zwave_inclusion|stop_zwave_inclusion|start_zwave_exclusion|stop_zwave_exclusion|remove_failed_zwave_node|heal_zwave_network|create_backup|list_backups|restore_backup|get_settings|update_settings|restart_system|get_event_log|geofences|create_geofence|update_geofence|delete_geofence|plugins|install_plugin|uninstall_plugin|restart_plugin|trigger_custom_event|device_stats",
            },
            room_id: { type: "number" },
            section_id: { type: "number" },
            name: { type: "string" },
            icon: { type: "string" },
            user_id: { type: "number" },
            username: { type: "string" },
            password: { type: "string" },
            email: { type: "string" },
            type: { type: "string" },
            profile_id: { type: "number" },
            partition_id: { type: "number" },
            node_id: { type: "number" },
            backup_id: { type: "string" },
            settings: { type: "object" },
            from: { type: "number" },
            to: { type: "number" },
            limit: { type: "number" },
            geofence_id: { type: "number" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            radius: { type: "number" },
            plugin_id: { type: "string" },
            url: { type: "string" },
            event_name: { type: "string" },
            data: { type: "object" },
            notification: { type: "object" },
            title: { type: "string" },
            text: { type: "string" },
            users: { type: "array", items: { type: "number" } },
            device_id: { type: "number" },
            params: { type: "object" },
            aggregation: {
              type: "string",
              enum: ["raw", "1min", "5min", "15min", "1hour", "6hour", "auto"],
              description: "For device_stats: aggregation interval (auto selects based on time span)",
            },
            max_points: {
              type: "number",
              description: "For device_stats: max data points (default: 1000)",
            },
            metrics: {
              type: "array",
              items: { type: "string", enum: ["power", "energy", "voltage", "current"] },
              description: "For device_stats: metrics to include",
            },
            property: { type: "string", description: "For device_stats: legacy property filter" },
          },
          required: ["op"],
        },
      },
      {
        name: "find_by_name",
        description:
          "Find devices, rooms, or scenes by name (case-insensitive, ignores diacritics). Returns ranked candidates.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            kinds: {
              type: "array",
              items: { type: "string" },
              description: "Optional: Restrict search kinds (devices|rooms|scenes)",
            },
            limit: { type: "number", description: "Max results per kind (default: 20)" },
          },
          required: ["query"],
        },
      },
      {
        name: "resolve_by_name",
        description:
          "Resolve a single device by name (or multiple devices if the query is plural). Errors on ambiguity for singular queries.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: 'Name query (e.g., "kitchen light")' },
            kind: {
              type: "string",
              description: "Optional: Restrict kind (device|room|scene). Default: device",
            },
          },
          required: ["query"],
        },
      },
    ],
  };

  if (toolset === "intent") {
    return { tools: withFormat(intentTools.tools) };
  }

  const legacy: ListToolsResult = {
    tools: [
      {
        name: "first_run",
        description:
          "Setup helper. Use this when configuration is missing. Returns step-by-step instructions plus config templates for common MCP clients.",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            client: {
              type: "string",
              description:
                "Which MCP client you are using (Claude Desktop / Cursor / VS Code extension / Other)",
            },
            os: {
              type: "string",
              description: "Your OS (macOS / Windows / Linux)",
            },
            repo_path: {
              type: "string",
              description:
                "Absolute path to this repo (used to build the node args pointing to dist/index.js)",
            },
            fibaro_host: {
              type: "string",
              description: "Fibaro Home Center host (IP or hostname)",
            },
            fibaro_username: {
              type: "string",
              description: "Fibaro username",
            },
            fibaro_https: {
              type: "boolean",
              description: "Whether Fibaro uses HTTPS (default: true)",
            },
            fibaro_port: {
              type: "number",
              description: "Port (default: 443 for HTTPS, 80 for HTTP)",
            },
          },
        },
      },
      {
        name: "list_devices",
        description: "List all devices in the Fibaro system",
        inputSchema: {
          type: "object",
          properties: {
            room_id: {
              type: "number",
              description: "Optional: Filter devices by room ID",
            },
            section_id: {
              type: "number",
              description: "Optional: Filter devices by section ID",
            },
            type: {
              type: "string",
              description: "Optional: Filter devices by type (e.g., com.fibaro.binarySwitch)",
            },
            base_type: {
              type: "string",
              description: "Optional: Filter devices by base type category",
            },
            name: {
              type: "string",
              description:
                "Optional: Filter devices by name (case-insensitive, ignores diacritics)",
            },
            interface: {
              type: "string",
              description:
                'Optional: Filter devices by interface/capability (e.g., "battery", "power", "light")',
            },
            parent_id: {
              type: "number",
              description: "Optional: Filter devices by parent device ID",
            },
            enabled: {
              type: "boolean",
              description: "Optional: Filter by enabled status (true/false)",
            },
            visible: {
              type: "boolean",
              description: "Optional: Filter by visible status (true/false)",
            },
            dead: {
              type: "boolean",
              description: "Optional: Filter by dead/unresponsive status (true/false)",
            },
            properties: {
              type: "array",
              items: { type: "string" },
              description:
                'Optional: Return only these properties for each device (e.g., ["id", "name", "roomID", "value"]). If not specified, returns all properties.',
            },
          },
        },
      },
      {
        name: "get_device",
        description: "Get detailed information about a specific device",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "number",
              description: "The ID of the device",
            },
          },
          required: ["device_id"],
        },
      },
      {
        name: "control_device",
        description: "Control a device by calling an action",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "number",
              description: "The ID of the device to control",
            },
            action: {
              type: "string",
              description: "The action to perform (e.g., turnOn, turnOff, setValue)",
            },
            args: {
              type: "array",
              description: "Optional arguments for the action",
              items: {},
            },
          },
          required: ["device_id", "action"],
        },
      },
      {
        name: "turn_on",
        description: "Turn on a device (light, switch, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "number",
              description: "The ID of the device to turn on",
            },
          },
          required: ["device_id"],
        },
      },
      {
        name: "turn_off",
        description: "Turn off a device (light, switch, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "number",
              description: "The ID of the device to turn off",
            },
          },
          required: ["device_id"],
        },
      },
      {
        name: "set_brightness",
        description: "Set brightness level for a dimmable light",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "number",
              description: "The ID of the device",
            },
            level: {
              type: "number",
              description: "Brightness level (0-100)",
              minimum: 0,
              maximum: 100,
            },
          },
          required: ["device_id", "level"],
        },
      },
      {
        name: "set_color",
        description: "Set RGB color for a color-capable light",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "number",
              description: "The ID of the device",
            },
            r: {
              type: "number",
              description: "Red value (0-255)",
              minimum: 0,
              maximum: 255,
            },
            g: {
              type: "number",
              description: "Green value (0-255)",
              minimum: 0,
              maximum: 255,
            },
            b: {
              type: "number",
              description: "Blue value (0-255)",
              minimum: 0,
              maximum: 255,
            },
            w: {
              type: "number",
              description: "White value (0-255), optional",
              minimum: 0,
              maximum: 255,
            },
          },
          required: ["device_id", "r", "g", "b"],
        },
      },
      {
        name: "set_temperature",
        description: "Set the target temperature for a thermostat",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "number",
              description: "The ID of the thermostat device",
            },
            temperature: {
              type: "number",
              description: "Target temperature in Celsius",
            },
          },
          required: ["device_id", "temperature"],
        },
      },
      {
        name: "list_rooms",
        description: "List all rooms in the Fibaro system",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_sections",
        description: "List all sections in the Fibaro system",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_scenes",
        description: "List all scenes in the Fibaro system",
        inputSchema: {
          type: "object",
          properties: {
            room_id: {
              type: "number",
              description: "Optional: Filter scenes by room ID",
            },
          },
        },
      },
      {
        name: "get_scene",
        description: "Get detailed information about a specific scene",
        inputSchema: {
          type: "object",
          properties: {
            scene_id: {
              type: "number",
              description: "The ID of the scene",
            },
          },
          required: ["scene_id"],
        },
      },
      {
        name: "run_scene",
        description: "Execute a scene",
        inputSchema: {
          type: "object",
          properties: {
            scene_id: {
              type: "number",
              description: "The ID of the scene to run",
            },
          },
          required: ["scene_id"],
        },
      },
      {
        name: "stop_scene",
        description: "Stop a running scene",
        inputSchema: {
          type: "object",
          properties: {
            scene_id: {
              type: "number",
              description: "The ID of the scene to stop",
            },
          },
          required: ["scene_id"],
        },
      },
      {
        name: "list_global_variables",
        description: "List all global variables",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_global_variable",
        description: "Get the value of a specific global variable",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the global variable",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "set_global_variable",
        description: "Set the value of a global variable",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the global variable",
            },
            value: {
              type: "string",
              description: "The new value for the variable",
            },
          },
          required: ["name", "value"],
        },
      },
      {
        name: "get_system_info",
        description: "Get system information about the Fibaro Home Center",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_weather",
        description: "Get current weather information",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_energy_panel",
        description: "Get energy consumption data from the energy panel",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_scene_lua",
        description: "Get the Lua script code from a scene",
        inputSchema: {
          type: "object",
          properties: {
            scene_id: {
              type: "number",
              description: "The ID of the scene",
            },
          },
          required: ["scene_id"],
        },
      },
      {
        name: "list_quick_apps",
        description: "List all Quick Apps (Lua-based applications)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_device_lua",
        description: "Get Lua code and variables from a device (Quick App)",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "number",
              description: "The ID of the device/Quick App",
            },
          },
          required: ["device_id"],
        },
      },
      {
        name: "create_scene",
        description: "Create a new Lua scene",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the scene",
            },
            room_id: {
              type: "number",
              description: "The room ID where the scene should be placed",
            },
            lua: {
              type: "string",
              description: "The Lua code for the scene",
            },
          },
          required: ["name", "room_id"],
        },
      },
      {
        name: "update_scene_lua",
        description: "Update the Lua code of an existing scene",
        inputSchema: {
          type: "object",
          properties: {
            scene_id: {
              type: "number",
              description: "The ID of the scene to update",
            },
            lua: {
              type: "string",
              description: "The new Lua code for the scene",
            },
            name: {
              type: "string",
              description: "Optional: Update the scene name",
            },
            room_id: {
              type: "number",
              description: "Optional: Move the scene to a different room",
            },
          },
          required: ["scene_id"],
        },
      },
      {
        name: "delete_scene",
        description: "Delete a scene",
        inputSchema: {
          type: "object",
          properties: {
            scene_id: {
              type: "number",
              description: "The ID of the scene to delete",
            },
          },
          required: ["scene_id"],
        },
      },
      {
        name: "create_quick_app",
        description: "Create a new Quick App (Lua application)",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the Quick App",
            },
            type: {
              type: "string",
              description: "The Quick App type (e.g., com.fibaro.quickApp)",
            },
            room_id: {
              type: "number",
              description: "Optional: The room ID",
            },
            code: {
              type: "string",
              description: "The Lua code for the Quick App",
            },
          },
          required: ["name", "type"],
        },
      },
      {
        name: "update_quick_app_code",
        description: "Update the Lua code of a Quick App",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "number",
              description: "The ID of the Quick App device",
            },
            code: {
              type: "string",
              description: "The new Lua code",
            },
          },
          required: ["device_id", "code"],
        },
      },
      {
        name: "update_quick_app_variables",
        description: "Update Quick App variables",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "number",
              description: "The ID of the Quick App device",
            },
            variables: {
              type: "array",
              description: "Array of variables with name, value, and optional type",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  value: {},
                  type: { type: "string" },
                },
                required: ["name", "value"],
              },
            },
          },
          required: ["device_id", "variables"],
        },
      },
      {
        name: "delete_device",
        description: "Delete a device (including Quick Apps)",
        inputSchema: {
          type: "object",
          properties: {
            device_id: {
              type: "number",
              description: "The ID of the device to delete",
            },
          },
          required: ["device_id"],
        },
      },
      {
        name: "create_room",
        description: "Create a new room",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Room name" },
            section_id: { type: "number", description: "Section ID" },
            icon: { type: "string", description: "Optional: Icon name" },
          },
          required: ["name", "section_id"],
        },
      },
      {
        name: "update_room",
        description: "Update room properties",
        inputSchema: {
          type: "object",
          properties: {
            room_id: { type: "number" },
            name: { type: "string" },
            section_id: { type: "number" },
            icon: { type: "string" },
          },
          required: ["room_id"],
        },
      },
      {
        name: "delete_room",
        description: "Delete a room",
        inputSchema: {
          type: "object",
          properties: {
            room_id: { type: "number" },
          },
          required: ["room_id"],
        },
      },
      {
        name: "create_section",
        description: "Create a new section",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            icon: { type: "string" },
          },
          required: ["name"],
        },
      },
      {
        name: "update_section",
        description: "Update section properties",
        inputSchema: {
          type: "object",
          properties: {
            section_id: { type: "number" },
            name: { type: "string" },
            icon: { type: "string" },
          },
          required: ["section_id"],
        },
      },
      {
        name: "delete_section",
        description: "Delete a section",
        inputSchema: {
          type: "object",
          properties: {
            section_id: { type: "number" },
          },
          required: ["section_id"],
        },
      },
      {
        name: "list_users",
        description: "List all users",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create_user",
        description: "Create a new user",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            username: { type: "string" },
            password: { type: "string" },
            email: { type: "string" },
            type: { type: "string" },
          },
          required: ["name", "username", "password"],
        },
      },
      {
        name: "update_user",
        description: "Update user properties",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "number" },
            name: { type: "string" },
            email: { type: "string" },
            password: { type: "string" },
          },
          required: ["user_id"],
        },
      },
      {
        name: "delete_user",
        description: "Delete a user",
        inputSchema: {
          type: "object",
          properties: {
            user_id: { type: "number" },
          },
          required: ["user_id"],
        },
      },
      {
        name: "list_profiles",
        description: "List all home profiles/modes",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_active_profile",
        description: "Get the currently active profile",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "set_active_profile",
        description: "Set the active profile/mode",
        inputSchema: {
          type: "object",
          properties: {
            profile_id: { type: "number" },
          },
          required: ["profile_id"],
        },
      },
      {
        name: "list_notifications",
        description: "List all notifications",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "send_notification",
        description: "Send a notification to users",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string" },
            title: { type: "string" },
            text: { type: "string" },
            users: { type: "array", items: { type: "number" } },
          },
          required: ["type", "text"],
        },
      },
      {
        name: "list_alarms",
        description: "List all alarm partitions",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "arm_alarm",
        description: "Arm an alarm partition",
        inputSchema: {
          type: "object",
          properties: {
            partition_id: { type: "number" },
          },
          required: ["partition_id"],
        },
      },
      {
        name: "disarm_alarm",
        description: "Disarm an alarm partition",
        inputSchema: {
          type: "object",
          properties: {
            partition_id: { type: "number" },
          },
          required: ["partition_id"],
        },
      },
      {
        name: "get_zwave_network",
        description: "Get Z-Wave network status and nodes",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "start_zwave_inclusion",
        description: "Start Z-Wave inclusion mode",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "stop_zwave_inclusion",
        description: "Stop Z-Wave inclusion mode",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "start_zwave_exclusion",
        description: "Start Z-Wave exclusion mode",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "stop_zwave_exclusion",
        description: "Stop Z-Wave exclusion mode",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "remove_failed_zwave_node",
        description: "Remove a failed Z-Wave node",
        inputSchema: {
          type: "object",
          properties: {
            node_id: { type: "number" },
          },
          required: ["node_id"],
        },
      },
      {
        name: "heal_zwave_network",
        description: "Heal the Z-Wave network",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create_backup",
        description: "Create a system backup",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_backups",
        description: "List available system backups",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "restore_backup",
        description: "Restore a system backup by ID",
        inputSchema: {
          type: "object",
          properties: {
            backup_id: { type: "string" },
          },
          required: ["backup_id"],
        },
      },
      {
        name: "get_settings",
        description: "Get system settings",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "update_settings",
        description: "Update system settings",
        inputSchema: {
          type: "object",
          properties: {
            settings: { type: "object" },
          },
          required: ["settings"],
        },
      },
      {
        name: "restart_system",
        description: "Restart the Fibaro Home Center",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_event_log",
        description: "Get event logs",
        inputSchema: {
          type: "object",
          properties: {
            from: { type: "number" },
            to: { type: "number" },
            type: { type: "string" },
            limit: { type: "number" },
          },
        },
      },
      {
        name: "list_geofences",
        description: "List all geofences",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create_geofence",
        description: "Create a new geofence",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            radius: { type: "number" },
          },
          required: ["name", "latitude", "longitude", "radius"],
        },
      },
      {
        name: "update_geofence",
        description: "Update an existing geofence",
        inputSchema: {
          type: "object",
          properties: {
            geofence_id: { type: "number" },
            name: { type: "string" },
            latitude: { type: "number" },
            longitude: { type: "number" },
            radius: { type: "number" },
          },
          required: ["geofence_id"],
        },
      },
      {
        name: "delete_geofence",
        description: "Delete a geofence",
        inputSchema: {
          type: "object",
          properties: {
            geofence_id: { type: "number" },
          },
          required: ["geofence_id"],
        },
      },
      {
        name: "list_plugins",
        description: "List installed plugins",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "install_plugin",
        description: "Install a plugin from URL",
        inputSchema: {
          type: "object",
          properties: {
            url: { type: "string" },
          },
          required: ["url"],
        },
      },
      {
        name: "uninstall_plugin",
        description: "Uninstall a plugin by ID",
        inputSchema: {
          type: "object",
          properties: {
            plugin_id: { type: "string" },
          },
          required: ["plugin_id"],
        },
      },
      {
        name: "restart_plugin",
        description: "Restart a plugin by ID",
        inputSchema: {
          type: "object",
          properties: {
            plugin_id: { type: "string" },
          },
          required: ["plugin_id"],
        },
      },
      {
        name: "trigger_custom_event",
        description: "Trigger a custom event",
        inputSchema: {
          type: "object",
          properties: {
            event_name: { type: "string" },
            data: {},
          },
          required: ["event_name"],
        },
      },
      {
        name: "list_climate_zones",
        description: "List climate zones",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "set_climate_mode",
        description: "Set climate mode for a zone",
        inputSchema: {
          type: "object",
          properties: {
            zone_id: { type: "number" },
            mode: { type: "string" },
          },
          required: ["zone_id", "mode"],
        },
      },
      {
        name: "get_device_stats",
        description:
          "Get device energy/power statistics with intelligent aggregation. Automatically handles large datasets by aggregating data based on time span. Returns aggregated metrics (power, energy, voltage, current) with min/max/avg values per time bucket.",
        inputSchema: {
          type: "object",
          properties: {
            device_id: { type: "number", description: "Device ID to get stats for" },
            from: { type: "number", description: "Start timestamp (Unix seconds)" },
            to: { type: "number", description: "End timestamp (Unix seconds)" },
            property: { type: "string", description: "Legacy: specific property to fetch" },
            aggregation: {
              type: "string",
              enum: ["raw", "1min", "5min", "15min", "1hour", "6hour", "auto"],
              description:
                "Aggregation interval. 'auto' (default) selects based on time span: <=1h: raw, <=6h: 5min, <=24h: 15min, <=7d: 1hour, >7d: 6hour",
            },
            max_points: {
              type: "number",
              description: "Maximum data points to return (default: 1000). Data will be downsampled if exceeded.",
            },
            metrics: {
              type: "array",
              items: { type: "string", enum: ["power", "energy", "voltage", "current"] },
              description: "Metrics to include (default: all available). Power/voltage/current use averages, energy uses sum/delta.",
            },
          },
          required: ["device_id"],
        },
      },
      {
        name: "create_global_variable",
        description: "Create a global variable",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            value: { type: "string" },
            is_enum: { type: "boolean" },
            enum_values: { type: "array", items: { type: "string" } },
          },
          required: ["name", "value"],
        },
      },
      {
        name: "delete_global_variable",
        description: "Delete a global variable",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        },
      },
      {
        name: "find_by_name",
        description:
          "Find rooms and/or devices by name in a single call (case-insensitive, ignores diacritics). Returns matches enriched with room/section names.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search string (case-insensitive, ignores diacritics)",
            },
            kind: {
              type: "string",
              description: 'What to search: "devices", "rooms", or "all" (default: all)',
              enum: ["devices", "rooms", "all"],
            },
            exact: {
              type: "boolean",
              description:
                "If true, requires exact normalized match. If false, uses substring match (default: false).",
            },
            allow_multiple: {
              type: "boolean",
              description:
                'If true, allows multiple matches. If omitted, multiple matches are allowed only when the query appears plural (e.g., ends with "s" or starts with "all").',
            },
            limit: {
              type: "number",
              description: "Max results per kind (default: 20)",
            },
            format: { type: "string", enum: ["json", "text"] },
          },
          required: ["query"],
        },
      },
      {
        name: "resolve_by_name",
        description:
          'Resolve rooms and/or devices by name. By default requires a unique match, but automatically allows multiple matches when the query is plural (e.g., "lights", "all lamps").',
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search string (case-insensitive, ignores diacritics)",
            },
            kind: {
              type: "string",
              description: 'What to resolve: "devices", "rooms", or "all" (default: devices)',
              enum: ["devices", "rooms", "all"],
            },
            exact: {
              type: "boolean",
              description:
                "If true, requires exact normalized match. If false, uses substring match (default: false).",
            },
            allow_multiple: {
              type: "boolean",
              description:
                'If true, allows multiple matches. If omitted, multiple matches are allowed only when the query appears plural (e.g., ends with "s" or starts with "all").',
            },
            limit: {
              type: "number",
              description: "Max results per kind (default: 20)",
            },
            format: { type: "string", enum: ["json", "text"] },
          },
          required: ["query"],
        },
      },
      {
        name: "fibaro_template",
        description:
          "Scene template management: list available templates, get template details, instantiate templates with parameters, add custom templates, or delete templates",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description: "Operation: list|get|instantiate|create|delete",
              enum: ["list", "get", "instantiate", "create", "delete"],
            },
            category: {
              type: "string",
              description: "Filter templates by category (for op=list)",
              enum: ["lighting", "security", "energy", "climate", "custom"],
            },
            template_id: {
              type: "string",
              description: "Template ID (required for op=get|instantiate|delete)",
            },
            scene_name: {
              type: "string",
              description: "Name for the new scene (required for op=instantiate)",
            },
            room_id: {
              type: "number",
              description: "Room ID for the new scene (required for op=instantiate)",
            },
            parameters: {
              type: "object",
              description:
                "Template parameters as key-value pairs (required for op=instantiate). Parameter types: device_id (number), number, string, time (HH:MM format), boolean",
            },
            template: {
              type: "object",
              description: "Custom template definition (required for op=create)",
            },
          },
          required: ["op"],
        },
      },
      {
        name: "fibaro_history",
        description:
          "Device state history: query historical device states, calculate statistics, aggregate data by time intervals, and export history",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description: "Operation: query|stats|aggregate|export",
              enum: ["query", "stats", "aggregate", "export"],
            },
            device_id: {
              type: "number",
              description: "Device ID (required for all ops)",
            },
            from: {
              type: "number",
              description: "Start timestamp in milliseconds (Unix epoch)",
            },
            to: {
              type: "number",
              description: "End timestamp in milliseconds (Unix epoch)",
            },
            property: {
              type: "string",
              description: "Device property to query (e.g., 'value', 'power', 'temperature')",
            },
            limit: {
              type: "number",
              description: "Maximum number of entries to return (default: 1000)",
            },
            interval: {
              type: "string",
              description: "Time interval for aggregation (for op=aggregate)",
              enum: ["5m", "15m", "1h", "6h", "1d", "1w"],
            },
            aggregation: {
              type: "string",
              description: "Aggregation function (for op=aggregate)",
              enum: ["last", "avg", "min", "max", "sum", "count"],
            },
          },
          required: ["op", "device_id"],
        },
      },
      {
        name: "fibaro_scene_history",
        description:
          "Scene execution history: track scene runs, analyze performance, calculate success rates and execution durations",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description: "Operation: query|stats|performance",
              enum: ["query", "stats", "performance"],
            },
            scene_id: {
              type: "number",
              description: "Scene ID (optional - if not provided, returns all scenes)",
            },
            from: {
              type: "number",
              description: "Start timestamp in milliseconds (Unix epoch)",
            },
            to: {
              type: "number",
              description: "End timestamp in milliseconds (Unix epoch)",
            },
            status: {
              type: "string",
              description: "Filter by execution status",
              enum: ["success", "failure", "timeout"],
            },
            limit: {
              type: "number",
              description: "Maximum number of entries to return (default: 1000)",
            },
          },
          required: ["op"],
        },
      },
      {
        name: "fibaro_backup",
        description:
          "Comprehensive backup and restore: export Fibaro system configuration to JSON/YAML, validate imports, restore configurations",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description: "Operation: export|import|validate",
              enum: ["export", "import", "validate"],
            },
            export_format: {
              type: "string",
              description: "Export/Import file format (default: json)",
              enum: ["json", "yaml"],
            },
            include: {
              type: "array",
              description: "Data types to include in export",
              items: {
                type: "string",
                enum: ["devices", "scenes", "rooms", "sections", "variables", "users"],
              },
            },
            exclude: {
              type: "array",
              description: "Data types to exclude from export",
              items: {
                type: "string",
                enum: ["devices", "scenes", "rooms", "sections", "variables", "users"],
              },
            },
            include_users: {
              type: "boolean",
              description: "Include users in export (default: false for security)",
            },
            include_passwords: {
              type: "boolean",
              description: "Include passwords in user export (default: false)",
            },
            import_data: {
              type: "string",
              description: "JSON/YAML string of exported data for import/validate operations",
            },
            dry_run: {
              type: "boolean",
              description: "Validate import without making changes (default: false)",
            },
            skip_existing: {
              type: "boolean",
              description: "Skip items that already exist (default: false)",
            },
            update_existing: {
              type: "boolean",
              description: "Update existing items during import (default: false)",
            },
            import_types: {
              type: "array",
              description: "Data types to import (default: all)",
              items: {
                type: "string",
                enum: ["devices", "scenes", "rooms", "sections", "variables", "users"],
              },
            },
          },
          required: ["op"],
        },
      },
      {
        name: "fibaro_bulk",
        description:
          "Bulk operations: execute batch actions on multiple devices matching query criteria (room, type, interface, name pattern, properties)",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description: "Operation: execute|preview",
              enum: ["execute", "preview"],
            },
            query: {
              type: "object",
              description: "Device query criteria",
              properties: {
                device_ids: {
                  type: "array",
                  items: { type: "number" },
                  description: "Specific device IDs to target",
                },
                room_ids: {
                  type: "array",
                  items: { type: "number" },
                  description: "Filter by room IDs",
                },
                section_ids: {
                  type: "array",
                  items: { type: "number" },
                  description: "Filter by section IDs",
                },
                type: {
                  type: "string",
                  description: "Filter by device type",
                },
                base_type: {
                  type: "string",
                  description: "Filter by base type",
                },
                interface: {
                  type: "string",
                  description: "Filter by interface/capability",
                },
                name_pattern: {
                  type: "string",
                  description: "Filter by name pattern (regex)",
                },
                property: {
                  type: "object",
                  description: "Filter by property value",
                  properties: {
                    name: { type: "string" },
                    value: {},
                    operator: {
                      type: "string",
                      enum: ["==", "!=", ">", "<", ">=", "<="],
                    },
                  },
                  required: ["name", "value"],
                },
                enabled: {
                  type: "boolean",
                  description: "Filter by enabled status",
                },
                visible: {
                  type: "boolean",
                  description: "Filter by visible status",
                },
              },
            },
            action: {
              type: "object",
              description: "Action to execute on matched devices",
              properties: {
                type: {
                  type: "string",
                  enum: ["device_action", "set_property", "update_config", "enable", "disable"],
                  description: "Type of action",
                },
                action: {
                  type: "string",
                  description: "Action name (for device_action)",
                },
                args: {
                  type: "array",
                  description: "Action arguments (for device_action)",
                },
                property: {
                  type: "string",
                  description: "Property name (for set_property)",
                },
                value: {
                  description: "Property value (for set_property)",
                },
                config: {
                  type: "object",
                  description: "Config updates (for update_config)",
                },
              },
              required: ["type"],
            },
            options: {
              type: "object",
              description: "Operation options",
              properties: {
                dry_run: {
                  type: "boolean",
                  description: "Preview without executing (default: false)",
                },
                parallel: {
                  type: "boolean",
                  description: "Execute in parallel (default: false)",
                },
                concurrency: {
                  type: "number",
                  description: "Max parallel operations (default: 5)",
                },
                stop_on_error: {
                  type: "boolean",
                  description: "Stop on first error (default: false)",
                },
                rollback_on_error: {
                  type: "boolean",
                  description: "Rollback successful operations on error (default: false)",
                },
              },
            },
          },
          required: ["op"],
        },
      },
      {
        name: "fibaro_repl",
        description:
          "Interactive Lua REPL: execute Lua code in sandboxed temporary scenes, manage REPL sessions, get execution output",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description: "Operation: execute|list_sessions|clear_session|clear_all|sync",
              enum: ["execute", "list_sessions", "clear_session", "clear_all", "sync"],
            },
            code: {
              type: "string",
              description: "Lua code to execute (required for execute operation)",
            },
            session_id: {
              type: "string",
              description: "REPL session ID (optional - will create new session if not provided)",
            },
            timeout: {
              type: "number",
              description: "Execution timeout in milliseconds (default: 30000)",
            },
            room_id: {
              type: "number",
              description: "Room ID for new session scenes (default: 1)",
            },
          },
          required: ["op"],
        },
      },
      {
        name: "fibaro_analytics",
        description:
          "Analytics and insights: device usage patterns, energy trends, scene frequency, system health, dashboard generation",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description:
                "Operation: device_usage|energy_trends|scene_frequency|system_health|dashboard|hourly_distribution|room_activity",
              enum: [
                "device_usage",
                "energy_trends",
                "scene_frequency",
                "system_health",
                "dashboard",
                "hourly_distribution",
                "room_activity",
              ],
            },
            from: {
              type: "number",
              description: "Start timestamp (default: 7 days ago)",
            },
            to: {
              type: "number",
              description: "End timestamp (default: now)",
            },
            device_ids: {
              type: "array",
              items: { type: "number" },
              description: "Filter by device IDs",
            },
            scene_ids: {
              type: "array",
              items: { type: "number" },
              description: "Filter by scene IDs",
            },
            room_ids: {
              type: "array",
              items: { type: "number" },
              description: "Filter by room IDs",
            },
            group_by: {
              type: "string",
              enum: ["hour", "day", "week", "month"],
              description: "Time grouping for trends (default: day)",
            },
            limit: {
              type: "number",
              description: "Limit number of results (default: all)",
            },
          },
          required: ["op"],
        },
      },
      {
        name: "fibaro_integration",
        description:
          "External integrations: webhook server (HTTP endpoints) and MQTT bridge (pub/sub). Requires optional dependencies (express, mqtt).",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description: "Operation: webhook_start|webhook_stop|webhook_status|mqtt_connect|mqtt_disconnect|mqtt_status|mqtt_publish",
              enum: [
                "webhook_start",
                "webhook_stop",
                "webhook_status",
                "mqtt_connect",
                "mqtt_disconnect",
                "mqtt_status",
                "mqtt_publish",
              ],
            },
            webhook_config: {
              type: "object",
              description: "Webhook server configuration (for webhook_start)",
              properties: {
                port: { type: "number" },
                host: { type: "string" },
                authToken: { type: "string" },
                routes: { type: "array" },
              },
            },
            mqtt_config: {
              type: "object",
              description: "MQTT configuration (for mqtt_connect)",
              properties: {
                broker: { type: "string" },
                clientId: { type: "string" },
                username: { type: "string" },
                password: { type: "string" },
                subscriptions: { type: "array" },
                publishState: { type: "boolean" },
              },
            },
            topic: {
              type: "string",
              description: "MQTT topic (for mqtt_publish)",
            },
            message: {
              type: "string",
              description: "MQTT message payload (for mqtt_publish)",
            },
            qos: {
              type: "number",
              enum: [0, 1, 2],
              description: "MQTT QoS level (for mqtt_publish)",
            },
          },
          required: ["op"],
        },
      },
      {
        name: "fibaro_automation",
        description:
          "Advanced automation builder: create complex multi-step automations with conditions and actions, generate Fibaro Lua scenes",
        inputSchema: {
          type: "object",
          properties: {
            format: {
              type: "string",
              description: "Output format: text (default) or json (stringified MCP result)",
            },
            op: {
              type: "string",
              description: "Operation: create|validate|generate_lua",
              enum: ["create", "validate", "generate_lua"],
            },
            automation: {
              type: "object",
              description: "Automation definition",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                conditions: { type: "object" },
                actions: { type: "array" },
                enabled: { type: "boolean" },
              },
              required: ["name", "conditions", "actions"],
            },
            deploy: {
              type: "boolean",
              description: "Deploy automation as Fibaro scene (for create operation)",
            },
          },
          required: ["op"],
        },
      },
    ],
  };

  if (toolset === "legacy") {
    return { tools: withFormat(legacy.tools) };
  }

  if (toolset === "both") {
    return { tools: withFormat([...intentTools.tools, ...legacy.tools]) };
  }

  return { tools: withFormat(legacy.tools) };
}

export function handleFirstRun(args: any): CallToolResult {
  const client = args?.client ? String(args.client) : "<your MCP client>";
  const os = args?.os ? String(args.os) : "<your OS>";
  const repoPath = args?.repo_path ? String(args.repo_path) : "<ABSOLUTE_REPO_PATH>";
  const fibaroHost = args?.fibaro_host ? String(args.fibaro_host) : "<FIBARO_HOST>";
  const fibaroUsername = args?.fibaro_username ? String(args.fibaro_username) : "<FIBARO_USERNAME>";
  const fibaroHttps = args?.fibaro_https !== undefined ? Boolean(args.fibaro_https) : true;
  const fibaroPort =
    args?.fibaro_port !== undefined ? Number(args.fibaro_port) : fibaroHttps ? 443 : 80;

  const suggestedConfigPath = os.toLowerCase().includes("win")
    ? "%USERPROFILE%\\fibaro-mcp.json"
    : "$HOME/fibaro-mcp.json";

  const text =
    `first_run: configuration helper\n\n` +
    `1) Build the server:\n` +
    `   - Option A (recommended): no build needed, use npx\n` +
    `   - Option B (from source): npm install && npm run build\n\n` +
    `2) Create a local Fibaro config file (do NOT commit it):\n` +
    `   Path: ${suggestedConfigPath}\n` +
    `   Contents:\n` +
    `   {\n` +
    `     "host": "${fibaroHost}",\n` +
    `     "username": "${fibaroUsername}",\n` +
    `     "password": "<FIBARO_PASSWORD>",\n` +
    `     "port": ${fibaroPort},\n` +
    `     "https": ${fibaroHttps}\n` +
    `   }\n\n` +
    `3) MCP client config for ${client} (recommended via npx):\n` +
    `   command: npx\n` +
    `   args: ["-y", "fibaro-mcp"]\n` +
    `   env: {\n` +
    `     "FIBARO_CONFIG": "${suggestedConfigPath}",\n` +
    `     "FIBARO_TOOLSET": "intent"\n` +
    `   }\n\n` +
    `4) Alternative (run from a local checkout):\n` +
    `   command: node\n` +
    `   args: ["${repoPath}/dist/index.js"]\n` +
    `   env: { "FIBARO_CONFIG": "${suggestedConfigPath}" }\n\n` +
    `5) Restart your MCP client and try: "List my Fibaro devices".\n\n` +
    `Security:\n` +
    `- Do not paste your password into chat logs.\n` +
    `- Do not commit fibaro-mcp.json or .env to git.\n`;

  return {
    content: [{ type: "text", text }],
  };
}

export function getResources(): ListResourcesResult {
  return {
    resources: [
      {
        uri: "fibaro://devices",
        mimeType: "application/json",
        name: "Devices",
        description: "List of all devices in the system",
      },
      {
        uri: "fibaro://rooms",
        mimeType: "application/json",
        name: "Rooms",
        description: "List of all rooms in the system",
      },
      {
        uri: "fibaro://scenes",
        mimeType: "application/json",
        name: "Scenes",
        description: "List of all scenes in the system",
      },
      {
        uri: "fibaro://system",
        mimeType: "application/json",
        name: "System Info",
        description: "System information",
      },
      {
        uri: "fibaro://weather",
        mimeType: "application/json",
        name: "Weather",
        description: "Current weather information",
      },
      {
        uri: "fibaro://analytics/dashboard",
        mimeType: "application/json",
        name: "Analytics Dashboard",
        description: "Comprehensive analytics dashboard with usage patterns, energy trends, and system health",
      },
    ],
  };
}

export async function handleResourceRead(
  client: FibaroClientLike,
  uri: string,
): Promise<ReadResourceResult> {
  let data: any;

  switch (uri) {
    case "fibaro://devices": {
      data = await client.getDevices();
      break;
    }
    case "fibaro://rooms": {
      data = await client.getRooms();
      break;
    }
    case "fibaro://scenes": {
      data = await client.getScenes();
      break;
    }
    case "fibaro://system": {
      data = await client.getSystemInfo();
      break;
    }
    case "fibaro://weather": {
      data = await client.getWeather();
      break;
    }
    case "fibaro://analytics/dashboard": {
      const { getAnalyticsEngine } = await import("./history/analytics-engine.js");
      const analytics = getAnalyticsEngine();

      // Parse query parameters from URI
      const url = new URL(uri, "fibaro://dummy");
      const period = url.searchParams.get("period");

      let options = {};
      if (period) {
        const days = period === "30d" ? 30 : period === "14d" ? 14 : 7;
        options = {
          from: Date.now() - days * 24 * 3600000,
          to: Date.now(),
        };
      }

      data = await analytics.generateDashboard(client, options);
      break;
    }
    default:
      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function handleToolCallInternal(
  client: FibaroClientLike,
  name: string,
  args: any,
): Promise<CallToolResult> {
  if (name === "first_run") {
    return handleFirstRun(args);
  }

  if (name === "fibaro_device") {
    const op = (args?.op as string | undefined)?.toLowerCase();
    if (!op) {
      throw new McpError(ErrorCode.InvalidParams, 'fibaro_device: missing required parameter "op"');
    }
    switch (op) {
      case "list":
        return handleToolCall(client, "list_devices", args);
      case "get":
        return handleToolCall(client, "get_device", { device_id: args?.device_id });
      case "action":
        return handleToolCall(client, "control_device", {
          device_id: args?.device_id,
          action: args?.action,
          args: args?.args,
        });
      case "turn_on":
        return handleToolCall(client, "turn_on", { device_id: args?.device_id });
      case "turn_off":
        return handleToolCall(client, "turn_off", { device_id: args?.device_id });
      case "set_brightness":
        return handleToolCall(client, "set_brightness", {
          device_id: args?.device_id,
          level: args?.level,
        });
      case "set_color":
        return handleToolCall(client, "set_color", {
          device_id: args?.device_id,
          r: args?.r,
          g: args?.g,
          b: args?.b,
          w: args?.w,
        });
      case "set_temperature":
        return handleToolCall(client, "set_temperature", {
          device_id: args?.device_id,
          temperature: args?.temperature,
        });
      case "delete":
        return handleToolCall(client, "delete_device", { device_id: args?.device_id });
      case "get_lua":
        return handleToolCall(client, "get_device_lua", { device_id: args?.device_id });
      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_device: unsupported op "${op}". Supported ops: list|get|action|turn_on|turn_off|set_brightness|set_color|set_temperature|delete|get_lua`,
            },
          ],
        };
    }
  }

  if (name === "fibaro_scene") {
    const op = (args?.op as string | undefined)?.toLowerCase();
    if (!op) {
      throw new McpError(ErrorCode.InvalidParams, 'fibaro_scene: missing required parameter "op"');
    }
    switch (op) {
      case "list":
        return handleToolCall(client, "list_scenes", { room_id: args?.room_id });
      case "get":
        return handleToolCall(client, "get_scene", { scene_id: args?.scene_id });
      case "run":
        return handleToolCall(client, "run_scene", { scene_id: args?.scene_id });
      case "stop":
        return handleToolCall(client, "stop_scene", { scene_id: args?.scene_id });
      case "get_lua":
        return handleToolCall(client, "get_scene_lua", { scene_id: args?.scene_id });
      case "create":
        return handleToolCall(client, "create_scene", {
          name: args?.name,
          room_id: args?.room_id,
          lua: args?.lua,
        });
      case "update_lua":
        return handleToolCall(client, "update_scene_lua", {
          scene_id: args?.scene_id,
          lua: args?.lua,
          name: args?.name,
          room_id: args?.room_id,
        });
      case "delete":
        return handleToolCall(client, "delete_scene", { scene_id: args?.scene_id });
      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_scene: unsupported op "${op}". Supported ops: list|get|run|stop|get_lua|create|update_lua|delete`,
            },
          ],
        };
    }
  }

  if (name === "fibaro_variable") {
    const op = (args?.op as string | undefined)?.toLowerCase();
    if (!op) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'fibaro_variable: missing required parameter "op"',
      );
    }
    switch (op) {
      case "list":
        return handleToolCall(client, "list_global_variables", {});
      case "get":
        return handleToolCall(client, "get_global_variable", { name: args?.name });
      case "set":
        return handleToolCall(client, "set_global_variable", {
          name: args?.name,
          value: args?.value,
        });
      case "create":
        return handleToolCall(
          client,
          "create_global_variable",
          args?.variable ?? { name: args?.name, value: args?.value },
        );
      case "delete":
        return handleToolCall(client, "delete_global_variable", { name: args?.name });
      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_variable: unsupported op "${op}". Supported ops: list|get|set|create|delete`,
            },
          ],
        };
    }
  }

  if (name === "fibaro_quick_app") {
    const op = (args?.op as string | undefined)?.toLowerCase();
    if (!op) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'fibaro_quick_app: missing required parameter "op"',
      );
    }
    switch (op) {
      case "list":
        return handleToolCall(client, "list_quick_apps", {});
      case "create":
        return handleToolCall(client, "create_quick_app", {
          name: args?.name,
          type: args?.type,
          room_id: args?.room_id,
          code: args?.code,
        });
      case "update_code":
        return handleToolCall(client, "update_quick_app_code", {
          device_id: args?.device_id,
          code: args?.code,
        });
      case "update_variables":
        return handleToolCall(client, "update_quick_app_variables", {
          device_id: args?.device_id,
          variables: args?.variables,
        });
      case "get_lua":
        return handleToolCall(client, "get_device_lua", { device_id: args?.device_id });
      case "delete":
        return handleToolCall(client, "delete_device", { device_id: args?.device_id });
      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_quick_app: unsupported op "${op}". Supported ops: list|create|update_code|update_variables|get_lua|delete`,
            },
          ],
        };
    }
  }

  if (name === "fibaro_home") {
    const op = (args?.op as string | undefined)?.toLowerCase();
    if (!op) {
      throw new McpError(ErrorCode.InvalidParams, 'fibaro_home: missing required parameter "op"');
    }
    switch (op) {
      case "system_info":
        return handleToolCall(client, "get_system_info", {});
      case "weather":
        return handleToolCall(client, "get_weather", {});
      case "energy_panel":
        return handleToolCall(client, "get_energy_panel", {});
      case "rooms":
        return handleToolCall(client, "list_rooms", {});
      case "sections":
        return handleToolCall(client, "list_sections", {});
      case "create_room":
        return handleToolCall(client, "create_room", {
          name: args?.name,
          section_id: args?.section_id,
          icon: args?.icon,
        });
      case "update_room":
        return handleToolCall(client, "update_room", {
          room_id: args?.room_id,
          name: args?.name,
          section_id: args?.section_id,
          icon: args?.icon,
        });
      case "delete_room":
        return handleToolCall(client, "delete_room", { room_id: args?.room_id });
      case "create_section":
        return handleToolCall(client, "create_section", { name: args?.name, icon: args?.icon });
      case "update_section":
        return handleToolCall(client, "update_section", {
          section_id: args?.section_id,
          name: args?.name,
          icon: args?.icon,
        });
      case "delete_section":
        return handleToolCall(client, "delete_section", { section_id: args?.section_id });
      case "users":
        return handleToolCall(client, "list_users", {});
      case "create_user":
        return handleToolCall(client, "create_user", {
          name: args?.name,
          username: args?.username,
          password: args?.password,
          email: args?.email,
          type: args?.type,
        });
      case "update_user":
        return handleToolCall(client, "update_user", {
          user_id: args?.user_id,
          name: args?.name,
          email: args?.email,
          password: args?.password,
        });
      case "delete_user":
        return handleToolCall(client, "delete_user", { user_id: args?.user_id });
      case "profiles":
        return handleToolCall(client, "list_profiles", {});
      case "get_active_profile":
        return handleToolCall(client, "get_active_profile", {});
      case "set_active_profile":
        return handleToolCall(client, "set_active_profile", { profile_id: args?.profile_id });
      case "notifications":
        return handleToolCall(client, "list_notifications", {});
      case "send_notification":
        return handleToolCall(client, "send_notification", {
          type: args?.type,
          title: args?.title,
          text: args?.text,
          users: args?.users,
        });
      case "alarms":
        return handleToolCall(client, "list_alarms", {});
      case "arm_alarm":
        return handleToolCall(client, "arm_alarm", { partition_id: args?.partition_id });
      case "disarm_alarm":
        return handleToolCall(client, "disarm_alarm", { partition_id: args?.partition_id });
      case "zwave_network":
        return handleToolCall(client, "get_zwave_network", {});
      case "start_zwave_inclusion":
        return handleToolCall(client, "start_zwave_inclusion", {});
      case "stop_zwave_inclusion":
        return handleToolCall(client, "stop_zwave_inclusion", {});
      case "start_zwave_exclusion":
        return handleToolCall(client, "start_zwave_exclusion", {});
      case "stop_zwave_exclusion":
        return handleToolCall(client, "stop_zwave_exclusion", {});
      case "remove_failed_zwave_node":
        return handleToolCall(client, "remove_failed_zwave_node", { node_id: args?.node_id });
      case "heal_zwave_network":
        return handleToolCall(client, "heal_zwave_network", {});
      case "create_backup":
        return handleToolCall(client, "create_backup", {});
      case "list_backups":
        return handleToolCall(client, "list_backups", {});
      case "restore_backup":
        return handleToolCall(client, "restore_backup", { backup_id: args?.backup_id });
      case "get_settings":
        return handleToolCall(client, "get_settings", {});
      case "update_settings":
        return handleToolCall(client, "update_settings", { settings: args?.settings });
      case "restart_system":
        return handleToolCall(client, "restart_system", {});
      case "get_event_log":
        return handleToolCall(client, "get_event_log", {
          from: args?.from,
          to: args?.to,
          type: args?.type,
          limit: args?.limit,
        });
      case "geofences":
        return handleToolCall(client, "list_geofences", {});
      case "create_geofence":
        return handleToolCall(client, "create_geofence", {
          name: args?.name,
          latitude: args?.latitude,
          longitude: args?.longitude,
          radius: args?.radius,
        });
      case "update_geofence":
        return handleToolCall(client, "update_geofence", {
          geofence_id: args?.geofence_id,
          name: args?.name,
          latitude: args?.latitude,
          longitude: args?.longitude,
          radius: args?.radius,
        });
      case "delete_geofence":
        return handleToolCall(client, "delete_geofence", { geofence_id: args?.geofence_id });
      case "plugins":
        return handleToolCall(client, "list_plugins", {});
      case "install_plugin":
        return handleToolCall(client, "install_plugin", { url: args?.url });
      case "uninstall_plugin":
        return handleToolCall(client, "uninstall_plugin", { plugin_id: args?.plugin_id });
      case "restart_plugin":
        return handleToolCall(client, "restart_plugin", { plugin_id: args?.plugin_id });
      case "trigger_custom_event":
        return handleToolCall(client, "trigger_custom_event", {
          event_name: args?.event_name,
          data: args?.data,
        });
      case "device_stats": {
        // Support both direct params and nested params object for backward compatibility
        const params = (args?.params as Record<string, any>) || {};
        return handleToolCall(client, "get_device_stats", {
          device_id: args?.device_id,
          from: args?.from ?? params.from,
          to: args?.to ?? params.to,
          property: args?.property ?? params.property,
          aggregation: args?.aggregation ?? params.aggregation,
          max_points: args?.max_points ?? params.max_points,
          metrics: args?.metrics ?? params.metrics,
        });
      }
      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_home: unsupported op "${op}". Supported ops include: system_info|weather|energy_panel|rooms|sections|...|device_stats`,
            },
          ],
        };
    }
  }

  if (name === "fibaro_template") {
    const { getTemplateManager } = await import("./templates/template-manager.js");
    const templateManager = getTemplateManager();

    const op = (args?.op as string | undefined)?.toLowerCase();
    if (!op) {
      throw new McpError(ErrorCode.InvalidParams, 'fibaro_template: missing required parameter "op"');
    }

    switch (op) {
      case "list": {
        const category = args?.category as string | undefined;
        const templates = category
          ? templateManager.getByCategory(category as any)
          : templateManager.getAll();

        const library = templateManager.getLibrary();

        let text = `Found ${templates.length} template(s)`;
        if (category) {
          text += ` in category: ${category}`;
        }
        text += `\n\nTotal templates by category:`;
        for (const [cat, count] of Object.entries(library.categories)) {
          text += `\n  ${cat}: ${count}`;
        }

        text += `\n\nTemplates:\n`;
        for (const template of templates) {
          text += `\n- ${template.id} (${template.name})`;
          text += `\n  Category: ${template.category}`;
          text += `\n  Description: ${template.description}`;
          text += `\n  Parameters: ${template.parameters.length}`;
          if (template.tags && template.tags.length > 0) {
            text += `\n  Tags: ${template.tags.join(", ")}`;
          }
        }

        return {
          content: [{ type: "text", text }],
        };
      }

      case "get": {
        const templateId = args?.template_id as string | undefined;
        if (!templateId) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'fibaro_template op=get: missing required parameter "template_id"',
          );
        }

        const template = templateManager.getById(templateId);
        if (!template) {
          return {
            content: [{ type: "text", text: `Template '${templateId}' not found` }],
          };
        }

        let text = `Template: ${template.name} (${template.id})\n`;
        text += `Category: ${template.category}\n`;
        text += `Version: ${template.version}\n`;
        text += `Description: ${template.description}\n`;
        if (template.author) {
          text += `Author: ${template.author}\n`;
        }
        if (template.tags && template.tags.length > 0) {
          text += `Tags: ${template.tags.join(", ")}\n`;
        }

        text += `\nParameters:\n`;
        for (const param of template.parameters) {
          text += `\n- ${param.name} (${param.type})${param.required ? " [REQUIRED]" : ""}`;
          text += `\n  ${param.description}`;
          if (param.default !== undefined) {
            text += `\n  Default: ${JSON.stringify(param.default)}`;
          }
          if (param.validation) {
            if (param.validation.min !== undefined) text += `\n  Min: ${param.validation.min}`;
            if (param.validation.max !== undefined) text += `\n  Max: ${param.validation.max}`;
            if (param.validation.pattern) text += `\n  Pattern: ${param.validation.pattern}`;
          }
        }

        text += `\n\nLua Template:\n${template.lua_template}`;

        return {
          content: [{ type: "text", text }],
        };
      }

      case "instantiate": {
        const templateId = args?.template_id as string | undefined;
        const sceneName = args?.scene_name as string | undefined;
        const roomId = args?.room_id as number | undefined;
        const parameters = args?.parameters as Record<string, any> | undefined;

        if (!templateId) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'fibaro_template op=instantiate: missing required parameter "template_id"',
          );
        }
        if (!sceneName) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'fibaro_template op=instantiate: missing required parameter "scene_name"',
          );
        }
        if (!roomId) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'fibaro_template op=instantiate: missing required parameter "room_id"',
          );
        }
        if (!parameters) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'fibaro_template op=instantiate: missing required parameter "parameters"',
          );
        }

        const result = templateManager.instantiate({
          template_id: templateId,
          scene_name: sceneName,
          room_id: roomId,
          parameters,
        });

        if (!result.validation.valid) {
          let text = `Template parameter validation failed:\n`;
          for (const error of result.validation.errors) {
            text += `\n- ${error.parameter}: ${error.message}`;
          }
          return {
            content: [{ type: "text", text }],
          };
        }

        // Create the scene using the generated Lua code
        try {
          const scene = await client.createScene({
            name: sceneName,
            roomID: roomId,
            lua: result.lua,
            type: "lua",
            isLua: true,
          });

          let text = `Successfully created scene from template!\n`;
          text += `Scene ID: ${scene.id}\n`;
          text += `Scene Name: ${scene.name}\n`;
          text += `Room ID: ${scene.roomID}\n`;
          text += `\nGenerated Lua code (${result.lua.length} characters):\n${result.lua}`;

          return {
            content: [{ type: "text", text }],
          };
        } catch (error: any) {
          throw new McpError(
            ErrorCode.InternalError,
            `Failed to create scene: ${error.message}`,
          );
        }
      }

      case "create": {
        const template = args?.template as any;
        if (!template) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'fibaro_template op=create: missing required parameter "template"',
          );
        }

        const result = templateManager.addTemplate(template);
        if (!result.success) {
          return {
            content: [{ type: "text", text: `Failed to add template: ${result.error}` }],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Successfully added custom template: ${template.id} (${template.name})`,
            },
          ],
        };
      }

      case "delete": {
        const templateId = args?.template_id as string | undefined;
        if (!templateId) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'fibaro_template op=delete: missing required parameter "template_id"',
          );
        }

        const result = templateManager.removeTemplate(templateId);
        if (!result.success) {
          return {
            content: [{ type: "text", text: `Failed to remove template: ${result.error}` }],
          };
        }

        return {
          content: [{ type: "text", text: `Successfully removed template: ${templateId}` }],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_template: unsupported op "${op}". Supported ops: list|get|instantiate|create|delete`,
            },
          ],
        };
    }
  }

  if (name === "fibaro_history") {
    const { getHistoryManager } = await import("./history/history-manager.js");
    const historyManager = getHistoryManager();

    const op = (args?.op as string | undefined)?.toLowerCase();
    if (!op) {
      throw new McpError(ErrorCode.InvalidParams, 'fibaro_history: missing required parameter "op"');
    }

    const deviceId = args?.device_id as number | undefined;
    if (!deviceId) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'fibaro_history: missing required parameter "device_id"',
      );
    }

    const from = args?.from as number | undefined;
    const to = args?.to as number | undefined;
    const property = args?.property as string | undefined;
    const limit = args?.limit as number | undefined;

    switch (op) {
      case "query": {
        const entries = await historyManager.queryDeviceHistory(client, {
          deviceId,
          from,
          to,
          property,
          limit,
        });

        let text = `Device History for Device ${deviceId}\n`;
        if (property) {
          text += `Property: ${property}\n`;
        }
        text += `Found ${entries.length} entries\n`;

        if (from || to) {
          text += `Time range: ${from ? new Date(from).toISOString() : "beginning"} to ${to ? new Date(to).toISOString() : "now"}\n`;
        }

        text += `\nHistory Entries:\n`;
        for (const entry of entries.slice(0, 50)) {
          text += `\n- ${new Date(entry.timestamp).toISOString()}`;
          text += ` | ${entry.property}: ${JSON.stringify(entry.value)}`;
          if (entry.oldValue !== undefined) {
            text += ` (was: ${JSON.stringify(entry.oldValue)})`;
          }
        }

        if (entries.length > 50) {
          text += `\n\n... and ${entries.length - 50} more entries`;
        }

        return {
          content: [{ type: "text", text }],
        };
      }

      case "stats": {
        const entries = await historyManager.queryDeviceHistory(client, {
          deviceId,
          from,
          to,
          property,
          limit,
        });

        const stats = historyManager.calculateStats(
          entries,
          deviceId,
          property || "value",
          from || 0,
          to || Date.now(),
        );

        let text = `Device History Statistics for Device ${deviceId}\n`;
        if (stats.deviceName) {
          text += `Device Name: ${stats.deviceName}\n`;
        }
        text += `Property: ${stats.property}\n`;
        text += `Time range: ${new Date(stats.from).toISOString()} to ${new Date(stats.to).toISOString()}\n`;
        text += `\nStatistics:\n`;
        text += `  Total entries: ${stats.count}\n`;
        text += `  Value changes: ${stats.changes}\n`;
        text += `  First value: ${JSON.stringify(stats.first)}\n`;
        text += `  Last value: ${JSON.stringify(stats.last)}\n`;

        if (stats.min !== undefined) {
          text += `  Minimum: ${stats.min}\n`;
          text += `  Maximum: ${stats.max}\n`;
          text += `  Average: ${stats.avg?.toFixed(2)}\n`;
          text += `  Sum: ${stats.sum}\n`;
        }

        return {
          content: [{ type: "text", text }],
        };
      }

      case "aggregate": {
        const interval = args?.interval as any;
        const aggregation = args?.aggregation as any;

        if (!interval) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'fibaro_history op=aggregate: missing required parameter "interval"',
          );
        }
        if (!aggregation) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'fibaro_history op=aggregate: missing required parameter "aggregation"',
          );
        }

        const entries = await historyManager.queryDeviceHistory(client, {
          deviceId,
          from,
          to,
          property,
          limit,
        });

        const aggregated = historyManager.aggregateByInterval(entries, interval, aggregation);

        let text = `Aggregated Device History for Device ${deviceId}\n`;
        text += `Interval: ${interval}, Aggregation: ${aggregation}\n`;
        text += `Found ${aggregated.length} aggregated entries\n\n`;

        for (const entry of aggregated.slice(0, 100)) {
          text += `\n- ${new Date(entry.timestamp).toISOString()}`;
          text += ` | ${entry.property}: ${entry.value.toFixed(2)}`;
          text += ` (${entry.count} samples)`;
          if (entry.min !== undefined) {
            text += ` [min: ${entry.min.toFixed(2)}, max: ${entry.max?.toFixed(2)}, avg: ${entry.avg?.toFixed(2)}]`;
          }
        }

        if (aggregated.length > 100) {
          text += `\n\n... and ${aggregated.length - 100} more entries`;
        }

        return {
          content: [{ type: "text", text }],
        };
      }

      case "export": {
        const exportData = await historyManager.exportHistory(
          client,
          {
            deviceId,
            from,
            to,
            property,
            limit,
          },
          true,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(exportData, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_history: unsupported op "${op}". Supported ops: query|stats|aggregate|export`,
            },
          ],
        };
    }
  }

  if (name === "fibaro_scene_history") {
    const { getHistoryManager } = await import("./history/history-manager.js");
    const historyManager = getHistoryManager();

    const op = (args?.op as string | undefined)?.toLowerCase();
    if (!op) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'fibaro_scene_history: missing required parameter "op"',
      );
    }

    const sceneId = args?.scene_id as number | undefined;
    const from = args?.from as number | undefined;
    const to = args?.to as number | undefined;
    const status = args?.status as any;
    const limit = args?.limit as number | undefined;

    switch (op) {
      case "query": {
        const executions = await historyManager.querySceneHistory(client, {
          sceneId,
          from,
          to,
          status,
          limit,
        });

        let text = `Scene Execution History\n`;
        if (sceneId) {
          text += `Scene ID: ${sceneId}\n`;
        }
        text += `Found ${executions.length} executions\n`;

        if (from || to) {
          text += `Time range: ${from ? new Date(from).toISOString() : "beginning"} to ${to ? new Date(to).toISOString() : "now"}\n`;
        }

        text += `\nExecutions:\n`;
        for (const exec of executions.slice(0, 50)) {
          text += `\n- Scene ${exec.sceneId} (${exec.sceneName})`;
          text += `\n  Started: ${new Date(exec.startTime).toISOString()}`;
          if (exec.endTime) {
            text += `\n  Ended: ${new Date(exec.endTime).toISOString()}`;
            text += `\n  Duration: ${exec.duration}ms`;
          }
          text += `\n  Status: ${exec.status}`;
          if (exec.error) {
            text += `\n  Error: ${exec.error}`;
          }
        }

        if (executions.length > 50) {
          text += `\n\n... and ${executions.length - 50} more executions`;
        }

        return {
          content: [{ type: "text", text }],
        };
      }

      case "stats":
      case "performance": {
        const executions = await historyManager.querySceneHistory(client, {
          sceneId,
          from,
          to,
          limit,
        });

        if (sceneId) {
          // Single scene stats
          const stats = historyManager.calculateSceneStats(executions);
          if (!stats) {
            return {
              content: [{ type: "text", text: "No execution data found for this scene" }],
            };
          }

          let text = `Scene Performance Statistics\n`;
          text += `Scene ID: ${stats.sceneId}\n`;
          text += `Scene Name: ${stats.sceneName}\n\n`;
          text += `Total Executions: ${stats.totalExecutions}\n`;
          text += `Successful: ${stats.successfulExecutions} (${stats.successRate.toFixed(1)}%)\n`;
          text += `Failed: ${stats.failedExecutions}\n\n`;
          text += `Execution Duration:\n`;
          text += `  Average: ${stats.avgDuration.toFixed(0)}ms\n`;
          text += `  Minimum: ${stats.minDuration}ms\n`;
          text += `  Maximum: ${stats.maxDuration}ms\n\n`;
          text += `Last Execution: ${new Date(stats.lastExecution).toISOString()}\n`;
          if (stats.lastStatus) {
            text += `Last Status: ${stats.lastStatus}\n`;
          }

          return {
            content: [{ type: "text", text }],
          };
        } else {
          // Multi-scene stats
          const sceneMap = new Map<number, any[]>();
          for (const exec of executions) {
            if (!sceneMap.has(exec.sceneId)) {
              sceneMap.set(exec.sceneId, []);
            }
            sceneMap.get(exec.sceneId)!.push(exec);
          }

          let text = `Scene Performance Statistics (All Scenes)\n`;
          text += `Total scenes: ${sceneMap.size}\n\n`;

          for (const [sid, execs] of Array.from(sceneMap.entries()).slice(0, 20)) {
            const stats = historyManager.calculateSceneStats(execs);
            if (stats) {
              text += `\n${stats.sceneName} (ID: ${stats.sceneId})\n`;
              text += `  Executions: ${stats.totalExecutions}, Success rate: ${stats.successRate.toFixed(1)}%\n`;
              text += `  Avg duration: ${stats.avgDuration.toFixed(0)}ms\n`;
            }
          }

          if (sceneMap.size > 20) {
            text += `\n\n... and ${sceneMap.size - 20} more scenes`;
          }

          return {
            content: [{ type: "text", text }],
          };
        }
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_scene_history: unsupported op "${op}". Supported ops: query|stats|performance`,
            },
          ],
        };
    }
  }

  if (name === "fibaro_backup") {
    const { getBackupManager } = await import("./backup/backup-manager.js");
    const { getExportFormatter } = await import("./backup/export-formatter.js");
    const { getImportValidator } = await import("./backup/import-validator.js");

    const backupManager = getBackupManager();
    const exportFormatter = getExportFormatter();
    const importValidator = getImportValidator();

    const op = args?.op as string;
    if (!op) {
      return {
        content: [
          {
            type: "text",
            text: 'fibaro_backup: missing required parameter "op"',
          },
        ],
        isError: true,
      };
    }

    switch (op) {
      case "export": {
        const exportFormat = (args?.export_format as string) || "json";
        type DataType = "devices" | "scenes" | "rooms" | "sections" | "variables" | "users";
        const include = args?.include as DataType[] | undefined;
        const exclude = args?.exclude as DataType[] | undefined;
        const includeUsers = args?.include_users as boolean | undefined;
        const includePasswords = args?.include_passwords as boolean | undefined;

        const exportData = await backupManager.exportSystem(client, {
          format: exportFormat === "yaml" ? "yaml" : "json",
          include,
          exclude,
          include_users: includeUsers,
          include_passwords: includePasswords,
        });

        const formatted = exportFormatter.format(
          exportData,
          exportFormat === "yaml" ? "yaml" : "json"
        );

        return {
          content: [
            {
              type: "text",
              text:
                `System export complete\n\n` +
                `Metadata:\n` +
                `- Devices: ${exportData.metadata.device_count}\n` +
                `- Scenes: ${exportData.metadata.scene_count}\n` +
                `- Rooms: ${exportData.metadata.room_count}\n` +
                `- Sections: ${exportData.metadata.section_count}\n` +
                `- Variables: ${exportData.metadata.variable_count}\n` +
                `- Users: ${exportData.metadata.user_count}\n` +
                `- Export Duration: ${exportData.metadata.export_duration_ms}ms\n\n` +
                `Export Data (${exportFormat}):\n\`\`\`${exportFormat}\n${formatted}\n\`\`\``,
            },
          ],
        };
      }

      case "validate": {
        const importData = args?.import_data as string | undefined;
        if (!importData) {
          return {
            content: [
              {
                type: "text",
                text: 'fibaro_backup: "validate" operation requires "import_data" parameter',
              },
            ],
            isError: true,
          };
        }

        try {
          // Detect format
          const format = exportFormatter.detectFormat(importData);

          // Parse import data
          const exportData = exportFormatter.parse(importData, format);

          // Validate
          const validationResult = importValidator.validate(exportData);

          let text = `Import validation ${validationResult.valid ? "PASSED" : "FAILED"}\n\n`;

          if (validationResult.metadata) {
            text +=
              `Metadata:\n` +
              `- Devices: ${validationResult.metadata.device_count}\n` +
              `- Scenes: ${validationResult.metadata.scene_count}\n` +
              `- Rooms: ${validationResult.metadata.room_count}\n` +
              `- Sections: ${validationResult.metadata.section_count}\n` +
              `- Variables: ${validationResult.metadata.variable_count}\n` +
              `- Users: ${validationResult.metadata.user_count}\n\n`;
          }

          if (validationResult.errors.length > 0) {
            text += `Errors (${validationResult.errors.length}):\n`;
            for (const error of validationResult.errors) {
              text += `- [${error.type}] ${error.field ? `${error.field}: ` : ""}${error.message}\n`;
            }
            text += "\n";
          }

          if (validationResult.warnings.length > 0) {
            text += `Warnings (${validationResult.warnings.length}):\n`;
            for (const warning of validationResult.warnings) {
              text += `- [${warning.type}] ${warning.field ? `${warning.field}: ` : ""}${warning.message}\n`;
            }
          }

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_backup: validation failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "import": {
        const importData = args?.import_data as string | undefined;
        if (!importData) {
          return {
            content: [
              {
                type: "text",
                text: 'fibaro_backup: "import" operation requires "import_data" parameter',
              },
            ],
            isError: true,
          };
        }

        try {
          // Detect format
          const format = exportFormatter.detectFormat(importData);

          // Parse import data
          const exportData = exportFormatter.parse(importData, format);

          // Validate first
          const validationResult = importValidator.validate(exportData);
          if (!validationResult.valid) {
            return {
              content: [
                {
                  type: "text",
                  text:
                    `fibaro_backup: import validation failed\n\n` +
                    validationResult.errors.map((e) => `- ${e.message}`).join("\n"),
                },
              ],
              isError: true,
            };
          }

          // Import
          type ImportDataType = "devices" | "scenes" | "rooms" | "sections" | "variables" | "users";
          const importResult = await backupManager.importSystem(client, exportData, {
            dry_run: args?.dry_run as boolean | undefined,
            skip_existing: args?.skip_existing as boolean | undefined,
            update_existing: args?.update_existing as boolean | undefined,
            types: args?.import_types as ImportDataType[] | undefined,
          });

          let text = `System import ${importResult.success ? "COMPLETED" : "FAILED"}\n\n`;

          text +=
            `Imported:\n` +
            `- Devices: ${importResult.imported.devices}\n` +
            `- Scenes: ${importResult.imported.scenes}\n` +
            `- Rooms: ${importResult.imported.rooms}\n` +
            `- Sections: ${importResult.imported.sections}\n` +
            `- Variables: ${importResult.imported.variables}\n` +
            `- Users: ${importResult.imported.users}\n\n`;

          if (
            importResult.skipped.devices > 0 ||
            importResult.skipped.scenes > 0 ||
            importResult.skipped.rooms > 0 ||
            importResult.skipped.sections > 0 ||
            importResult.skipped.variables > 0 ||
            importResult.skipped.users > 0
          ) {
            text +=
              `Skipped:\n` +
              `- Devices: ${importResult.skipped.devices}\n` +
              `- Scenes: ${importResult.skipped.scenes}\n` +
              `- Rooms: ${importResult.skipped.rooms}\n` +
              `- Sections: ${importResult.skipped.sections}\n` +
              `- Variables: ${importResult.skipped.variables}\n` +
              `- Users: ${importResult.skipped.users}\n\n`;
          }

          if (importResult.errors.length > 0) {
            text += `Errors (${importResult.errors.length}):\n`;
            for (const error of importResult.errors.slice(0, 10)) {
              text += `- [${error.type}] ${error.name || error.id || "unknown"}: ${error.error}\n`;
            }
            if (importResult.errors.length > 10) {
              text += `... and ${importResult.errors.length - 10} more errors\n`;
            }
            text += "\n";
          }

          text += `Duration: ${importResult.duration_ms}ms`;

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_backup: import failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_backup: unsupported op "${op}". Supported ops: export|import|validate`,
            },
          ],
        };
    }
  }

  if (name === "fibaro_bulk") {
    const { getBulkOperationsManager } = await import("./bulk/bulk-operations.js");
    const bulkOps = getBulkOperationsManager();

    const op = args?.op as string;
    if (!op) {
      return {
        content: [
          {
            type: "text",
            text: 'fibaro_bulk: missing required parameter "op"',
          },
        ],
        isError: true,
      };
    }

    switch (op) {
      case "execute": {
        const query = args?.query as any;
        const action = args?.action as any;
        const options = (args?.options as any) || {};

        if (!query) {
          return {
            content: [
              {
                type: "text",
                text: 'fibaro_bulk: "execute" operation requires "query" parameter',
              },
            ],
            isError: true,
          };
        }

        if (!action) {
          return {
            content: [
              {
                type: "text",
                text: 'fibaro_bulk: "execute" operation requires "action" parameter',
              },
            ],
            isError: true,
          };
        }

        try {
          const result = await bulkOps.executeBulkOperation(client, query, action, options);

          let text = `Bulk Operation ${result.failed > 0 ? "COMPLETED WITH ERRORS" : "SUCCESSFUL"}\n\n`;

          text +=
            `Summary:\n` +
            `- Total devices: ${result.total}\n` +
            `- Successful: ${result.successful}\n` +
            `- Failed: ${result.failed}\n` +
            `- Skipped: ${result.skipped}\n` +
            `- Duration: ${result.duration}ms\n\n`;

          if (result.successful > 0) {
            text += `Successful Operations (${result.successful}):\n`;
            const successful = result.results.filter((r) => r.success);
            for (const r of successful.slice(0, 10)) {
              text += `✓ [${r.deviceId}] ${r.deviceName}`;
              if (r.value !== undefined) {
                text += ` → ${r.value}`;
              }
              text += "\n";
            }
            if (successful.length > 10) {
              text += `... and ${successful.length - 10} more\n`;
            }
            text += "\n";
          }

          if (result.failed > 0) {
            text += `Failed Operations (${result.failed}):\n`;
            const failed = result.results.filter((r) => !r.success);
            for (const r of failed.slice(0, 10)) {
              text += `✗ [${r.deviceId}] ${r.deviceName}: ${r.error}\n`;
            }
            if (failed.length > 10) {
              text += `... and ${failed.length - 10} more\n`;
            }
          }

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_bulk: execute failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "preview": {
        const query = args?.query as any;

        if (!query) {
          return {
            content: [
              {
                type: "text",
                text: 'fibaro_bulk: "preview" operation requires "query" parameter',
              },
            ],
            isError: true,
          };
        }

        try {
          const devices = await bulkOps.previewQuery(client, query);

          let text = `Preview: ${devices.length} devices match query\n\n`;

          if (devices.length > 0) {
            text += "Matching Devices:\n";
            for (const device of devices.slice(0, 20)) {
              text +=
                `- [${device.id}] ${device.name} (${device.type}, Room ${device.roomID}, ${device.enabled ? "enabled" : "disabled"})\n`;
            }
            if (devices.length > 20) {
              text += `... and ${devices.length - 20} more\n`;
            }
          } else {
            text += "No devices match the query criteria.";
          }

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_bulk: preview failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_bulk: unsupported op "${op}". Supported ops: execute|preview`,
            },
          ],
        };
    }
  }

  if (name === "fibaro_repl") {
    const { getLuaRepl } = await import("./repl/lua-repl.js");
    const repl = getLuaRepl();

    const op = args?.op as string;
    if (!op) {
      return {
        content: [
          {
            type: "text",
            text: 'fibaro_repl: missing required parameter "op"',
          },
        ],
        isError: true,
      };
    }

    switch (op) {
      case "execute": {
        const code = args?.code as string | undefined;
        if (!code) {
          return {
            content: [
              {
                type: "text",
                text: 'fibaro_repl: "execute" operation requires "code" parameter',
              },
            ],
            isError: true,
          };
        }

        const sessionId = args?.session_id as string | undefined;
        const timeout = args?.timeout as number | undefined;
        const roomId = args?.room_id as number | undefined;

        const result = await repl.execute(client, code, sessionId, {
          timeout,
          roomId,
        });

        if (!result.success) {
          return {
            content: [
              {
                type: "text",
                text:
                  `Lua execution failed\n\n` +
                  `Session: ${result.sessionId}\n` +
                  `Execution Time: ${result.executionTime}ms\n\n` +
                  `Error:\n${result.error || "Unknown error"}`,
              },
            ],
            isError: true,
          };
        }

        let text = `Lua execution successful\n\n` +
          `Session: ${result.sessionId}\n` +
          `Scene: ${result.sceneId}\n` +
          `Execution Time: ${result.executionTime}ms\n`;

        if (result.output) {
          text += `\nOutput:\n${result.output}`;
        } else {
          text += `\nNo output captured`;
        }

        return {
          content: [{ type: "text", text }],
        };
      }

      case "list_sessions": {
        const sessions = repl.listSessions();

        if (sessions.length === 0) {
          return {
            content: [{ type: "text", text: "No active REPL sessions" }],
          };
        }

        let text = `Active REPL Sessions (${sessions.length}):\n\n`;

        for (const session of sessions) {
          const age = Date.now() - session.createdAt;
          const inactive = Date.now() - session.lastUsed;

          text +=
            `Session: ${session.id}\n` +
            `Scene: ${session.sceneId} (${session.sceneName})\n` +
            `Created: ${new Date(session.createdAt).toISOString()}\n` +
            `Age: ${Math.floor(age / 1000)}s\n` +
            `Inactive: ${Math.floor(inactive / 1000)}s\n` +
            `Executions: ${session.executionCount}\n` +
            `Status: ${session.status}\n\n`;
        }

        return {
          content: [{ type: "text", text }],
        };
      }

      case "clear_session": {
        const sessionId = args?.session_id as string | undefined;
        if (!sessionId) {
          return {
            content: [
              {
                type: "text",
                text: 'fibaro_repl: "clear_session" operation requires "session_id" parameter',
              },
            ],
            isError: true,
          };
        }

        try {
          await repl.clearSession(client, sessionId);
          return {
            content: [
              { type: "text", text: `REPL session ${sessionId} cleared successfully` },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to clear session: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "clear_all": {
        try {
          await repl.clearAllSessions(client);
          return {
            content: [{ type: "text", text: "All REPL sessions cleared successfully" }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to clear all sessions: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "sync": {
        try {
          await repl.sync(client);
          return {
            content: [
              {
                type: "text",
                text: "REPL sessions synced with Fibaro successfully",
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to sync sessions: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_repl: unsupported op "${op}". Supported ops: execute|list_sessions|clear_session|clear_all|sync`,
            },
          ],
        };
    }
  }

  if (name === "fibaro_analytics") {
    const { getAnalyticsEngine } = await import("./history/analytics-engine.js");
    const analytics = getAnalyticsEngine();

    const op = args?.op as string;
    if (!op) {
      return {
        content: [
          {
            type: "text",
            text: 'fibaro_analytics: missing required parameter "op"',
          },
        ],
        isError: true,
      };
    }

    const options = {
      from: args?.from as number | undefined,
      to: args?.to as number | undefined,
      device_ids: args?.device_ids as number[] | undefined,
      scene_ids: args?.scene_ids as number[] | undefined,
      room_ids: args?.room_ids as number[] | undefined,
      group_by: args?.group_by as "hour" | "day" | "week" | "month" | undefined,
      limit: args?.limit as number | undefined,
    };

    switch (op) {
      case "device_usage": {
        try {
          const patterns = await analytics.analyzeDeviceUsage(client, options);

          let text = `Device Usage Analysis\n\n`;
          text += `Period: ${options.from ? new Date(options.from).toISOString() : "7 days ago"} to ${options.to ? new Date(options.to).toISOString() : "now"}\n`;
          text += `Total devices: ${patterns.length}\n\n`;

          if (patterns.length > 0) {
            text += "Top Devices by Activity:\n";
            for (const pattern of patterns.slice(0, 20)) {
              text +=
                `\n${pattern.deviceName} [${pattern.deviceId}]\n` +
                `  Type: ${pattern.deviceType}\n` +
                `  Activations: ${pattern.activations}\n` +
                `  Avg/day: ${pattern.avgDailyUsage.toFixed(2)}\n` +
                `  Peak hours: ${pattern.peakHours.join(", ")}\n` +
                `  Last active: ${new Date(pattern.lastActive).toISOString()}\n`;
            }
            if (patterns.length > 20) {
              text += `\n... and ${patterns.length - 20} more devices`;
            }
          } else {
            text += "No device activity found in this period.";
          }

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_analytics: device_usage failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "energy_trends": {
        try {
          const trends = await analytics.analyzeEnergyTrends(client, options);

          let text = `Energy Consumption Trends\n\n`;
          text += `Period: ${options.from ? new Date(options.from).toISOString() : "7 days ago"} to ${options.to ? new Date(options.to).toISOString() : "now"}\n`;
          text += `Group by: ${options.group_by || "day"}\n`;
          text += `Intervals: ${trends.length}\n\n`;

          if (trends.length > 0) {
            const totalConsumption = trends.reduce((sum, t) => sum + t.totalConsumption, 0);
            text += `Total Consumption: ${totalConsumption.toFixed(2)} kWh\n\n`;

            text += "Trends:\n";
            for (const trend of trends.slice(0, 10)) {
              text +=
                `\n${new Date(trend.timestamp).toISOString()}\n` +
                `  Total: ${trend.totalConsumption.toFixed(2)} kWh\n` +
                `  Top consumers: ${trend.devices.slice(0, 3).map((d) => `${d.deviceName} (${d.consumption.toFixed(2)} kWh)`).join(", ")}\n`;
            }
            if (trends.length > 10) {
              text += `\n... and ${trends.length - 10} more intervals`;
            }
          } else {
            text += "No energy data found in this period.";
          }

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_analytics: energy_trends failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "scene_frequency": {
        try {
          const frequencies = await analytics.analyzeSceneFrequency(client, options);

          let text = `Scene Execution Frequency\n\n`;
          text += `Period: ${options.from ? new Date(options.from).toISOString() : "7 days ago"} to ${options.to ? new Date(options.to).toISOString() : "now"}\n`;
          text += `Total scenes: ${frequencies.length}\n\n`;

          if (frequencies.length > 0) {
            text += "Top Scenes by Execution:\n";
            for (const freq of frequencies.slice(0, 20)) {
              text +=
                `\n${freq.sceneName} [${freq.sceneId}]\n` +
                `  Executions: ${freq.executions}\n` +
                `  Avg/day: ${freq.avgExecutionsPerDay.toFixed(2)}\n` +
                `  Success rate: ${freq.successRate.toFixed(1)}%\n` +
                `  Last execution: ${new Date(freq.lastExecution).toISOString()}\n`;
            }
            if (frequencies.length > 20) {
              text += `\n... and ${frequencies.length - 20} more scenes`;
            }
          } else {
            text += "No scene executions found in this period.";
          }

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_analytics: scene_frequency failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "system_health": {
        try {
          const health = await analytics.analyzeSystemHealth(client);

          let text = `System Health Report\n\n`;
          text += `Timestamp: ${new Date(health.timestamp).toISOString()}\n\n`;

          text +=
            `Dead Devices: ${health.deadDevices}\n` +
            (health.deadDeviceIds.length > 0
              ? `  IDs: ${health.deadDeviceIds.join(", ")}\n`
              : "") +
            `\nFailed Scenes: ${health.failedScenes}\n` +
            (health.failedSceneIds.length > 0
              ? `  IDs: ${health.failedSceneIds.join(", ")}\n`
              : "") +
            `\nError Rate: ${health.errorRate.toFixed(2)}%\n` +
            `Warnings (24h): ${health.warningCount}\n` +
            `Uptime: ${(health.uptime / 3600).toFixed(2)} hours\n`;

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_analytics: system_health failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "dashboard": {
        try {
          const dashboard = await analytics.generateDashboard(client, options);

          let text = `Analytics Dashboard\n\n`;
          text +=
            `Period: ${new Date(dashboard.period.from).toISOString()} to ${new Date(dashboard.period.to).toISOString()}\n` +
            `Duration: ${dashboard.period.days.toFixed(1)} days\n\n`;

          text +=
            `Summary:\n` +
            `  Health Score: ${dashboard.summary.healthScore}/100\n` +
            `  Total Activations: ${dashboard.summary.totalActivations}\n` +
            `  Total Energy: ${dashboard.summary.totalEnergyConsumption.toFixed(2)} kWh\n` +
            `  Most Active Device: ${dashboard.summary.mostActiveDevice}\n` +
            `  Most Used Scene: ${dashboard.summary.mostUsedScene}\n\n`;

          text +=
            `System Health:\n` +
            `  Dead Devices: ${dashboard.systemHealth.deadDevices}\n` +
            `  Failed Scenes: ${dashboard.systemHealth.failedScenes}\n` +
            `  Error Rate: ${dashboard.systemHealth.errorRate.toFixed(2)}%\n` +
            `  Warnings: ${dashboard.systemHealth.warningCount}\n\n`;

          text += `Top Devices (by activity):\n`;
          for (const device of dashboard.topDevices.slice(0, 5)) {
            text += `  ${device.deviceName}: ${device.activations} activations, ${device.avgDailyUsage.toFixed(2)}/day\n`;
          }

          text += `\nTop Scenes (by execution):\n`;
          for (const scene of dashboard.topScenes.slice(0, 5)) {
            text += `  ${scene.sceneName}: ${scene.executions} executions, ${scene.avgExecutionsPerDay.toFixed(2)}/day\n`;
          }

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_analytics: dashboard failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "hourly_distribution": {
        try {
          const distribution = await analytics.getHourlyDistribution(client, options);

          let text = `Hourly Activity Distribution\n\n`;
          text += `Period: ${options.from ? new Date(options.from).toISOString() : "7 days ago"} to ${options.to ? new Date(options.to).toISOString() : "now"}\n\n`;

          for (const hour of distribution) {
            const bar = "█".repeat(Math.round(hour.percentage / 2));
            text += `${hour.hour.toString().padStart(2, "0")}:00  ${bar} ${hour.count} (${hour.percentage.toFixed(1)}%)\n`;
          }

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_analytics: hourly_distribution failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "room_activity": {
        try {
          const rooms = await analytics.getRoomActivity(client, options);

          let text = `Room Activity Summary\n\n`;
          text += `Period: ${options.from ? new Date(options.from).toISOString() : "7 days ago"} to ${options.to ? new Date(options.to).toISOString() : "now"}\n`;
          text += `Total rooms: ${rooms.length}\n\n`;

          if (rooms.length > 0) {
            text += "Rooms by Activity:\n";
            for (const room of rooms.slice(0, 20)) {
              text +=
                `\n${room.roomName} [${room.roomId}]\n` +
                `  Activations: ${room.activations}\n` +
                `  Avg/day: ${room.avgDailyActivations.toFixed(2)}\n` +
                `  Active devices: ${room.activeDevices}/${room.totalDevices}\n`;
            }
            if (rooms.length > 20) {
              text += `\n... and ${rooms.length - 20} more rooms`;
            }
          } else {
            text += "No room activity found in this period.";
          }

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_analytics: room_activity failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_analytics: unsupported op "${op}". Supported ops: device_usage|energy_trends|scene_frequency|system_health|dashboard|hourly_distribution|room_activity`,
            },
          ],
        };
    }
  }

  if (name === "fibaro_integration") {
    const op = args?.op as string;
    if (!op) {
      return {
        content: [
          {
            type: "text",
            text: 'fibaro_integration: missing required parameter "op"',
          },
        ],
        isError: true,
      };
    }

    // Webhook operations
    if (op === "webhook_start") {
      const webhookConfig = args?.webhook_config as any;
      if (!webhookConfig) {
        return {
          content: [
            {
              type: "text",
              text: 'fibaro_integration: "webhook_start" requires "webhook_config" parameter',
            },
          ],
          isError: true,
        };
      }

      try {
        const { createWebhookServer } = await import("./integrations/webhook-server.js");
        const config = {
          enabled: true,
          port: webhookConfig.port || 8080,
          host: webhookConfig.host,
          authToken: webhookConfig.authToken,
          routes: webhookConfig.routes || [],
        };

        const server = await createWebhookServer(config, client);
        await server.start();

        return {
          content: [
            {
              type: "text",
              text: `Webhook server started successfully on port ${config.port}\n\nEndpoints:\n- Health: http://${config.host || "0.0.0.0"}:${config.port}/health\n${config.routes.length > 0 ? `\nConfigured routes:\n${config.routes.map((r: any) => `- ${r.method} ${r.path} → ${r.action}`).join("\n")}` : ""}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to start webhook server: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (op === "webhook_stop") {
      return {
        content: [
          {
            type: "text",
            text: "Webhook server stop not implemented - server instances are not persisted.\nRestart the MCP server to stop all webhook servers.",
          },
        ],
      };
    }

    if (op === "webhook_status") {
      return {
        content: [
          {
            type: "text",
            text: "Webhook server status not implemented - server instances are not persisted.\nUse environment variables to configure permanent webhook servers.",
          },
        ],
      };
    }

    // MQTT operations
    if (op === "mqtt_connect") {
      const mqttConfig = args?.mqtt_config as any;
      if (!mqttConfig) {
        return {
          content: [
            {
              type: "text",
              text: 'fibaro_integration: "mqtt_connect" requires "mqtt_config" parameter',
            },
          ],
          isError: true,
        };
      }

      try {
        const { createMqttBridge } = await import("./integrations/mqtt-bridge.js");
        const config = {
          enabled: true,
          broker: mqttConfig.broker,
          clientId: mqttConfig.clientId || "fibaro-mcp",
          username: mqttConfig.username,
          password: mqttConfig.password,
          subscriptions: mqttConfig.subscriptions || [],
          publishState: mqttConfig.publishState || false,
        };

        const bridge = await createMqttBridge(config, client);
        await bridge.connect();

        return {
          content: [
            {
              type: "text",
              text: `MQTT bridge connected to ${config.broker}\n\nClient ID: ${config.clientId}\nSubscriptions: ${config.subscriptions.length}\nState publishing: ${config.publishState ? "enabled" : "disabled"}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to connect MQTT bridge: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }

    if (op === "mqtt_disconnect") {
      return {
        content: [
          {
            type: "text",
            text: "MQTT disconnect not implemented - bridge instances are not persisted.\nRestart the MCP server to disconnect all MQTT bridges.",
          },
        ],
      };
    }

    if (op === "mqtt_status") {
      return {
        content: [
          {
            type: "text",
            text: "MQTT status not implemented - bridge instances are not persisted.\nUse environment variables to configure permanent MQTT bridges.",
          },
        ],
      };
    }

    if (op === "mqtt_publish") {
      return {
        content: [
          {
            type: "text",
            text: "MQTT publish not implemented - bridge instances are not persisted.\nConnect to MQTT first using mqtt_connect to publish messages.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `fibaro_integration: unsupported op "${op}". Supported ops: webhook_start|webhook_stop|webhook_status|mqtt_connect|mqtt_disconnect|mqtt_status|mqtt_publish`,
        },
      ],
    };
  }

  if (name === "fibaro_automation") {
    const { getWorkflowEngine } = await import("./automation/workflow-engine.js");
    const workflow = getWorkflowEngine();

    const op = args?.op as string;
    if (!op) {
      return {
        content: [
          {
            type: "text",
            text: 'fibaro_automation: missing required parameter "op"',
          },
        ],
        isError: true,
      };
    }

    const automation = args?.automation as any;

    switch (op) {
      case "validate": {
        if (!automation) {
          return {
            content: [
              {
                type: "text",
                text: 'fibaro_automation: "validate" operation requires "automation" parameter',
              },
            ],
            isError: true,
          };
        }

        try {
          const validation = workflow.validateAutomation(automation);

          let text = `Automation Validation: ${automation.name}\n\n`;
          text += `Status: ${validation.valid ? "VALID ✓" : "INVALID ✗"}\n\n`;

          if (validation.errors.length > 0) {
            text += `Errors (${validation.errors.length}):\n`;
            for (const error of validation.errors) {
              text += `  ✗ ${error}\n`;
            }
            text += "\n";
          }

          if (validation.warnings.length > 0) {
            text += `Warnings (${validation.warnings.length}):\n`;
            for (const warning of validation.warnings) {
              text += `  ⚠ ${warning}\n`;
            }
          }

          if (validation.valid && validation.warnings.length === 0) {
            text += "No errors or warnings found.";
          }

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_automation: validation failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "generate_lua": {
        if (!automation) {
          return {
            content: [
              {
                type: "text",
                text: 'fibaro_automation: "generate_lua" operation requires "automation" parameter',
              },
            ],
            isError: true,
          };
        }

        try {
          const luaCode = workflow.generateLuaCode(automation);

          let text = `Generated Lua Code for: ${automation.name}\n\n`;
          text += "```lua\n";
          text += luaCode;
          text += "\n```\n\n";
          text += `Total lines: ${luaCode.split("\n").length}`;

          return {
            content: [{ type: "text", text }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_automation: generate_lua failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      case "create": {
        if (!automation) {
          return {
            content: [
              {
                type: "text",
                text: 'fibaro_automation: "create" operation requires "automation" parameter',
              },
            ],
            isError: true,
          };
        }

        const deploy = args?.deploy as boolean | undefined;

        try {
          const result = await workflow.createAutomation(client, automation, deploy);

          let text = `Automation Created: ${automation.name}\n\n`;

          if (result.validation.valid) {
            text += `Status: SUCCESS ✓\n\n`;

            if (deploy && result.sceneId) {
              text += `Deployed as Scene ID: ${result.sceneId}\n\n`;
            }

            text += "Generated Lua Code:\n";
            text += "```lua\n";
            text += result.luaCode;
            text += "\n```\n";

            if (result.validation.warnings.length > 0) {
              text += `\nWarnings (${result.validation.warnings.length}):\n`;
              for (const warning of result.validation.warnings) {
                text += `  ⚠ ${warning}\n`;
              }
            }
          } else {
            text += `Status: FAILED ✗\n\n`;
            text += `Errors (${result.validation.errors.length}):\n`;
            for (const error of result.validation.errors) {
              text += `  ✗ ${error}\n`;
            }
          }

          return {
            content: [{ type: "text", text }],
            isError: !result.validation.valid,
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `fibaro_automation: create failed - ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      default:
        return {
          content: [
            {
              type: "text",
              text: `fibaro_automation: unsupported op "${op}". Supported ops: create|validate|generate_lua`,
            },
          ],
        };
    }
  }

  switch (name) {
    case "list_devices": {
      let devices = await client.getDevices();

      const normalize = (str: string): string =>
        str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/ł/g, "l")
          .replace(/ø/g, "o")
          .replace(/đ/g, "d")
          .replace(/ß/g, "ss")
          .replace(/æ/g, "ae")
          .replace(/œ/g, "oe")
          .replace(/þ/g, "th");

      if (args?.room_id) {
        devices = devices.filter((d) => d.roomID === args.room_id);
      }
      if (args?.section_id) {
        const rooms = await client.getRooms();
        const roomsInSection = rooms
          .filter((r) => r.sectionID === args.section_id)
          .map((r) => r.id);
        devices = devices.filter((d) => roomsInSection.includes(d.roomID));
      }
      if (args?.type) {
        devices = devices.filter((d) => d.type === args.type);
      }
      if (args?.base_type) {
        devices = devices.filter((d) => d.baseType === args.base_type);
      }
      if (args?.name) {
        const searchName = normalize(args.name as string);
        devices = devices.filter((d) => normalize(d.name || "").includes(searchName));
      }
      if (args?.interface) {
        devices = devices.filter(
          (d) => d.interfaces && d.interfaces.includes(args.interface as string),
        );
      }
      if (args?.parent_id) {
        devices = devices.filter((d) => (d as any).parentId === args.parent_id);
      }
      if (args?.enabled !== undefined) {
        devices = devices.filter((d) => d.enabled === args.enabled);
      }
      if (args?.visible !== undefined) {
        devices = devices.filter((d) => d.visible === args.visible);
      }
      if (args?.dead !== undefined) {
        devices = devices.filter((d) => (d as any).dead === args.dead);
      }

      let result: any = devices;
      if (args?.properties && Array.isArray(args.properties)) {
        const props = args.properties as string[];
        result = devices.map((device: any) => {
          const filtered: Record<string, any> = {};
          for (const prop of props) {
            if (prop in device) {
              filtered[prop] = device[prop];
            } else if (device.properties && prop in device.properties) {
              filtered[prop] = device.properties[prop];
            }
          }
          return filtered;
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case "get_device": {
      const device = await client.getDevice(args?.device_id as number);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(device, null, 2),
          },
        ],
      };
    }

    case "control_device": {
      await client.callAction(
        args?.device_id as number,
        args?.action as string,
        args?.args as any[],
      );
      return {
        content: [
          {
            type: "text",
            text: `Action ${args?.action} executed on device ${args?.device_id}`,
          },
        ],
      };
    }

    case "turn_on": {
      await client.turnOn(args?.device_id as number);
      return {
        content: [
          {
            type: "text",
            text: `Device ${args?.device_id} turned on`,
          },
        ],
      };
    }

    case "turn_off": {
      await client.turnOff(args?.device_id as number);
      return {
        content: [
          {
            type: "text",
            text: `Device ${args?.device_id} turned off`,
          },
        ],
      };
    }

    case "set_brightness": {
      await client.setBrightness(args?.device_id as number, args?.level as number);
      return {
        content: [
          {
            type: "text",
            text: `Device ${args?.device_id} brightness set to ${args?.level}%`,
          },
        ],
      };
    }

    case "set_color": {
      await client.setColor(
        args?.device_id as number,
        args?.r as number,
        args?.g as number,
        args?.b as number,
        args?.w as number | undefined,
      );
      return {
        content: [
          {
            type: "text",
            text: `Device ${args?.device_id} color set to RGB(${args?.r}, ${args?.g}, ${args?.b})`,
          },
        ],
      };
    }

    case "set_temperature": {
      await client.setTemperature(args?.device_id as number, args?.temperature as number);
      return {
        content: [
          {
            type: "text",
            text: `Device ${args?.device_id} temperature set to ${args?.temperature}°C`,
          },
        ],
      };
    }

    case "list_rooms": {
      const rooms = await client.getRooms();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(rooms, null, 2),
          },
        ],
      };
    }

    case "list_sections": {
      const sections = await client.getSections();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(sections, null, 2),
          },
        ],
      };
    }

    case "list_scenes": {
      let scenes = await client.getScenes();

      if (args?.room_id) {
        scenes = scenes.filter((s: any) => s.roomID === args?.room_id);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(scenes, null, 2),
          },
        ],
      };
    }

    case "get_scene": {
      const scene = await client.getScene(args?.scene_id as number);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(scene, null, 2),
          },
        ],
      };
    }

    case "run_scene": {
      await client.runScene(args?.scene_id as number);
      return {
        content: [
          {
            type: "text",
            text: `Scene ${args?.scene_id} started`,
          },
        ],
      };
    }

    case "stop_scene": {
      await client.stopScene(args?.scene_id as number);
      return {
        content: [
          {
            type: "text",
            text: `Scene ${args?.scene_id} stopped`,
          },
        ],
      };
    }

    case "list_global_variables": {
      const variables = await client.getGlobalVariables();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(variables, null, 2),
          },
        ],
      };
    }

    case "get_global_variable": {
      const variable = await client.getGlobalVariable(args?.name as string);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(variable, null, 2),
          },
        ],
      };
    }

    case "set_global_variable": {
      await client.setGlobalVariable(args?.name as string, args?.value as string);
      return {
        content: [
          {
            type: "text",
            text: `Global variable '${args?.name}' set to '${args?.value}'`,
          },
        ],
      };
    }

    case "get_system_info": {
      const info = await client.getSystemInfo();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    }

    case "get_weather": {
      const weather = await client.getWeather();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(weather, null, 2),
          },
        ],
      };
    }

    case "get_energy_panel": {
      const energy = await client.getEnergyPanel();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(energy, null, 2),
          },
        ],
      };
    }

    case "get_scene_lua": {
      const scene = await client.getScene(args?.scene_id as number);
      return {
        content: [
          {
            type: "text",
            text: scene.lua
              ? `Scene ${scene.name} (ID: ${scene.id}) - Lua Code:\n\n${scene.lua}`
              : `Scene ${scene.name} (ID: ${scene.id}) is not a Lua scene or has no code available.`,
          },
        ],
      };
    }

    case "list_quick_apps": {
      const quickApps = await client.getQuickApps();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(quickApps, null, 2),
          },
        ],
      };
    }

    case "get_device_lua": {
      const deviceLua = await client.getDeviceLua(args?.device_id as number);
      const codeText = deviceLua.code
        ? `\n\nLua Code:\n${deviceLua.code}`
        : "\n\nNo Lua code found for this device.";
      const varsText =
        deviceLua.quickAppVariables.length > 0
          ? `\n\nQuick App Variables:\n${JSON.stringify(deviceLua.quickAppVariables, null, 2)}`
          : "";
      return {
        content: [
          {
            type: "text",
            text: `Device: ${deviceLua.device.name} (ID: ${deviceLua.device.id})${codeText}${varsText}`,
          },
        ],
      };
    }

    case "create_scene": {
      const created = await client.createScene({
        name: args?.name as string,
        roomID: args?.room_id as number,
        lua: args?.lua as string,
      });
      return {
        content: [
          {
            type: "text",
            text: `Scene "${created.name}" created successfully with ID: ${created.id}`,
          },
        ],
      };
    }

    case "update_scene_lua": {
      const updates: any = {};
      if (args?.lua !== undefined) updates.lua = args.lua;
      if (args?.name !== undefined) updates.name = args.name;
      if (args?.room_id !== undefined) updates.roomID = args.room_id;

      const updated = await client.updateScene(args?.scene_id as number, updates);
      return {
        content: [
          {
            type: "text",
            text: `Scene "${updated.name}" (ID: ${updated.id}) updated successfully`,
          },
        ],
      };
    }

    case "delete_scene": {
      await client.deleteScene(args?.scene_id as number);
      return {
        content: [
          {
            type: "text",
            text: `Scene ${args?.scene_id} deleted successfully`,
          },
        ],
      };
    }

    case "create_quick_app": {
      const quickApp = await client.createQuickApp({
        name: args?.name as string,
        type: args?.type as string,
        roomID: args?.room_id as number,
        code: args?.code as string,
      });
      return {
        content: [
          {
            type: "text",
            text: `Quick App "${quickApp.name}" created successfully with ID: ${quickApp.id}`,
          },
        ],
      };
    }

    case "update_quick_app_code": {
      await client.updateQuickAppCode(args?.device_id as number, args?.code as string);
      return {
        content: [
          {
            type: "text",
            text: `Quick App ${args?.device_id} code updated successfully`,
          },
        ],
      };
    }

    case "update_quick_app_variables": {
      await client.updateQuickAppVariables(args?.device_id as number, args?.variables as any[]);
      return {
        content: [
          {
            type: "text",
            text: `Quick App ${args?.device_id} variables updated successfully`,
          },
        ],
      };
    }

    case "delete_device": {
      await client.deleteDevice(args?.device_id as number);
      return {
        content: [
          {
            type: "text",
            text: `Device ${args?.device_id} deleted successfully`,
          },
        ],
      };
    }

    case "create_room": {
      const room = await client.createRoom({
        name: args?.name as string,
        sectionID: args?.section_id as number,
        icon: args?.icon as string,
      });
      return {
        content: [{ type: "text", text: `Room "${room.name}" created with ID: ${room.id}` }],
      };
    }

    case "update_room": {
      const updates: any = {};
      if (args?.name) updates.name = args.name;
      if (args?.section_id) updates.sectionID = args.section_id;
      if (args?.icon) updates.icon = args.icon;
      const room = await client.updateRoom(args?.room_id as number, updates);
      return {
        content: [{ type: "text", text: `Room "${room.name}" updated successfully` }],
      };
    }

    case "delete_room": {
      await client.deleteRoom(args?.room_id as number);
      return {
        content: [{ type: "text", text: `Room ${args?.room_id} deleted successfully` }],
      };
    }

    case "create_section": {
      const section = await client.createSection({
        name: args?.name as string,
        icon: args?.icon as string,
      });
      return {
        content: [
          { type: "text", text: `Section "${section.name}" created with ID: ${section.id}` },
        ],
      };
    }

    case "update_section": {
      const updates: any = {};
      if (args?.name) updates.name = args.name;
      if (args?.icon) updates.icon = args.icon;
      const section = await client.updateSection(args?.section_id as number, updates);
      return {
        content: [{ type: "text", text: `Section "${section.name}" updated successfully` }],
      };
    }

    case "delete_section": {
      await client.deleteSection(args?.section_id as number);
      return {
        content: [{ type: "text", text: `Section ${args?.section_id} deleted successfully` }],
      };
    }

    case "list_users": {
      const users = await client.getUsers();
      return {
        content: [{ type: "text", text: JSON.stringify(users, null, 2) }],
      };
    }

    case "create_user": {
      const user = await client.createUser({
        name: args?.name as string,
        username: args?.username as string,
        password: args?.password as string,
        email: args?.email as string,
        type: args?.type as string,
      });
      return {
        content: [{ type: "text", text: `User "${user.name}" created with ID: ${user.id}` }],
      };
    }

    case "update_user": {
      const updates: any = {};
      if (args?.name) updates.name = args.name;
      if (args?.email) updates.email = args.email;
      if (args?.password) updates.password = args.password;
      await client.updateUser(args?.user_id as number, updates);
      return {
        content: [{ type: "text", text: `User ${args?.user_id} updated successfully` }],
      };
    }

    case "delete_user": {
      await client.deleteUser(args?.user_id as number);
      return {
        content: [{ type: "text", text: `User ${args?.user_id} deleted successfully` }],
      };
    }

    case "list_profiles": {
      const profiles = await client.getProfiles();
      return {
        content: [{ type: "text", text: JSON.stringify(profiles, null, 2) }],
      };
    }

    case "get_active_profile": {
      const profile = await client.getActiveProfile();
      return {
        content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
      };
    }

    case "set_active_profile": {
      await client.setActiveProfile(args?.profile_id as number);
      return {
        content: [{ type: "text", text: `Profile ${args?.profile_id} activated` }],
      };
    }

    case "list_notifications": {
      const notifications = await client.getNotifications();
      return {
        content: [{ type: "text", text: JSON.stringify(notifications, null, 2) }],
      };
    }

    case "send_notification": {
      await client.sendNotification({
        type: args?.type as string,
        title: args?.title as string,
        text: args?.text as string,
        users: args?.users as number[],
      });
      return {
        content: [{ type: "text", text: "Notification sent successfully" }],
      };
    }

    case "list_alarms": {
      const alarms = await client.getAlarms();
      return {
        content: [{ type: "text", text: JSON.stringify(alarms, null, 2) }],
      };
    }

    case "arm_alarm": {
      await client.armAlarm(args?.partition_id as number);
      return {
        content: [{ type: "text", text: `Alarm partition ${args?.partition_id} armed` }],
      };
    }

    case "disarm_alarm": {
      await client.disarmAlarm(args?.partition_id as number);
      return {
        content: [{ type: "text", text: `Alarm partition ${args?.partition_id} disarmed` }],
      };
    }

    case "get_zwave_network": {
      const network = await client.getZWaveNetwork();
      return {
        content: [{ type: "text", text: JSON.stringify(network, null, 2) }],
      };
    }

    case "start_zwave_inclusion": {
      await client.startZWaveInclusion();
      return {
        content: [{ type: "text", text: "Z-Wave inclusion mode started" }],
      };
    }

    case "stop_zwave_inclusion": {
      await client.stopZWaveInclusion();
      return {
        content: [{ type: "text", text: "Z-Wave inclusion mode stopped" }],
      };
    }

    case "start_zwave_exclusion": {
      await client.startZWaveExclusion();
      return {
        content: [{ type: "text", text: "Z-Wave exclusion mode started" }],
      };
    }

    case "stop_zwave_exclusion": {
      await client.stopZWaveExclusion();
      return {
        content: [{ type: "text", text: "Z-Wave exclusion mode stopped" }],
      };
    }

    case "remove_failed_zwave_node": {
      await client.removeFailedZWaveNode(args?.node_id as number);
      return {
        content: [{ type: "text", text: `Z-Wave node ${args?.node_id} removed` }],
      };
    }

    case "heal_zwave_network": {
      await client.healZWaveNetwork();
      return {
        content: [{ type: "text", text: "Z-Wave network healing started" }],
      };
    }

    case "create_backup": {
      const backup = await client.createBackup();
      return {
        content: [{ type: "text", text: `Backup created: ${JSON.stringify(backup)}` }],
      };
    }

    case "list_backups": {
      const backups = await client.getBackups();
      return {
        content: [{ type: "text", text: JSON.stringify(backups, null, 2) }],
      };
    }

    case "restore_backup": {
      await client.restoreBackup(args?.backup_id as string);
      return {
        content: [{ type: "text", text: `Restoring backup ${args?.backup_id}...` }],
      };
    }

    case "get_settings": {
      const settings = await client.getSettings();
      return {
        content: [{ type: "text", text: JSON.stringify(settings, null, 2) }],
      };
    }

    case "update_settings": {
      await client.updateSettings(args?.settings as Record<string, any>);
      return {
        content: [{ type: "text", text: "Settings updated successfully" }],
      };
    }

    case "restart_system": {
      await client.restartSystem();
      return {
        content: [{ type: "text", text: "System restart initiated" }],
      };
    }

    case "get_event_log": {
      const logs = await client.getEventLog({
        from: args?.from as number,
        to: args?.to as number,
        type: args?.type as string,
        limit: args?.limit as number,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(logs, null, 2) }],
      };
    }

    case "list_geofences": {
      const geofences = await client.getGeofences();
      return {
        content: [{ type: "text", text: JSON.stringify(geofences, null, 2) }],
      };
    }

    case "create_geofence": {
      const geofence = await client.createGeofence({
        name: args?.name as string,
        latitude: args?.latitude as number,
        longitude: args?.longitude as number,
        radius: args?.radius as number,
      });
      return {
        content: [{ type: "text", text: `Geofence "${geofence.name}" created` }],
      };
    }

    case "update_geofence": {
      const updates: any = {};
      if (args?.name) updates.name = args.name;
      if (args?.latitude) updates.latitude = args.latitude;
      if (args?.longitude) updates.longitude = args.longitude;
      if (args?.radius) updates.radius = args.radius;
      await client.updateGeofence(args?.geofence_id as number, updates);
      return {
        content: [{ type: "text", text: `Geofence ${args?.geofence_id} updated` }],
      };
    }

    case "delete_geofence": {
      await client.deleteGeofence(args?.geofence_id as number);
      return {
        content: [{ type: "text", text: `Geofence ${args?.geofence_id} deleted` }],
      };
    }

    case "list_plugins": {
      const plugins = await client.getPlugins();
      return {
        content: [{ type: "text", text: JSON.stringify(plugins, null, 2) }],
      };
    }

    case "install_plugin": {
      await client.installPlugin(args?.url as string);
      return {
        content: [{ type: "text", text: `Plugin installation from ${args?.url} started` }],
      };
    }

    case "uninstall_plugin": {
      await client.uninstallPlugin(args?.plugin_id as string);
      return {
        content: [{ type: "text", text: `Plugin ${args?.plugin_id} uninstalled` }],
      };
    }

    case "restart_plugin": {
      await client.restartPlugin(args?.plugin_id as string);
      return {
        content: [{ type: "text", text: `Plugin ${args?.plugin_id} restarted` }],
      };
    }

    case "trigger_custom_event": {
      await client.triggerCustomEvent(args?.event_name as string, args?.data);
      return {
        content: [{ type: "text", text: `Custom event "${args?.event_name}" triggered` }],
      };
    }

    case "list_climate_zones": {
      const zones = await client.getClimateZones();
      return {
        content: [{ type: "text", text: JSON.stringify(zones, null, 2) }],
      };
    }

    case "set_climate_mode": {
      await client.setClimateMode(args?.zone_id as number, args?.mode as string);
      return {
        content: [{ type: "text", text: `Climate zone ${args?.zone_id} set to ${args?.mode}` }],
      };
    }

    case "get_device_stats": {
      const deviceId = args?.device_id as number;
      const from = args?.from as number | undefined;
      const to = args?.to as number | undefined;
      const aggregation = args?.aggregation as AggregationInterval | undefined;
      const maxPoints = args?.max_points as number | undefined;
      const metrics = args?.metrics as MetricType[] | undefined;
      const property = args?.property as string | undefined;

      // If no time range specified, use legacy behavior (pass-through to API)
      if (from === undefined || to === undefined) {
        const stats = await client.getDeviceStats(deviceId, { from, to, property });
        return {
          content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
        };
      }

      // Validate parameters
      const validation = validateParams({
        device_id: deviceId,
        from,
        to,
        aggregation,
        max_points: maxPoints,
        metrics,
      });

      if (!validation.valid) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `get_device_stats: ${validation.errors.join(", ")}`,
        );
      }

      // Fetch raw stats from Fibaro API
      const rawStats = await client.getDeviceStats(deviceId, { from, to, property });

      // Get device name for context
      let deviceName: string | undefined;
      try {
        const device = await client.getDevice(deviceId);
        deviceName = device?.name;
      } catch {
        // Device name is optional, continue without it
      }

      // Aggregate the data
      const aggregatedStats = aggregateDeviceStats(
        rawStats,
        validation.normalized,
        deviceName,
      );

      // Format for response (round numbers)
      const formattedStats = formatForResponse(aggregatedStats);

      return {
        content: [{ type: "text", text: JSON.stringify(formattedStats, null, 2) }],
      };
    }

    case "create_global_variable": {
      const variable = await client.createGlobalVariable({
        name: args?.name as string,
        value: args?.value as string,
        isEnum: args?.is_enum as boolean,
        enumValues: args?.enum_values as string[],
      });
      return {
        content: [{ type: "text", text: `Global variable "${variable.name}" created` }],
      };
    }

    case "delete_global_variable": {
      await client.deleteGlobalVariable(args?.name as string);
      return {
        content: [{ type: "text", text: `Global variable "${args?.name}" deleted` }],
      };
    }

    case "find_by_name": {
      const query = (args?.query as string) || "";
      const kind = (args?.kind as string) || "all";
      const exact = Boolean(args?.exact);
      const limit = Math.max(1, Math.min(200, Number(args?.limit || 20)));

      const [rooms, sections, devices] = await Promise.all([
        client.getRooms(),
        client.getSections(),
        client.getDevices(),
      ]);

      const { rooms: roomResults, devices: deviceResults } = findMatches({
        query,
        kind: kind as any,
        exact,
        limit,
        rooms,
        sections,
        devices,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query,
                kind,
                exact,
                limit,
                rooms: roomResults,
                devices: deviceResults,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    case "resolve_by_name": {
      const query = (args?.query as string) || "";
      const kind = (args?.kind as string) || "devices";
      const exact = Boolean(args?.exact);
      const limit = Math.max(1, Math.min(200, Number(args?.limit || 20)));

      const allowMultiple =
        typeof args?.allow_multiple === "boolean"
          ? (args.allow_multiple as boolean)
          : isPluralishQuery(query);

      const [rooms, sections, devices] = await Promise.all([
        client.getRooms(),
        client.getSections(),
        client.getDevices(),
      ]);

      const { rooms: roomResults, devices: deviceResults } = findMatches({
        query,
        kind: kind as any,
        exact,
        limit,
        rooms,
        sections,
        devices,
      });

      if (!allowMultiple) {
        if (kind === "devices") {
          if (deviceResults.length === 0) {
            throw new McpError(ErrorCode.InvalidRequest, `No devices matched query: ${query}`);
          }
          if (deviceResults.length > 1) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Ambiguous device query: ${query} (matched ${deviceResults.length}). Use a more specific name, set exact=true, or allow_multiple=true.`,
            );
          }
        } else if (kind === "rooms") {
          if (roomResults.length === 0) {
            throw new McpError(ErrorCode.InvalidRequest, `No rooms matched query: ${query}`);
          }
          if (roomResults.length > 1) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Ambiguous room query: ${query} (matched ${roomResults.length}). Use a more specific name, set exact=true, or allow_multiple=true.`,
            );
          }
        } else {
          const total = roomResults.length + deviceResults.length;
          if (total === 0) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `No rooms or devices matched query: ${query}`,
            );
          }
          if (total > 1) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              `Ambiguous query: ${query} (matched ${total}). Set kind to rooms/devices, make query more specific, or allow_multiple=true.`,
            );
          }
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query,
                kind,
                exact,
                allow_multiple: allowMultiple,
                limit,
                rooms: roomResults,
                devices: deviceResults,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
}

export async function handleToolCall(
  client: FibaroClientLike,
  name: string,
  args: any,
): Promise<CallToolResult> {
  const format = (args?.format as string | undefined)?.toLowerCase();
  const forwardedArgs = args && typeof args === "object" ? { ...args } : args;
  if (forwardedArgs && typeof forwardedArgs === "object") {
    delete (forwardedArgs as any).format;
  }

  const result = await handleToolCallInternal(client, name, forwardedArgs);
  if (format === "json") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  return result;
}
