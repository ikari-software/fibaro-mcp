import {
    ErrorCode,
    McpError,
    type CallToolResult,
    type ListResourcesResult,
    type ListToolsResult,
    type ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js';
import { findMatches, isPluralishQuery } from './name-lookup.js';

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
    createScene: (scene: { name: string; roomID: number; lua?: string; type?: string; isLua?: boolean }) => Promise<any>;
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
    return {
        tools: [
            {
                name: 'list_devices',
                description: 'List all devices in the Fibaro system',
                inputSchema: {
                    type: 'object',
                    properties: {
                        room_id: {
                            type: 'number',
                            description: 'Optional: Filter devices by room ID',
                        },
                        section_id: {
                            type: 'number',
                            description: 'Optional: Filter devices by section ID',
                        },
                        type: {
                            type: 'string',
                            description: 'Optional: Filter devices by type (e.g., com.fibaro.binarySwitch)',
                        },
                        base_type: {
                            type: 'string',
                            description: 'Optional: Filter devices by base type category',
                        },
                        name: {
                            type: 'string',
                            description: 'Optional: Filter devices by name (case-insensitive, ignores diacritics)',
                        },
                        interface: {
                            type: 'string',
                            description:
                                'Optional: Filter devices by interface/capability (e.g., "battery", "power", "light")',
                        },
                        parent_id: {
                            type: 'number',
                            description: 'Optional: Filter devices by parent device ID',
                        },
                        enabled: {
                            type: 'boolean',
                            description: 'Optional: Filter by enabled status (true/false)',
                        },
                        visible: {
                            type: 'boolean',
                            description: 'Optional: Filter by visible status (true/false)',
                        },
                        dead: {
                            type: 'boolean',
                            description: 'Optional: Filter by dead/unresponsive status (true/false)',
                        },
                        properties: {
                            type: 'array',
                            items: { type: 'string' },
                            description:
                                'Optional: Return only these properties for each device (e.g., ["id", "name", "roomID", "value"]). If not specified, returns all properties.',
                        },
                    },
                },
            },
            {
                name: 'get_device',
                description: 'Get detailed information about a specific device',
                inputSchema: {
                    type: 'object',
                    properties: {
                        device_id: {
                            type: 'number',
                            description: 'The ID of the device',
                        },
                    },
                    required: ['device_id'],
                },
            },
            {
                name: 'control_device',
                description: 'Control a device by calling an action',
                inputSchema: {
                    type: 'object',
                    properties: {
                        device_id: {
                            type: 'number',
                            description: 'The ID of the device to control',
                        },
                        action: {
                            type: 'string',
                            description: 'The action to perform (e.g., turnOn, turnOff, setValue)',
                        },
                        args: {
                            type: 'array',
                            description: 'Optional arguments for the action',
                            items: {},
                        },
                    },
                    required: ['device_id', 'action'],
                },
            },
            {
                name: 'turn_on',
                description: 'Turn on a device (light, switch, etc.)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        device_id: {
                            type: 'number',
                            description: 'The ID of the device to turn on',
                        },
                    },
                    required: ['device_id'],
                },
            },
            {
                name: 'turn_off',
                description: 'Turn off a device (light, switch, etc.)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        device_id: {
                            type: 'number',
                            description: 'The ID of the device to turn off',
                        },
                    },
                    required: ['device_id'],
                },
            },
            {
                name: 'set_brightness',
                description: 'Set brightness level for a dimmable light',
                inputSchema: {
                    type: 'object',
                    properties: {
                        device_id: {
                            type: 'number',
                            description: 'The ID of the device',
                        },
                        level: {
                            type: 'number',
                            description: 'Brightness level (0-100)',
                            minimum: 0,
                            maximum: 100,
                        },
                    },
                    required: ['device_id', 'level'],
                },
            },
            {
                name: 'set_color',
                description: 'Set RGB color for a color-capable light',
                inputSchema: {
                    type: 'object',
                    properties: {
                        device_id: {
                            type: 'number',
                            description: 'The ID of the device',
                        },
                        r: {
                            type: 'number',
                            description: 'Red value (0-255)',
                            minimum: 0,
                            maximum: 255,
                        },
                        g: {
                            type: 'number',
                            description: 'Green value (0-255)',
                            minimum: 0,
                            maximum: 255,
                        },
                        b: {
                            type: 'number',
                            description: 'Blue value (0-255)',
                            minimum: 0,
                            maximum: 255,
                        },
                        w: {
                            type: 'number',
                            description: 'White value (0-255), optional',
                            minimum: 0,
                            maximum: 255,
                        },
                    },
                    required: ['device_id', 'r', 'g', 'b'],
                },
            },
            {
                name: 'set_temperature',
                description: 'Set the target temperature for a thermostat',
                inputSchema: {
                    type: 'object',
                    properties: {
                        device_id: {
                            type: 'number',
                            description: 'The ID of the thermostat device',
                        },
                        temperature: {
                            type: 'number',
                            description: 'Target temperature in Celsius',
                        },
                    },
                    required: ['device_id', 'temperature'],
                },
            },
            {
                name: 'list_rooms',
                description: 'List all rooms in the Fibaro system',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'list_sections',
                description: 'List all sections in the Fibaro system',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'list_scenes',
                description: 'List all scenes in the Fibaro system',
                inputSchema: {
                    type: 'object',
                    properties: {
                        room_id: {
                            type: 'number',
                            description: 'Optional: Filter scenes by room ID',
                        },
                    },
                },
            },
            {
                name: 'get_scene',
                description: 'Get detailed information about a specific scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        scene_id: {
                            type: 'number',
                            description: 'The ID of the scene',
                        },
                    },
                    required: ['scene_id'],
                },
            },
            {
                name: 'run_scene',
                description: 'Execute a scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        scene_id: {
                            type: 'number',
                            description: 'The ID of the scene to run',
                        },
                    },
                    required: ['scene_id'],
                },
            },
            {
                name: 'stop_scene',
                description: 'Stop a running scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        scene_id: {
                            type: 'number',
                            description: 'The ID of the scene to stop',
                        },
                    },
                    required: ['scene_id'],
                },
            },
            {
                name: 'list_global_variables',
                description: 'List all global variables',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_global_variable',
                description: 'Get the value of a specific global variable',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'The name of the global variable',
                        },
                    },
                    required: ['name'],
                },
            },
            {
                name: 'set_global_variable',
                description: 'Set the value of a global variable',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'The name of the global variable',
                        },
                        value: {
                            type: 'string',
                            description: 'The new value for the variable',
                        },
                    },
                    required: ['name', 'value'],
                },
            },
            {
                name: 'get_system_info',
                description: 'Get system information about the Fibaro Home Center',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_weather',
                description: 'Get current weather information',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_energy_panel',
                description: 'Get energy consumption data from the energy panel',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_scene_lua',
                description: 'Get the Lua script code from a scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        scene_id: {
                            type: 'number',
                            description: 'The ID of the scene',
                        },
                    },
                    required: ['scene_id'],
                },
            },
            {
                name: 'list_quick_apps',
                description: 'List all Quick Apps (Lua-based applications)',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_device_lua',
                description: 'Get Lua code and variables from a device (Quick App)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        device_id: {
                            type: 'number',
                            description: 'The ID of the device/Quick App',
                        },
                    },
                    required: ['device_id'],
                },
            },
            {
                name: 'create_scene',
                description: 'Create a new Lua scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'The name of the scene',
                        },
                        room_id: {
                            type: 'number',
                            description: 'The room ID where the scene should be placed',
                        },
                        lua: {
                            type: 'string',
                            description: 'The Lua code for the scene',
                        },
                    },
                    required: ['name', 'room_id'],
                },
            },
            {
                name: 'update_scene_lua',
                description: 'Update the Lua code of an existing scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        scene_id: {
                            type: 'number',
                            description: 'The ID of the scene to update',
                        },
                        lua: {
                            type: 'string',
                            description: 'The new Lua code for the scene',
                        },
                        name: {
                            type: 'string',
                            description: 'Optional: Update the scene name',
                        },
                        room_id: {
                            type: 'number',
                            description: 'Optional: Move the scene to a different room',
                        },
                    },
                    required: ['scene_id'],
                },
            },
            {
                name: 'delete_scene',
                description: 'Delete a scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        scene_id: {
                            type: 'number',
                            description: 'The ID of the scene to delete',
                        },
                    },
                    required: ['scene_id'],
                },
            },
            {
                name: 'create_quick_app',
                description: 'Create a new Quick App (Lua application)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: {
                            type: 'string',
                            description: 'The name of the Quick App',
                        },
                        type: {
                            type: 'string',
                            description: 'The Quick App type (e.g., com.fibaro.quickApp)',
                        },
                        room_id: {
                            type: 'number',
                            description: 'Optional: The room ID',
                        },
                        code: {
                            type: 'string',
                            description: 'The Lua code for the Quick App',
                        },
                    },
                    required: ['name', 'type'],
                },
            },
            {
                name: 'update_quick_app_code',
                description: 'Update the Lua code of a Quick App',
                inputSchema: {
                    type: 'object',
                    properties: {
                        device_id: {
                            type: 'number',
                            description: 'The ID of the Quick App device',
                        },
                        code: {
                            type: 'string',
                            description: 'The new Lua code',
                        },
                    },
                    required: ['device_id', 'code'],
                },
            },
            {
                name: 'update_quick_app_variables',
                description: 'Update Quick App variables',
                inputSchema: {
                    type: 'object',
                    properties: {
                        device_id: {
                            type: 'number',
                            description: 'The ID of the Quick App device',
                        },
                        variables: {
                            type: 'array',
                            description: 'Array of variables with name, value, and optional type',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    value: {},
                                    type: { type: 'string' },
                                },
                                required: ['name', 'value'],
                            },
                        },
                    },
                    required: ['device_id', 'variables'],
                },
            },
            {
                name: 'delete_device',
                description: 'Delete a device (including Quick Apps)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        device_id: {
                            type: 'number',
                            description: 'The ID of the device to delete',
                        },
                    },
                    required: ['device_id'],
                },
            },
            {
                name: 'create_room',
                description: 'Create a new room',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Room name' },
                        section_id: { type: 'number', description: 'Section ID' },
                        icon: { type: 'string', description: 'Optional: Icon name' },
                    },
                    required: ['name', 'section_id'],
                },
            },
            {
                name: 'update_room',
                description: 'Update room properties',
                inputSchema: {
                    type: 'object',
                    properties: {
                        room_id: { type: 'number' },
                        name: { type: 'string' },
                        section_id: { type: 'number' },
                        icon: { type: 'string' },
                    },
                    required: ['room_id'],
                },
            },
            {
                name: 'delete_room',
                description: 'Delete a room',
                inputSchema: {
                    type: 'object',
                    properties: {
                        room_id: { type: 'number' },
                    },
                    required: ['room_id'],
                },
            },
            {
                name: 'create_section',
                description: 'Create a new section',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        icon: { type: 'string' },
                    },
                    required: ['name'],
                },
            },
            {
                name: 'update_section',
                description: 'Update section properties',
                inputSchema: {
                    type: 'object',
                    properties: {
                        section_id: { type: 'number' },
                        name: { type: 'string' },
                        icon: { type: 'string' },
                    },
                    required: ['section_id'],
                },
            },
            {
                name: 'delete_section',
                description: 'Delete a section',
                inputSchema: {
                    type: 'object',
                    properties: {
                        section_id: { type: 'number' },
                    },
                    required: ['section_id'],
                },
            },
            {
                name: 'list_users',
                description: 'List all users',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'create_user',
                description: 'Create a new user',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        username: { type: 'string' },
                        password: { type: 'string' },
                        email: { type: 'string' },
                        type: { type: 'string' },
                    },
                    required: ['name', 'username', 'password'],
                },
            },
            {
                name: 'update_user',
                description: 'Update user properties',
                inputSchema: {
                    type: 'object',
                    properties: {
                        user_id: { type: 'number' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        password: { type: 'string' },
                    },
                    required: ['user_id'],
                },
            },
            {
                name: 'delete_user',
                description: 'Delete a user',
                inputSchema: {
                    type: 'object',
                    properties: {
                        user_id: { type: 'number' },
                    },
                    required: ['user_id'],
                },
            },
            {
                name: 'list_profiles',
                description: 'List all home profiles/modes',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_active_profile',
                description: 'Get the currently active profile',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'set_active_profile',
                description: 'Set the active profile/mode',
                inputSchema: {
                    type: 'object',
                    properties: {
                        profile_id: { type: 'number' },
                    },
                    required: ['profile_id'],
                },
            },
            {
                name: 'list_notifications',
                description: 'List all notifications',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'send_notification',
                description: 'Send a notification to users',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type: { type: 'string' },
                        title: { type: 'string' },
                        text: { type: 'string' },
                        users: { type: 'array', items: { type: 'number' } },
                    },
                    required: ['type', 'text'],
                },
            },
            {
                name: 'list_alarms',
                description: 'List all alarm partitions',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'arm_alarm',
                description: 'Arm an alarm partition',
                inputSchema: {
                    type: 'object',
                    properties: {
                        partition_id: { type: 'number' },
                    },
                    required: ['partition_id'],
                },
            },
            {
                name: 'disarm_alarm',
                description: 'Disarm an alarm partition',
                inputSchema: {
                    type: 'object',
                    properties: {
                        partition_id: { type: 'number' },
                    },
                    required: ['partition_id'],
                },
            },
            {
                name: 'get_zwave_network',
                description: 'Get Z-Wave network status and nodes',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'start_zwave_inclusion',
                description: 'Start Z-Wave inclusion mode',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'stop_zwave_inclusion',
                description: 'Stop Z-Wave inclusion mode',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'start_zwave_exclusion',
                description: 'Start Z-Wave exclusion mode',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'stop_zwave_exclusion',
                description: 'Stop Z-Wave exclusion mode',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'remove_failed_zwave_node',
                description: 'Remove a failed Z-Wave node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        node_id: { type: 'number' },
                    },
                    required: ['node_id'],
                },
            },
            {
                name: 'heal_zwave_network',
                description: 'Heal the Z-Wave network',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'create_backup',
                description: 'Create a system backup',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'list_backups',
                description: 'List available system backups',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'restore_backup',
                description: 'Restore a system backup by ID',
                inputSchema: {
                    type: 'object',
                    properties: {
                        backup_id: { type: 'string' },
                    },
                    required: ['backup_id'],
                },
            },
            {
                name: 'get_settings',
                description: 'Get system settings',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'update_settings',
                description: 'Update system settings',
                inputSchema: {
                    type: 'object',
                    properties: {
                        settings: { type: 'object' },
                    },
                    required: ['settings'],
                },
            },
            {
                name: 'restart_system',
                description: 'Restart the Fibaro Home Center',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_event_log',
                description: 'Get event logs',
                inputSchema: {
                    type: 'object',
                    properties: {
                        from: { type: 'number' },
                        to: { type: 'number' },
                        type: { type: 'string' },
                        limit: { type: 'number' },
                    },
                },
            },
            {
                name: 'list_geofences',
                description: 'List all geofences',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'create_geofence',
                description: 'Create a new geofence',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        latitude: { type: 'number' },
                        longitude: { type: 'number' },
                        radius: { type: 'number' },
                    },
                    required: ['name', 'latitude', 'longitude', 'radius'],
                },
            },
            {
                name: 'update_geofence',
                description: 'Update an existing geofence',
                inputSchema: {
                    type: 'object',
                    properties: {
                        geofence_id: { type: 'number' },
                        name: { type: 'string' },
                        latitude: { type: 'number' },
                        longitude: { type: 'number' },
                        radius: { type: 'number' },
                    },
                    required: ['geofence_id'],
                },
            },
            {
                name: 'delete_geofence',
                description: 'Delete a geofence',
                inputSchema: {
                    type: 'object',
                    properties: {
                        geofence_id: { type: 'number' },
                    },
                    required: ['geofence_id'],
                },
            },
            {
                name: 'list_plugins',
                description: 'List installed plugins',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'install_plugin',
                description: 'Install a plugin from URL',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string' },
                    },
                    required: ['url'],
                },
            },
            {
                name: 'uninstall_plugin',
                description: 'Uninstall a plugin by ID',
                inputSchema: {
                    type: 'object',
                    properties: {
                        plugin_id: { type: 'string' },
                    },
                    required: ['plugin_id'],
                },
            },
            {
                name: 'restart_plugin',
                description: 'Restart a plugin by ID',
                inputSchema: {
                    type: 'object',
                    properties: {
                        plugin_id: { type: 'string' },
                    },
                    required: ['plugin_id'],
                },
            },
            {
                name: 'trigger_custom_event',
                description: 'Trigger a custom event',
                inputSchema: {
                    type: 'object',
                    properties: {
                        event_name: { type: 'string' },
                        data: {},
                    },
                    required: ['event_name'],
                },
            },
            {
                name: 'list_climate_zones',
                description: 'List climate zones',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'set_climate_mode',
                description: 'Set climate mode for a zone',
                inputSchema: {
                    type: 'object',
                    properties: {
                        zone_id: { type: 'number' },
                        mode: { type: 'string' },
                    },
                    required: ['zone_id', 'mode'],
                },
            },
            {
                name: 'get_device_stats',
                description: 'Get device statistics',
                inputSchema: {
                    type: 'object',
                    properties: {
                        device_id: { type: 'number' },
                        from: { type: 'number' },
                        to: { type: 'number' },
                        property: { type: 'string' },
                    },
                    required: ['device_id'],
                },
            },
            {
                name: 'create_global_variable',
                description: 'Create a global variable',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        value: { type: 'string' },
                        is_enum: { type: 'boolean' },
                        enum_values: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['name', 'value'],
                },
            },
            {
                name: 'delete_global_variable',
                description: 'Delete a global variable',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                    },
                    required: ['name'],
                },
            },
            {
                name: 'find_by_name',
                description:
                    'Find rooms and/or devices by name in a single call (case-insensitive, ignores diacritics). Returns matches enriched with room/section names.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search string (case-insensitive, ignores diacritics)',
                        },
                        kind: {
                            type: 'string',
                            description: 'What to search: "devices", "rooms", or "all" (default: all)',
                            enum: ['devices', 'rooms', 'all'],
                        },
                        exact: {
                            type: 'boolean',
                            description: 'If true, requires exact normalized match. If false, uses substring match (default: false).',
                        },
                        limit: {
                            type: 'number',
                            description: 'Max results per kind (default: 20)',
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'resolve_by_name',
                description:
                    'Resolve rooms and/or devices by name. By default requires a unique match, but automatically allows multiple matches when the query is plural (e.g., "lights", "all lamps").',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search string (case-insensitive, ignores diacritics)',
                        },
                        kind: {
                            type: 'string',
                            description: 'What to resolve: "devices", "rooms", or "all" (default: devices)',
                            enum: ['devices', 'rooms', 'all'],
                        },
                        exact: {
                            type: 'boolean',
                            description: 'If true, requires exact normalized match. If false, uses substring match (default: false).',
                        },
                        allow_multiple: {
                            type: 'boolean',
                            description:
                                'If true, allows multiple matches. If omitted, multiple matches are allowed only when the query appears plural (e.g., ends with "s" or starts with "all").',
                        },
                        limit: {
                            type: 'number',
                            description: 'Max results per kind (default: 20)',
                        },
                    },
                    required: ['query'],
                },
            },
        ],
    };
}

export function getResources(): ListResourcesResult {
    return {
        resources: [
            {
                uri: 'fibaro://devices',
                mimeType: 'application/json',
                name: 'Devices',
                description: 'List of all devices in the system',
            },
            {
                uri: 'fibaro://rooms',
                mimeType: 'application/json',
                name: 'Rooms',
                description: 'List of all rooms in the system',
            },
            {
                uri: 'fibaro://scenes',
                mimeType: 'application/json',
                name: 'Scenes',
                description: 'List of all scenes in the system',
            },
            {
                uri: 'fibaro://system',
                mimeType: 'application/json',
                name: 'System Info',
                description: 'System information',
            },
            {
                uri: 'fibaro://weather',
                mimeType: 'application/json',
                name: 'Weather',
                description: 'Current weather information',
            },
        ],
    };
}

export async function handleResourceRead(client: FibaroClientLike, uri: string): Promise<ReadResourceResult> {
    let data: any;

    switch (uri) {
        case 'fibaro://devices': {
            data = await client.getDevices();
            break;
        }
        case 'fibaro://rooms': {
            data = await client.getRooms();
            break;
        }
        case 'fibaro://scenes': {
            data = await client.getScenes();
            break;
        }
        case 'fibaro://system': {
            data = await client.getSystemInfo();
            break;
        }
        case 'fibaro://weather': {
            data = await client.getWeather();
            break;
        }
        default:
            throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    }

    return {
        contents: [
            {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(data, null, 2),
            },
        ],
    };
}

export async function handleToolCall(
    client: FibaroClientLike,
    name: string,
    args: any
): Promise<CallToolResult> {
    switch (name) {
        case 'list_devices': {
            let devices = await client.getDevices();

            const normalize = (str: string): string =>
                str
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/ł/g, 'l')
                    .replace(/ø/g, 'o')
                    .replace(/đ/g, 'd')
                    .replace(/ß/g, 'ss')
                    .replace(/æ/g, 'ae')
                    .replace(/œ/g, 'oe')
                    .replace(/þ/g, 'th');

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
                devices = devices.filter((d) => normalize(d.name || '').includes(searchName));
            }
            if (args?.interface) {
                devices = devices.filter(
                    (d) => d.interfaces && d.interfaces.includes(args.interface as string)
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
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }

        case 'get_device': {
            const device = await client.getDevice(args?.device_id as number);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(device, null, 2),
                    },
                ],
            };
        }

        case 'control_device': {
            await client.callAction(
                args?.device_id as number,
                args?.action as string,
                args?.args as any[]
            );
            return {
                content: [
                    {
                        type: 'text',
                        text: `Action ${args?.action} executed on device ${args?.device_id}`,
                    },
                ],
            };
        }

        case 'turn_on': {
            await client.turnOn(args?.device_id as number);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Device ${args?.device_id} turned on`,
                    },
                ],
            };
        }

        case 'turn_off': {
            await client.turnOff(args?.device_id as number);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Device ${args?.device_id} turned off`,
                    },
                ],
            };
        }

        case 'set_brightness': {
            await client.setBrightness(args?.device_id as number, args?.level as number);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Device ${args?.device_id} brightness set to ${args?.level}%`,
                    },
                ],
            };
        }

        case 'set_color': {
            await client.setColor(
                args?.device_id as number,
                args?.r as number,
                args?.g as number,
                args?.b as number,
                args?.w as number | undefined
            );
            return {
                content: [
                    {
                        type: 'text',
                        text: `Device ${args?.device_id} color set to RGB(${args?.r}, ${args?.g}, ${args?.b})`,
                    },
                ],
            };
        }

        case 'set_temperature': {
            await client.setTemperature(args?.device_id as number, args?.temperature as number);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Device ${args?.device_id} temperature set to ${args?.temperature}°C`,
                    },
                ],
            };
        }

        case 'list_rooms': {
            const rooms = await client.getRooms();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(rooms, null, 2),
                    },
                ],
            };
        }

        case 'list_sections': {
            const sections = await client.getSections();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(sections, null, 2),
                    },
                ],
            };
        }

        case 'list_scenes': {
            let scenes = await client.getScenes();

            if (args?.room_id) {
                scenes = scenes.filter((s: any) => s.roomID === args?.room_id);
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(scenes, null, 2),
                    },
                ],
            };
        }

        case 'get_scene': {
            const scene = await client.getScene(args?.scene_id as number);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(scene, null, 2),
                    },
                ],
            };
        }

        case 'run_scene': {
            await client.runScene(args?.scene_id as number);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Scene ${args?.scene_id} started`,
                    },
                ],
            };
        }

        case 'stop_scene': {
            await client.stopScene(args?.scene_id as number);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Scene ${args?.scene_id} stopped`,
                    },
                ],
            };
        }

        case 'list_global_variables': {
            const variables = await client.getGlobalVariables();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(variables, null, 2),
                    },
                ],
            };
        }

        case 'get_global_variable': {
            const variable = await client.getGlobalVariable(args?.name as string);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(variable, null, 2),
                    },
                ],
            };
        }

        case 'set_global_variable': {
            await client.setGlobalVariable(args?.name as string, args?.value as string);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Global variable '${args?.name}' set to '${args?.value}'`,
                    },
                ],
            };
        }

        case 'get_system_info': {
            const info = await client.getSystemInfo();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(info, null, 2),
                    },
                ],
            };
        }

        case 'get_weather': {
            const weather = await client.getWeather();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(weather, null, 2),
                    },
                ],
            };
        }

        case 'get_energy_panel': {
            const energy = await client.getEnergyPanel();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(energy, null, 2),
                    },
                ],
            };
        }

        case 'get_scene_lua': {
            const scene = await client.getScene(args?.scene_id as number);
            return {
                content: [
                    {
                        type: 'text',
                        text: scene.lua
                            ? `Scene ${scene.name} (ID: ${scene.id}) - Lua Code:\n\n${scene.lua}`
                            : `Scene ${scene.name} (ID: ${scene.id}) is not a Lua scene or has no code available.`,
                    },
                ],
            };
        }

        case 'list_quick_apps': {
            const quickApps = await client.getQuickApps();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(quickApps, null, 2),
                    },
                ],
            };
        }

        case 'get_device_lua': {
            const deviceLua = await client.getDeviceLua(args?.device_id as number);
            const codeText = deviceLua.code
                ? `\n\nLua Code:\n${deviceLua.code}`
                : '\n\nNo Lua code found for this device.';
            const varsText =
                deviceLua.quickAppVariables.length > 0
                    ? `\n\nQuick App Variables:\n${JSON.stringify(deviceLua.quickAppVariables, null, 2)}`
                    : '';
            return {
                content: [
                    {
                        type: 'text',
                        text: `Device: ${deviceLua.device.name} (ID: ${deviceLua.device.id})${codeText}${varsText}`,
                    },
                ],
            };
        }

        case 'create_scene': {
            const created = await client.createScene({
                name: args?.name as string,
                roomID: args?.room_id as number,
                lua: args?.lua as string,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Scene "${created.name}" created successfully with ID: ${created.id}`,
                    },
                ],
            };
        }

        case 'update_scene_lua': {
            const updates: any = {};
            if (args?.lua !== undefined) updates.lua = args.lua;
            if (args?.name !== undefined) updates.name = args.name;
            if (args?.room_id !== undefined) updates.roomID = args.room_id;

            const updated = await client.updateScene(args?.scene_id as number, updates);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Scene "${updated.name}" (ID: ${updated.id}) updated successfully`,
                    },
                ],
            };
        }

        case 'delete_scene': {
            await client.deleteScene(args?.scene_id as number);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Scene ${args?.scene_id} deleted successfully`,
                    },
                ],
            };
        }

        case 'create_quick_app': {
            const quickApp = await client.createQuickApp({
                name: args?.name as string,
                type: args?.type as string,
                roomID: args?.room_id as number,
                code: args?.code as string,
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: `Quick App "${quickApp.name}" created successfully with ID: ${quickApp.id}`,
                    },
                ],
            };
        }

        case 'update_quick_app_code': {
            await client.updateQuickAppCode(args?.device_id as number, args?.code as string);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Quick App ${args?.device_id} code updated successfully`,
                    },
                ],
            };
        }

        case 'update_quick_app_variables': {
            await client.updateQuickAppVariables(args?.device_id as number, args?.variables as any[]);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Quick App ${args?.device_id} variables updated successfully`,
                    },
                ],
            };
        }

        case 'delete_device': {
            await client.deleteDevice(args?.device_id as number);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Device ${args?.device_id} deleted successfully`,
                    },
                ],
            };
        }

        case 'create_room': {
            const room = await client.createRoom({
                name: args?.name as string,
                sectionID: args?.section_id as number,
                icon: args?.icon as string,
            });
            return {
                content: [
                    { type: 'text', text: `Room "${room.name}" created with ID: ${room.id}` },
                ],
            };
        }

        case 'update_room': {
            const updates: any = {};
            if (args?.name) updates.name = args.name;
            if (args?.section_id) updates.sectionID = args.section_id;
            if (args?.icon) updates.icon = args.icon;
            const room = await client.updateRoom(args?.room_id as number, updates);
            return {
                content: [
                    { type: 'text', text: `Room "${room.name}" updated successfully` },
                ],
            };
        }

        case 'delete_room': {
            await client.deleteRoom(args?.room_id as number);
            return {
                content: [
                    { type: 'text', text: `Room ${args?.room_id} deleted successfully` },
                ],
            };
        }

        case 'create_section': {
            const section = await client.createSection({
                name: args?.name as string,
                icon: args?.icon as string,
            });
            return {
                content: [
                    { type: 'text', text: `Section "${section.name}" created with ID: ${section.id}` },
                ],
            };
        }

        case 'update_section': {
            const updates: any = {};
            if (args?.name) updates.name = args.name;
            if (args?.icon) updates.icon = args.icon;
            const section = await client.updateSection(args?.section_id as number, updates);
            return {
                content: [
                    { type: 'text', text: `Section "${section.name}" updated successfully` },
                ],
            };
        }

        case 'delete_section': {
            await client.deleteSection(args?.section_id as number);
            return {
                content: [
                    { type: 'text', text: `Section ${args?.section_id} deleted successfully` },
                ],
            };
        }

        case 'list_users': {
            const users = await client.getUsers();
            return {
                content: [
                    { type: 'text', text: JSON.stringify(users, null, 2) },
                ],
            };
        }

        case 'create_user': {
            const user = await client.createUser({
                name: args?.name as string,
                username: args?.username as string,
                password: args?.password as string,
                email: args?.email as string,
                type: args?.type as string,
            });
            return {
                content: [
                    { type: 'text', text: `User "${user.name}" created with ID: ${user.id}` },
                ],
            };
        }

        case 'update_user': {
            const updates: any = {};
            if (args?.name) updates.name = args.name;
            if (args?.email) updates.email = args.email;
            if (args?.password) updates.password = args.password;
            await client.updateUser(args?.user_id as number, updates);
            return {
                content: [
                    { type: 'text', text: `User ${args?.user_id} updated successfully` },
                ],
            };
        }

        case 'delete_user': {
            await client.deleteUser(args?.user_id as number);
            return {
                content: [
                    { type: 'text', text: `User ${args?.user_id} deleted successfully` },
                ],
            };
        }

        case 'list_profiles': {
            const profiles = await client.getProfiles();
            return {
                content: [
                    { type: 'text', text: JSON.stringify(profiles, null, 2) },
                ],
            };
        }

        case 'get_active_profile': {
            const profile = await client.getActiveProfile();
            return {
                content: [
                    { type: 'text', text: JSON.stringify(profile, null, 2) },
                ],
            };
        }

        case 'set_active_profile': {
            await client.setActiveProfile(args?.profile_id as number);
            return {
                content: [
                    { type: 'text', text: `Profile ${args?.profile_id} activated` },
                ],
            };
        }

        case 'list_notifications': {
            const notifications = await client.getNotifications();
            return {
                content: [
                    { type: 'text', text: JSON.stringify(notifications, null, 2) },
                ],
            };
        }

        case 'send_notification': {
            await client.sendNotification({
                type: args?.type as string,
                title: args?.title as string,
                text: args?.text as string,
                users: args?.users as number[],
            });
            return {
                content: [
                    { type: 'text', text: 'Notification sent successfully' },
                ],
            };
        }

        case 'list_alarms': {
            const alarms = await client.getAlarms();
            return {
                content: [
                    { type: 'text', text: JSON.stringify(alarms, null, 2) },
                ],
            };
        }

        case 'arm_alarm': {
            await client.armAlarm(args?.partition_id as number);
            return {
                content: [
                    { type: 'text', text: `Alarm partition ${args?.partition_id} armed` },
                ],
            };
        }

        case 'disarm_alarm': {
            await client.disarmAlarm(args?.partition_id as number);
            return {
                content: [
                    { type: 'text', text: `Alarm partition ${args?.partition_id} disarmed` },
                ],
            };
        }

        case 'get_zwave_network': {
            const network = await client.getZWaveNetwork();
            return {
                content: [
                    { type: 'text', text: JSON.stringify(network, null, 2) },
                ],
            };
        }

        case 'start_zwave_inclusion': {
            await client.startZWaveInclusion();
            return {
                content: [
                    { type: 'text', text: 'Z-Wave inclusion mode started' },
                ],
            };
        }

        case 'stop_zwave_inclusion': {
            await client.stopZWaveInclusion();
            return {
                content: [
                    { type: 'text', text: 'Z-Wave inclusion mode stopped' },
                ],
            };
        }

        case 'start_zwave_exclusion': {
            await client.startZWaveExclusion();
            return {
                content: [
                    { type: 'text', text: 'Z-Wave exclusion mode started' },
                ],
            };
        }

        case 'stop_zwave_exclusion': {
            await client.stopZWaveExclusion();
            return {
                content: [
                    { type: 'text', text: 'Z-Wave exclusion mode stopped' },
                ],
            };
        }

        case 'remove_failed_zwave_node': {
            await client.removeFailedZWaveNode(args?.node_id as number);
            return {
                content: [
                    { type: 'text', text: `Z-Wave node ${args?.node_id} removed` },
                ],
            };
        }

        case 'heal_zwave_network': {
            await client.healZWaveNetwork();
            return {
                content: [
                    { type: 'text', text: 'Z-Wave network healing started' },
                ],
            };
        }

        case 'create_backup': {
            const backup = await client.createBackup();
            return {
                content: [
                    { type: 'text', text: `Backup created: ${JSON.stringify(backup)}` },
                ],
            };
        }

        case 'list_backups': {
            const backups = await client.getBackups();
            return {
                content: [
                    { type: 'text', text: JSON.stringify(backups, null, 2) },
                ],
            };
        }

        case 'restore_backup': {
            await client.restoreBackup(args?.backup_id as string);
            return {
                content: [
                    { type: 'text', text: `Restoring backup ${args?.backup_id}...` },
                ],
            };
        }

        case 'get_settings': {
            const settings = await client.getSettings();
            return {
                content: [
                    { type: 'text', text: JSON.stringify(settings, null, 2) },
                ],
            };
        }

        case 'update_settings': {
            await client.updateSettings(args?.settings as Record<string, any>);
            return {
                content: [
                    { type: 'text', text: 'Settings updated successfully' },
                ],
            };
        }

        case 'restart_system': {
            await client.restartSystem();
            return {
                content: [
                    { type: 'text', text: 'System restart initiated' },
                ],
            };
        }

        case 'get_event_log': {
            const logs = await client.getEventLog({
                from: args?.from as number,
                to: args?.to as number,
                type: args?.type as string,
                limit: args?.limit as number,
            });
            return {
                content: [
                    { type: 'text', text: JSON.stringify(logs, null, 2) },
                ],
            };
        }

        case 'list_geofences': {
            const geofences = await client.getGeofences();
            return {
                content: [
                    { type: 'text', text: JSON.stringify(geofences, null, 2) },
                ],
            };
        }

        case 'create_geofence': {
            const geofence = await client.createGeofence({
                name: args?.name as string,
                latitude: args?.latitude as number,
                longitude: args?.longitude as number,
                radius: args?.radius as number,
            });
            return {
                content: [
                    { type: 'text', text: `Geofence "${geofence.name}" created` },
                ],
            };
        }

        case 'update_geofence': {
            const updates: any = {};
            if (args?.name) updates.name = args.name;
            if (args?.latitude) updates.latitude = args.latitude;
            if (args?.longitude) updates.longitude = args.longitude;
            if (args?.radius) updates.radius = args.radius;
            await client.updateGeofence(args?.geofence_id as number, updates);
            return {
                content: [
                    { type: 'text', text: `Geofence ${args?.geofence_id} updated` },
                ],
            };
        }

        case 'delete_geofence': {
            await client.deleteGeofence(args?.geofence_id as number);
            return {
                content: [
                    { type: 'text', text: `Geofence ${args?.geofence_id} deleted` },
                ],
            };
        }

        case 'list_plugins': {
            const plugins = await client.getPlugins();
            return {
                content: [
                    { type: 'text', text: JSON.stringify(plugins, null, 2) },
                ],
            };
        }

        case 'install_plugin': {
            await client.installPlugin(args?.url as string);
            return {
                content: [
                    { type: 'text', text: `Plugin installation from ${args?.url} started` },
                ],
            };
        }

        case 'uninstall_plugin': {
            await client.uninstallPlugin(args?.plugin_id as string);
            return {
                content: [
                    { type: 'text', text: `Plugin ${args?.plugin_id} uninstalled` },
                ],
            };
        }

        case 'restart_plugin': {
            await client.restartPlugin(args?.plugin_id as string);
            return {
                content: [
                    { type: 'text', text: `Plugin ${args?.plugin_id} restarted` },
                ],
            };
        }

        case 'trigger_custom_event': {
            await client.triggerCustomEvent(args?.event_name as string, args?.data);
            return {
                content: [
                    { type: 'text', text: `Custom event "${args?.event_name}" triggered` },
                ],
            };
        }

        case 'list_climate_zones': {
            const zones = await client.getClimateZones();
            return {
                content: [
                    { type: 'text', text: JSON.stringify(zones, null, 2) },
                ],
            };
        }

        case 'set_climate_mode': {
            await client.setClimateMode(args?.zone_id as number, args?.mode as string);
            return {
                content: [
                    { type: 'text', text: `Climate zone ${args?.zone_id} set to ${args?.mode}` },
                ],
            };
        }

        case 'get_device_stats': {
            const stats = await client.getDeviceStats(args?.device_id as number, {
                from: args?.from as number,
                to: args?.to as number,
                property: args?.property as string,
            });
            return {
                content: [
                    { type: 'text', text: JSON.stringify(stats, null, 2) },
                ],
            };
        }

        case 'create_global_variable': {
            const variable = await client.createGlobalVariable({
                name: args?.name as string,
                value: args?.value as string,
                isEnum: args?.is_enum as boolean,
                enumValues: args?.enum_values as string[],
            });
            return {
                content: [
                    { type: 'text', text: `Global variable "${variable.name}" created` },
                ],
            };
        }

        case 'delete_global_variable': {
            await client.deleteGlobalVariable(args?.name as string);
            return {
                content: [
                    { type: 'text', text: `Global variable "${args?.name}" deleted` },
                ],
            };
        }

        case 'find_by_name': {
            const query = (args?.query as string) || '';
            const kind = (args?.kind as string) || 'all';
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
                        type: 'text',
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
                            2
                        ),
                    },
                ],
            };
        }

        case 'resolve_by_name': {
            const query = (args?.query as string) || '';
            const kind = (args?.kind as string) || 'devices';
            const exact = Boolean(args?.exact);
            const limit = Math.max(1, Math.min(200, Number(args?.limit || 20)));

            const allowMultiple =
                typeof args?.allow_multiple === 'boolean'
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
                if (kind === 'devices') {
                    if (deviceResults.length === 0) {
                        throw new McpError(ErrorCode.InvalidRequest, `No devices matched query: ${query}`);
                    }
                    if (deviceResults.length > 1) {
                        throw new McpError(
                            ErrorCode.InvalidRequest,
                            `Ambiguous device query: ${query} (matched ${deviceResults.length}). Use a more specific name, set exact=true, or allow_multiple=true.`
                        );
                    }
                } else if (kind === 'rooms') {
                    if (roomResults.length === 0) {
                        throw new McpError(ErrorCode.InvalidRequest, `No rooms matched query: ${query}`);
                    }
                    if (roomResults.length > 1) {
                        throw new McpError(
                            ErrorCode.InvalidRequest,
                            `Ambiguous room query: ${query} (matched ${roomResults.length}). Use a more specific name, set exact=true, or allow_multiple=true.`
                        );
                    }
                } else {
                    const total = roomResults.length + deviceResults.length;
                    if (total === 0) {
                        throw new McpError(ErrorCode.InvalidRequest, `No rooms or devices matched query: ${query}`);
                    }
                    if (total > 1) {
                        throw new McpError(
                            ErrorCode.InvalidRequest,
                            `Ambiguous query: ${query} (matched ${total}). Set kind to rooms/devices, make query more specific, or allow_multiple=true.`
                        );
                    }
                }
            }

            return {
                content: [
                    {
                        type: 'text',
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
                            2
                        ),
                    },
                ],
            };
        }

        default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
}
