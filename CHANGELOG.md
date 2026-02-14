# Changelog

All notable changes to the Fibaro MCP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-02-14

###  MAJOR RELEASE - Advanced Automation & Analytics

**Version 3.0 brings powerful new capabilities for automation, analytics, and external integrations!**

### Added - 10 New Tools

**Total: 80+ Tools** with comprehensive automation and analytics capabilities.

####  Scene Templates (`fibaro_template`)
- JSON-based reusable scene templates
- Parameter substitution with `{{placeholder}}` syntax
- Built-in templates for lighting, security, energy
- Custom template creation and management

####  Device History (`fibaro_history`)
- Query historical device states from event log
- Time-based aggregation (5m, 15m, 1h, 6h, 1d, 1w)
- Statistics: min, max, average, count
- Export to JSON or CSV

####  Scene History (`fibaro_scene_history`)
- Scene execution tracking
- Performance metrics and duration analysis
- Success/failure rate monitoring

####  Enhanced Backup (`fibaro_backup`)
- Comprehensive system export (JSON/YAML)
- Selective backup (devices, scenes, rooms, etc.)
- Import with validation and dry-run mode
- Password exclusion for security

####  Lua REPL (`fibaro_repl`)
- Interactive Lua code execution
- Temporary scene-based sandboxing
- Session management with auto-cleanup
- Multi-session support

####  Bulk Operations (`fibaro_bulk`)
- Query-based device selection
- Bulk actions: device_action, set_property, enable, disable
- Parallel execution with concurrency control
- Dry-run mode for previews

####  Analytics Engine (`fibaro_analytics`)
- Device usage patterns and statistics
- Energy consumption trends by room/device
- Scene frequency and success rates
- System health score (0-100)
- Hourly activity distribution
- Comprehensive analytics dashboard

####  Energy History Graph (`fibaro_energy_graph`)
- Historical power/energy data from native HC2 summary-graph API
- Works for both devices and rooms
- Supports power and energy properties
- Time-series data with HC2-native aggregation

####  External Integrations (`fibaro_integration`)
- **Webhook Server**: HTTP endpoints for external services
  - Scene triggers, device control, variable updates
  - Bearer token authentication
- **MQTT Bridge**: Connect to MQTT brokers
  - Auto-publish device states
  - Subscribe to control topics
  - Home Assistant compatible

####  Automation Builder (`fibaro_automation`)
- Visual automation creation with JSON
- Multi-condition triggers (AND/OR logic)
- Condition types: device_state, variable, time, sun_position
- Action types: device_action, scene, delay, variable_set, notification
- Generates valid Fibaro Lua code using proper API calls
- Validation before deployment

### New Resources
- `fibaro://analytics/dashboard` - Analytics dashboard overview

### Fixed
- Logger now uses stderr to prevent MCP protocol pollution
- TypeScript build errors with optional dependencies

### Documentation
- [TEMPLATES.md](TEMPLATES.md) - Scene templates guide
- [ANALYTICS.md](ANALYTICS.md) - Analytics and insights
- [INTEGRATIONS.md](INTEGRATIONS.md) - Webhooks and MQTT setup
- [AUTOMATION.md](AUTOMATION.md) - Automation builder guide
- [MIGRATION_V3.md](MIGRATION_V3.md) - Migration from v2
- [CLAUDE.md](CLAUDE.md) - AI assistant usage guidelines

### Technical
- 369 unit tests (114 new tests)
- 90%+ code coverage
- Optional peer dependencies: express, mqtt, js-yaml
- Fully backward compatible with v2

---

## [2.0.0] - 2025-11-21

###  MAJOR RELEASE - Comprehensive Fibaro Management

**THIS IS A REVOLUTIONARY RELEASE!** Now you can manage literally EVERYTHING that Fibaro offers!

### Added - 40+ New Management Tools!

**70+ Total Tools** (up from 27)
**~95% API Coverage** (up from ~50%)
**Full CRUD Operations** for all major entities

####  Room & Section Management (6 tools)
- Full CRUD for rooms and sections
- Organizational hierarchy management

####  User Management (4 tools)
- Complete user lifecycle: create, update, delete
- Permission management

####  Profile & Mode Management (3 tools)
- Home modes (Home, Away, Vacation, etc.)
- Profile switching

####  Notifications (2 tools)
- Custom notifications to users
- Push notification support

####  Alarm Management (3 tools)
- Arm/disarm alarm partitions
- Full alarm system control

####  Z-Wave Network Management (7 tools)
- Device inclusion/exclusion
- Network healing and optimization
- Failed node removal
- Network topology viewing

####  Backup & Restore (3 tools)
- System backups
- Disaster recovery

####  System Management (4 tools)
- System settings
- System restart
- Configuration management

####  Geofencing (4 tools)
- Location-based automation
- Geofence CRUD operations

####  Plugin Management (4 tools)
- Install, uninstall, restart plugins
- Plugin lifecycle management

####  Climate Zones (2 tools)
- Heating zone management
- Mode switching

#### Additional Features
- Custom event triggers
- Device statistics and history
- Event logs with filtering
- Enhanced global variables with enum support

### Changed
- Upgraded comprehensive API client
- Enhanced error handling
- Improved type safety
- Better documentation

### Technical
- 314 lines of FibaroClient methods
- 70+ MCP tools
- Comprehensive TypeScript types
- Full CRUD operations across all entities

## [1.0.0] - 2025-11-21

### Added
- Initial release of Fibaro MCP server
- Full Model Context Protocol (MCP) implementation
- Comprehensive Fibaro Home Center API client
- Device management tools:
  - `list_devices` - List all devices with optional filtering
  - `get_device` - Get detailed device information
  - `control_device` - Execute any device action
  - `turn_on` / `turn_off` - Simple on/off control
  - `set_brightness` - Control dimmable lights
  - `set_color` - RGB/RGBW light control
  - `set_temperature` - Thermostat control
- Scene management tools:
  - `list_scenes` - List all scenes
  - `get_scene` - Get scene details
  - `run_scene` / `stop_scene` - Execute and control scenes
- Room and organization tools:
  - `list_rooms` - List all rooms
  - `list_sections` - List all sections
- Global variable tools:
  - `list_global_variables` - List all variables
  - `get_global_variable` / `set_global_variable` - Variable management
- System information tools:
  - `get_system_info` - System information
  - `get_weather` - Weather data
  - `get_energy_panel` - Energy monitoring
- MCP resources:
  - `fibaro://devices` - Live device states
  - `fibaro://rooms` - Room configuration
  - `fibaro://scenes` - Scene definitions
  - `fibaro://system` - System status
  - `fibaro://weather` - Weather information
- Comprehensive documentation:
  - README.md with full feature documentation
  - QUICKSTART.md for easy setup
  - EXAMPLES.md with usage examples
  - CONTRIBUTING.md for developers
- TypeScript support with full type definitions
- Self-signed certificate support for Fibaro installations
- Environment variable configuration
- Claude Desktop integration support

### Security
- HTTP Basic Authentication support
- Automatic handling of self-signed certificates
- Credential management via environment variables

## [1.1.0] - 2025-11-21

### Added
- **Full Lua script management** (create, read, update, delete):
  - `get_scene_lua` - Retrieve Lua code from scenes
  - `create_scene` - Create new Lua scenes with code
  - `update_scene_lua` - Modify scene Lua code, name, or room
  - `delete_scene` - Remove scenes
  - `list_quick_apps` - List all Quick Apps (Lua applications)
  - `get_device_lua` - Get Lua code and variables from devices/Quick Apps
  - `create_quick_app` - Create new Quick Apps with Lua code
  - `update_quick_app_code` - Modify Quick App Lua code
  - `update_quick_app_variables` - Update Quick App variables
  - `delete_device` - Remove devices including Quick Apps
- Enhanced Scene interface to include `lua` and `actions` fields
- Quick App detection and filtering
- Complete CRUD operations for Lua-based automation

## [Unreleased]

### Planned Features
- Door lock control enhancements
- Blinds/roller shutter scheduling
- Push notification integration
- Voice assistant integration
- Mobile app companion

---

For more details about upcoming features and contributions, see [CONTRIBUTING.md](CONTRIBUTING.md).

