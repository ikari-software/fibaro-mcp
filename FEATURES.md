# Fibaro MCP - Complete Feature List

**Version 3.0.0** - Advanced Automation, Analytics & Integrations

This document provides a complete overview of all available features and tools in the Fibaro MCP server.

##  Quick Stats

- **Total Tools:** 80+
- **API Coverage:** ~95% of Fibaro Home Center API
- **Management Areas:** 15+ major categories
- **Full CRUD Operations:** Devices, Scenes, Rooms, Sections, Users, Geofences, and more
- **v3 Additions:** 10 new tools for automation, analytics, integrations, and more

---

##  Device Management (12 tools)

### Basic Device Control
- `list_devices` - List all devices with filtering options
- `get_device` - Get detailed device information
- `control_device` - Execute any action on a device
- `turn_on` / `turn_off` - Simple on/off control
- `delete_device` - Remove devices

### Specialized Device Control
- `set_brightness` - Control dimmable lights (0-100%)
- `set_color` - RGB/RGBW light control
- `set_temperature` - Thermostat temperature control
- `get_device_stats` - Historical statistics and data

### Device Configuration
- Device property management
- Action execution
- Real-time state monitoring

---

##  Scene Management (8 tools)

### Scene Operations
- `list_scenes` - List all scenes with filtering
- `get_scene` - Get scene details
- `run_scene` / `stop_scene` - Execute and control scenes

### Lua Scene Management
- `get_scene_lua` - Read Lua script code
- `create_scene` - Create new Lua scenes
- `update_scene_lua` - Modify scene code and properties
- `delete_scene` - Remove scenes

**Full scene lifecycle management with Lua code editing!**

---

##  Quick App Management (5 tools)

- `list_quick_apps` - List all Quick Apps
- `get_device_lua` - Read Quick App code and variables
- `create_quick_app` - Create new Quick Apps
- `update_quick_app_code` - Modify Quick App Lua code
- `update_quick_app_variables` - Manage configuration variables

**Complete Quick App development and management!**

---

##  Room & Section Management (6 tools)

### Rooms
- `list_rooms` - List all rooms
- `create_room` - Create new rooms
- `update_room` - Modify room properties
- `delete_room` - Remove rooms

### Sections
- `list_sections` - List all sections
- `create_section` - Create new sections
- `update_section` - Modify section properties
- `delete_section` - Remove sections

**Full organizational hierarchy management!**

---

##  User Management (4 tools)

- `list_users` - List all system users
- `create_user` - Create new users
- `update_user` - Modify user properties (name, email, password)
- `delete_user` - Remove users

**Complete user lifecycle management!**

---

##  Global Variables (4 tools)

- `list_global_variables` - List all variables
- `get_global_variable` - Get variable value
- `set_global_variable` - Set variable value
- `create_global_variable` - Create new variables (with enum support)
- `delete_global_variable` - Remove variables

**Full variable management with enum support!**

---

## 🏡 Profile & Mode Management (3 tools)

- `list_profiles` - List all home profiles/modes
- `get_active_profile` - Get current active profile
- `set_active_profile` - Change home mode (Home, Away, Vacation, etc.)

**Home automation mode switching!**

---

##  Notifications (3 tools)

- `list_notifications` - View all notifications
- `send_notification` - Send custom notifications to users
- Push notification support

**Custom notification system!**

---

##  Alarm Management (3 tools)

- `list_alarms` - List all alarm partitions
- `arm_alarm` - Arm alarm partition
- `disarm_alarm` - Disarm alarm partition

**Full alarm system control!**

---

##  Climate & Heating (3 tools)

- `list_climate_zones` - List all heating zones
- `set_climate_mode` - Set zone mode (heating, cooling, eco, etc.)
- `set_temperature` - Direct thermostat control

**Complete climate management!**

---

##  Z-Wave Network Management (7 tools)

- `get_zwave_network` - View network topology and status
- `start_zwave_inclusion` / `stop_zwave_inclusion` - Add devices
- `start_zwave_exclusion` / `stop_zwave_exclusion` - Remove devices
- `remove_failed_zwave_node` - Clean up failed nodes
- `heal_zwave_network` - Optimize network

**Professional Z-Wave network maintenance!**

---

##  Backup & Restore (3 tools)

- `create_backup` - Create system backup
- `list_backups` - List available backups
- `restore_backup` - Restore from backup

**System backup and disaster recovery!**

---

##  System Management (4 tools)

- `get_system_info` - System information
- `get_settings` - View system settings
- `update_settings` - Modify system configuration
- `restart_system` - Reboot Fibaro Home Center

**System-level administration!**

---

##  Event Logs & History (2 tools)

- `get_event_log` - View system event logs with filtering
- Device statistics and historical data
- Audit trail access

**Complete system monitoring!**

---

##  Geofencing (4 tools)

- `list_geofences` - List all geofences
- `create_geofence` - Create location-based zones
- `update_geofence` - Modify geofence properties
- `delete_geofence` - Remove geofences

**Location-based automation!**

---

##  Plugin Management (4 tools)

- `list_plugins` - List installed plugins
- `install_plugin` - Install new plugins from URL
- `uninstall_plugin` - Remove plugins
- `restart_plugin` - Restart plugin services

**Plugin lifecycle management!**

---

##  Custom Events (1 tool)

- `trigger_custom_event` - Fire custom events in the system

**Integration and automation triggers!**

---

##  Weather & Energy (2 tools)

- `get_weather` - Current weather data
- `get_energy_panel` - Energy consumption monitoring

**Environmental monitoring!**

---

##  MCP Resources (5 resources)

Real-time data access:
- `fibaro://devices` - Live device states
- `fibaro://rooms` - Room configuration
- `fibaro://scenes` - Scene definitions
- `fibaro://system` - System status
- `fibaro://weather` - Weather data

---

---

##  v3 Features

###  Scene Templates (`fibaro_template`)
- JSON-based reusable scene templates with `{{placeholder}}` substitution
- Built-in templates for lighting, security, energy management
- Custom template creation and management
- Operations: `list`, `get`, `instantiate`, `create`, `delete`
- See [TEMPLATES.md](TEMPLATES.md)

###  Device History (`fibaro_history`)
- Query historical device states from event log
- Time-based aggregation (5m, 15m, 1h, 6h, 1d, 1w)
- Statistics: min, max, average, count
- Export to JSON or CSV
- Operations: `query`, `stats`, `aggregate`, `export`

###  Scene History (`fibaro_scene_history`)
- Scene execution tracking and performance metrics
- Success/failure rate monitoring, duration analysis
- Operations: `query`, `stats`, `performance`, `export`

###  Enhanced Backup (`fibaro_backup`)
- Comprehensive system export to JSON or YAML
- Selective backup by type (devices, scenes, rooms, sections, variables, users)
- Import with validation and dry-run mode
- Password exclusion for security
- Operations: `export`, `validate`, `import`

###  Lua REPL (`fibaro_repl`)
- Interactive Lua code execution on the Fibaro controller
- Temporary scene-based sandboxing with auto-cleanup
- Multi-session support
- Operations: `execute`, `list_sessions`, `clear_session`, `clear_all`, `sync`

###  Bulk Operations (`fibaro_bulk`)
- Query-based device selection (by room, type, interface, name pattern, properties)
- Bulk actions: device_action, set_property, enable, disable
- Parallel execution with concurrency control
- Dry-run mode for previews
- Operations: `execute`, `preview`

###  Analytics Engine (`fibaro_analytics`)
- Device usage patterns and statistics
- Energy consumption trends by room and device type
- Scene frequency and success rates
- System health score (0-100)
- Hourly activity distribution, room activity summaries
- Comprehensive analytics dashboard
- Operations: `dashboard`, `device_usage`, `energy_trends`, `scene_frequency`, `system_health`, `hourly_distribution`, `room_activity`
- See [ANALYTICS.md](ANALYTICS.md)

###  Energy History Graph (`fibaro_energy_graph`)
- Historical power/energy data from native HC2 summary-graph API
- Works for both devices and rooms
- Supports power and energy properties

###  External Integrations (`fibaro_integration`)
- **Webhook Server**: Configurable HTTP endpoints with Bearer token auth
- **MQTT Bridge**: Connect to MQTT brokers, auto-publish device states
- Requires optional dependencies (`express`, `mqtt`)
- Operations: `webhook_start`, `webhook_stop`, `webhook_status`, `mqtt_connect`, `mqtt_disconnect`, `mqtt_status`, `mqtt_publish`
- See [INTEGRATIONS.md](INTEGRATIONS.md)

###  Automation Builder (`fibaro_automation`)
- Visual automation creation with JSON definitions
- Multi-condition triggers (AND/OR logic, nested groups)
- Condition types: device_state, variable, time, sun_position, custom Lua
- Action types: device_action, scene, delay, variable_set, notification, custom Lua
- Generates valid Fibaro Lua code using proper API calls
- Validation before deployment
- Operations: `validate`, `generate_lua`, `create`
- See [AUTOMATION.md](AUTOMATION.md)

All v3 tools use the `op` parameter: `fibaro_analytics op=dashboard`

---

##  Management Categories

###  Full CRUD Operations
- **Devices** - Create (Quick Apps), Read, Update, Delete
- **Scenes** - Create, Read, Update, Delete (with Lua code)
- **Rooms** - Create, Read, Update, Delete
- **Sections** - Create, Read, Update, Delete
- **Users** - Create, Read, Update, Delete
- **Global Variables** - Create, Read, Update, Delete
- **Geofences** - Create, Read, Update, Delete
- **Quick Apps** - Create, Read, Update, Delete

###  Advanced Management
- Z-Wave network topology and maintenance
- System backups and restoration
- Plugin installation and management
- Alarm system control
- Climate zone management
- Event logging and auditing
- Notification delivery
- Profile/mode switching

###  Lua Script Management
- Scene Lua code editing
- Quick App development
- Custom automation logic
- Variable management

---

##  What You Can Do

### With Natural Language (via Claude):

**Device Management:**
- "Turn on all lights in the living room"
- "Set bedroom temperature to 22 degrees"
- "Show me all devices that are currently on"
- "Dim the kitchen lights to 30%"

**Organization:**
- "Create a new room called 'Home Office' in the ground floor section"
- "Move device 45 to the bedroom"
- "Reorganize my sections"

**Scene Development:**
- "Create a scene that turns off all lights at midnight"
- "Show me the Lua code for the Good Night scene"
- "Update the morning routine scene to also open blinds"

**Quick App Development:**
- "Create a weather monitoring Quick App"
- "Modify my temperature sensor Quick App to check every 5 minutes"
- "Show me all Quick Apps and their variables"

**System Administration:**
- "Create a backup of my system"
- "List all users and their permissions"
- "Add a new user for my family member"
- "Change home mode to Away"

**Z-Wave Management:**
- "Start pairing a new Z-Wave device"
- "Remove failed node 15 from the network"
- "Heal the Z-Wave network"
- "Show me the network topology"

**Advanced Automation:**
- "Set up a geofence around my house"
- "Send a notification to all users when motion is detected"
- "Create a climate schedule for winter mode"
- "View energy consumption for the last week"

---

##  Use Cases

### Home Automation
- Complete smart home control
- Scene-based automation
- Schedule management
- Energy optimization

### Development
- Lua scene development
- Quick App creation
- Custom automation logic
- API integrations

### System Administration
- User management
- Backup/restore
- System monitoring
- Network maintenance

### Integration
- Custom event triggers
- Notification systems
- Third-party integrations
- Webhook support

---

##  Security Features

- User authentication and authorization
- Secure credential management
- HTTPS support with self-signed certificates
- User permission management
- Audit logging
- Backup/restore capabilities

---

##  Platform Support

- **Fibaro Home Center 2 (HC2)**
- **Fibaro Home Center 3 (HC3)**
- **Fibaro Home Center Lite (HCL)**

---

##  Technical Capabilities

### API Coverage
-  Device API (100%)
-  Scene API (100%)
-  Room/Section API (100%)
-  User API (100%)
-  Global Variables (100%)
-  Quick Apps (100%)
-  Z-Wave Management (95%)
-  Alarms (90%)
-  System Management (95%)
-  Backup/Restore (100%)
-  Notifications (90%)
-  Geofencing (100%)
-  Plugins (100%)

### Protocol Support
- Z-Wave
- Z-Wave Plus
- HTTP/HTTPS
- WebSockets (planned)

### Programming Support
- Full Lua script editing
- Quick App development
- Custom event handling
- API integrations

---

##  Version 2.0.0 Highlights

**NEW in 2.0:**
-  Complete room and section management
-  Full user lifecycle management
-  Home profile/mode switching
-  Alarm system control
-  Z-Wave network management
-  Backup and restore
-  Geofencing
-  Plugin management
-  Climate zones
-  Event logs and statistics
-  Custom notifications
-  System settings management

**Total: 40+ NEW tools added!**

---

## 📚 Documentation

- [README.md](README.md) - Getting started and overview
- [QUICKSTART.md](QUICKSTART.md) - 5-minute setup guide
- [EXAMPLES.md](EXAMPLES.md) - Usage examples
- [LUA_MANAGEMENT.md](LUA_MANAGEMENT.md) - Lua scripting guide
- [TEMPLATES.md](TEMPLATES.md) - Scene templates guide
- [ANALYTICS.md](ANALYTICS.md) - Analytics and insights
- [INTEGRATIONS.md](INTEGRATIONS.md) - Webhooks and MQTT
- [AUTOMATION.md](AUTOMATION.md) - Automation builder
- [CONTRIBUTING.md](CONTRIBUTING.md) - Developer guide
- [CHANGELOG.md](CHANGELOG.md) - Version history

---

##  Learning Resources

### For Users
- Natural language control examples
- Scene automation patterns
- Energy optimization tips
- Security best practices

### For Developers
- Lua scripting tutorials
- Quick App development
- API integration guides
- Custom event handling

### For Administrators
- User management workflows
- Backup strategies
- Network maintenance
- System monitoring

---

##  Future Enhancements

Potential future features:
- WebSocket real-time updates
- Integration lifecycle management (persistent webhook/MQTT instances)
- Advanced scheduling with cron expressions
- Voice assistant integration

---

##  Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Adding new tools
- Improving documentation
- Bug fixes
- Feature requests

---

##  Support

For issues, questions, or feature requests:
1. Check the documentation
2. Review examples
3. Open a GitHub issue
4. Join the community discussions

---

**Fibaro MCP v3.0.0** - Your complete Fibaro Home Automation management solution!

