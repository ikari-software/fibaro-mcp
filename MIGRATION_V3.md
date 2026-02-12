# Migration Guide: v2 to v3

This guide helps you upgrade from Fibaro MCP v2.x to v3.0. Version 3 is **fully backward compatible** - all existing tools and workflows continue to work unchanged.

## What's New in v3

### New Tools

| Tool | Description |
|------|-------------|
| `fibaro_template` | Scene templates with parameter substitution |
| `fibaro_history` | Device state history from event log |
| `fibaro_scene_history` | Scene execution history and performance |
| `fibaro_backup` | Enhanced system backup and restore |
| `fibaro_repl` | Interactive Lua REPL/sandbox |
| `fibaro_bulk` | Bulk device operations |
| `fibaro_analytics` | Usage analytics and insights |
| `fibaro_integration` | Webhooks and MQTT bridge |
| `fibaro_automation` | Advanced automation builder |

### New Resources

| Resource | Description |
|----------|-------------|
| `fibaro://analytics/dashboard` | Analytics dashboard overview |

### Optional Dependencies

Some v3 features require optional packages:

```bash
# For YAML export format
npm install js-yaml

# For webhook server
npm install express

# For MQTT bridge
npm install mqtt
```

These are **optional** - features gracefully degrade if not installed.

## Upgrade Steps

### 1. Update the Package

```bash
npm update fibaro-mcp
# or
npm install fibaro-mcp@3
```

### 2. Verify Installation

```bash
npm run build
npm test
```

### 3. Test Existing Workflows

All v2 tools work identically in v3:

```
# These all work unchanged
fibaro_device operation=list
fibaro_scene operation=get id=5
fibaro_room operation=list
fibaro_variable operation=get name=HomeMode
```

### 4. Explore New Features

Try the new analytics dashboard:
```
fibaro_analytics operation=dashboard
```

Or list available scene templates:
```
fibaro_template list
```

## Breaking Changes

**None.** Version 3 is fully backward compatible.

All existing:
- Tool names and parameters
- Resource URIs
- API responses
- Error formats

...remain unchanged.

## Deprecations

No features are deprecated in v3. All v2 functionality is preserved.

## New Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FIBARO_LOG_LEVEL` | Log verbosity (ERROR, WARN, INFO, DEBUG) | INFO |

## Configuration Changes

### Claude Desktop

No changes required to your `claude_desktop_config.json`. The same configuration works for v3:

```json
{
  "mcpServers": {
    "fibaro": {
      "command": "node",
      "args": ["/path/to/fibaro-mcp/dist/index.js"],
      "env": {
        "FIBARO_URL": "http://192.168.1.100/api",
        "FIBARO_USERNAME": "admin",
        "FIBARO_PASSWORD": "your-password"
      }
    }
  }
}
```

### Optional Features

To enable optional features, install the dependencies:

```json
{
  "mcpServers": {
    "fibaro": {
      "command": "node",
      "args": ["/path/to/fibaro-mcp/dist/index.js"],
      "env": {
        "FIBARO_URL": "http://192.168.1.100/api",
        "FIBARO_USERNAME": "admin",
        "FIBARO_PASSWORD": "your-password",
        "FIBARO_LOG_LEVEL": "INFO"
      }
    }
  }
}
```

## Feature Comparison

| Feature | v2 | v3 |
|---------|----|----|
| Device management | ✅ | ✅ |
| Scene management | ✅ | ✅ |
| Room/Section management | ✅ | ✅ |
| Global variables | ✅ | ✅ |
| User management | ✅ | ✅ |
| Energy monitoring | ✅ | ✅ |
| Lua validation | ✅ | ✅ |
| Name-based lookups | ✅ | ✅ |
| Scene templates | ❌ | ✅ |
| Device history | ❌ | ✅ |
| Scene history | ❌ | ✅ |
| System backup | ❌ | ✅ |
| Lua REPL | ❌ | ✅ |
| Bulk operations | ❌ | ✅ |
| Analytics | ❌ | ✅ |
| Webhooks | ❌ | ✅ |
| MQTT bridge | ❌ | ✅ |
| Automation builder | ❌ | ✅ |

## Getting Help

If you encounter issues during migration:

1. Check the [CHANGELOG](CHANGELOG.md) for detailed changes
2. Review the [README](README.md) for updated documentation
3. See feature-specific guides:
   - [Templates](TEMPLATES.md)
   - [Analytics](ANALYTICS.md)
   - [Integrations](INTEGRATIONS.md)
   - [Automation](AUTOMATION.md)

## Rollback

If needed, you can rollback to v2:

```bash
npm install fibaro-mcp@2
```

Your existing configuration will continue to work.
