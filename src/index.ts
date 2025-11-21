#!/usr/bin/env node

/**
 * Fibaro MCP Server - Model Context Protocol Server for Fibaro Home Center
 * 
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { FibaroClient, FibaroConfig } from './fibaro-client.js';
import { z } from 'zod';

// Configuration schema
const ConfigSchema = z.object({
  host: z.string(),
  username: z.string(),
  password: z.string(),
  port: z.number().optional(),
  https: z.boolean().optional(),
});

class FibaroMCPServer {
  private server: Server;
  private fibaroClient: FibaroClient | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'fibaro-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private getClient(): FibaroClient {
    if (!this.fibaroClient) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Fibaro client not initialized. Please set FIBARO_HOST, FIBARO_USERNAME, and FIBARO_PASSWORD environment variables.'
      );
    }
    return this.fibaroClient;
  }

  private initializeClient() {
    const config: FibaroConfig = {
      host: process.env.FIBARO_HOST || '',
      username: process.env.FIBARO_USERNAME || '',
      password: process.env.FIBARO_PASSWORD || '',
      port: process.env.FIBARO_PORT ? parseInt(process.env.FIBARO_PORT) : undefined,
      https: process.env.FIBARO_HTTPS !== 'false',
    };

    try {
      ConfigSchema.parse(config);
      this.fibaroClient = new FibaroClient(config);
    } catch (error) {
      console.error('Failed to initialize Fibaro client:', error);
      throw new Error(
        'Missing required environment variables: FIBARO_HOST, FIBARO_USERNAME, FIBARO_PASSWORD'
      );
    }
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
              type: {
                type: 'string',
                description: 'Optional: Filter devices by type (e.g., com.fibaro.binarySwitch)',
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
          description: 'Set the brightness level of a dimmable light',
          inputSchema: {
            type: 'object',
            properties: {
              device_id: {
                type: 'number',
                description: 'The ID of the light device',
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
          description: 'Set the color of an RGB light',
          inputSchema: {
            type: 'object',
            properties: {
              device_id: {
                type: 'number',
                description: 'The ID of the RGB light device',
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
        // Room Management
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
        // Section Management
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
        // User Management
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
        // Profiles
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
        // Notifications
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
        // Alarms
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
        // Z-Wave Management
        {
          name: 'get_zwave_network',
          description: 'Get Z-Wave network information',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'start_zwave_inclusion',
          description: 'Start Z-Wave device inclusion mode',
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
          description: 'Start Z-Wave device exclusion mode',
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
          description: 'Heal/optimize the Z-Wave network',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        // Backup & Restore
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
          description: 'List available backups',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'restore_backup',
          description: 'Restore from a backup',
          inputSchema: {
            type: 'object',
            properties: {
              backup_id: { type: 'string' },
            },
            required: ['backup_id'],
          },
        },
        // System Management
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
        // Event Logs
        {
          name: 'get_event_log',
          description: 'Get system event logs',
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
        // Geofencing
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
          description: 'Update a geofence',
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
        // Plugins
        {
          name: 'list_plugins',
          description: 'List all installed plugins',
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
          description: 'Uninstall a plugin',
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
          description: 'Restart a plugin',
          inputSchema: {
            type: 'object',
            properties: {
              plugin_id: { type: 'string' },
            },
            required: ['plugin_id'],
          },
        },
        // Custom Events
        {
          name: 'trigger_custom_event',
          description: 'Trigger a custom event in the system',
          inputSchema: {
            type: 'object',
            properties: {
              event_name: { type: 'string' },
              data: { type: 'object' },
            },
            required: ['event_name'],
          },
        },
        // Climate Zones
        {
          name: 'list_climate_zones',
          description: 'List all climate/heating zones',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'set_climate_mode',
          description: 'Set climate zone mode',
          inputSchema: {
            type: 'object',
            properties: {
              zone_id: { type: 'number' },
              mode: { type: 'string' },
            },
            required: ['zone_id', 'mode'],
          },
        },
        // Device Statistics
        {
          name: 'get_device_stats',
          description: 'Get device statistics and history',
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
        // Global Variables Extended
        {
          name: 'create_global_variable',
          description: 'Create a new global variable',
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
      ],
    }));

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'fibaro://devices',
          mimeType: 'application/json',
          name: 'All Devices',
          description: 'Current state of all devices in the Fibaro system',
        },
        {
          uri: 'fibaro://rooms',
          mimeType: 'application/json',
          name: 'All Rooms',
          description: 'List of all rooms in the Fibaro system',
        },
        {
          uri: 'fibaro://scenes',
          mimeType: 'application/json',
          name: 'All Scenes',
          description: 'List of all scenes in the Fibaro system',
        },
        {
          uri: 'fibaro://system',
          mimeType: 'application/json',
          name: 'System Information',
          description: 'Fibaro Home Center system information',
        },
        {
          uri: 'fibaro://weather',
          mimeType: 'application/json',
          name: 'Weather',
          description: 'Current weather information',
        },
      ],
    }));

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const client = this.getClient();
      const uri = request.params.uri;

      try {
        let data: any;

        switch (uri) {
          case 'fibaro://devices': {
            const devices = await client.getDevices();
            data = devices;
            break;
          }
          case 'fibaro://rooms': {
            const rooms = await client.getRooms();
            data = rooms;
            break;
          }
          case 'fibaro://scenes': {
            const scenes = await client.getScenes();
            data = scenes;
            break;
          }
          case 'fibaro://system': {
            const info = await client.getSystemInfo();
            data = info;
            break;
          }
          case 'fibaro://weather': {
            const weather = await client.getWeather();
            data = weather;
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
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read resource: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const client = this.getClient();
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_devices': {
            let devices = await client.getDevices();

            if (args?.room_id) {
              devices = devices.filter((d) => d.roomID === args.room_id);
            }
            if (args?.type) {
              devices = devices.filter((d) => d.type === args.type);
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(devices, null, 2),
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
                  text: `Action '${args?.action}' executed successfully on device ${args?.device_id}`,
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
              scenes = scenes.filter((s) => s.roomID === args?.room_id);
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
            const scene = await client.createScene({
              name: args?.name as string,
              roomID: args?.room_id as number,
              lua: args?.lua as string,
            });
            return {
              content: [
                {
                  type: 'text',
                  text: `Scene "${scene.name}" created successfully with ID: ${scene.id}`,
                },
              ],
            };
          }

          case 'update_scene_lua': {
            const updates: any = {};
            if (args?.lua !== undefined) updates.lua = args.lua;
            if (args?.name !== undefined) updates.name = args.name;
            if (args?.room_id !== undefined) updates.roomID = args.room_id;

            const scene = await client.updateScene(args?.scene_id as number, updates);
            return {
              content: [
                {
                  type: 'text',
                  text: `Scene "${scene.name}" (ID: ${scene.id}) updated successfully`,
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
            await client.updateQuickAppVariables(
              args?.device_id as number,
              args?.variables as any[]
            );
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

          // Room Management
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

          // Section Management
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

          // User Management
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

          // Profiles
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

          // Notifications
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

          // Alarms
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

          // Z-Wave Management
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

          // Backup & Restore
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

          // System Management
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

          // Event Logs
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

          // Geofencing
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

          // Plugins
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

          // Custom Events
          case 'trigger_custom_event': {
            await client.triggerCustomEvent(args?.event_name as string, args?.data);
            return {
              content: [
                { type: 'text', text: `Custom event "${args?.event_name}" triggered` },
              ],
            };
          }

          // Climate Zones
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

          // Device Statistics
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

          // Global Variables Extended
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

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) throw error;
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async run() {
    this.initializeClient();
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Fibaro MCP Server running on stdio');
  }
}

const server = new FibaroMCPServer();
server.run().catch(console.error);

