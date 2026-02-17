# External Integrations Guide

Fibaro MCP supports external integrations through HTTP webhooks and MQTT messaging. These features enable integration with external services, custom dashboards, and IoT platforms.

## Prerequisites

External integrations require optional dependencies:

```bash
# For webhooks (HTTP server)
npm install express

# For MQTT messaging
npm install mqtt

# Both
npm install express mqtt
```

If these packages are not installed, the integration features gracefully degrade and return helpful error messages explaining what to install.

## Webhook Server

The webhook server provides HTTP endpoints for external services to interact with your Fibaro system. Routes are configured when starting the server.

### Starting the Webhook Server

```
fibaro_integration op=webhook_start webhook_config={"port": 3000, "authToken": "your-secret-token", "routes": [...]}
```

**`webhook_config` parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `port` | number | No | 8080 | HTTP port to listen on |
| `host` | string | No | 0.0.0.0 | Host to bind to |
| `authToken` | string | No | - | Bearer token for authentication |
| `routes` | array | No | [] | Route definitions (see below) |

### Route Configuration

Routes define what HTTP endpoints are available and what Fibaro actions they trigger:

```json
{
  "routes": [
    {
      "method": "POST",
      "path": "/scene/42/execute",
      "action": "run_scene",
      "sceneId": 42
    },
    {
      "method": "POST",
      "path": "/device/15/action",
      "action": "device_action",
      "deviceId": 15,
      "actionName": "turnOn"
    },
    {
      "method": "POST",
      "path": "/variable/HomeMode",
      "action": "set_variable",
      "variableName": "HomeMode"
    }
  ]
}
```

**Route actions:**
| Action | Required Fields | Description |
|--------|----------------|-------------|
| `run_scene` | `sceneId` | Execute a Fibaro scene |
| `device_action` | `deviceId`, `actionName` | Execute a device action (args from request body) |
| `set_variable` | `variableName` | Set a global variable (value from request body or query) |
| `custom` | - | Returns request body as response |

### Built-in Endpoints

#### Health Check
```
GET /health
```
Returns `{"status": "ok"}` — always available, no authentication required.

### Authentication

When `authToken` is provided, all requests (except `/health`) must include:

```
Authorization: Bearer your-secret-token
```

Requests without valid authentication receive a `401 Unauthorized` response.

### Example: Setting Up Scene and Device Control

```
fibaro_integration op=webhook_start webhook_config={
  "port": 3000,
  "authToken": "my-secret-token",
  "routes": [
    {
      "method": "POST",
      "path": "/scene/42/execute",
      "action": "run_scene",
      "sceneId": 42
    },
    {
      "method": "POST",
      "path": "/device/15/action",
      "action": "device_action",
      "deviceId": 15,
      "actionName": "setValue"
    }
  ]
}
```

Then from external services:

```bash
# Trigger scene 42
curl -X POST http://localhost:3000/scene/42/execute \
  -H "Authorization: Bearer my-secret-token"

# Control device 15
curl -X POST http://localhost:3000/device/15/action \
  -H "Authorization: Bearer my-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"args": [50]}'

# Set a variable
curl -X POST http://localhost:3000/variable/HomeMode \
  -H "Authorization: Bearer my-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"value": "away"}'
```

### Limitations

The webhook server instance is **not persisted** across tool calls. This means:
- `webhook_stop` and `webhook_status` are not currently functional
- Restarting the MCP server stops all webhook servers
- Starting a second webhook on the same port will fail with EADDRINUSE

## MQTT Bridge

The MQTT bridge connects your Fibaro system to an MQTT broker, enabling integration with Home Assistant, Node-RED, and other MQTT-compatible platforms.

### Connecting to MQTT

```
fibaro_integration op=mqtt_connect mqtt_config={
  "broker": "mqtt://localhost:1883",
  "username": "mqttuser",
  "password": "secret",
  "clientId": "fibaro-mcp",
  "publishState": true
}
```

**`mqtt_config` parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `broker` | string | Yes | - | MQTT broker URL |
| `username` | string | No | - | MQTT username |
| `password` | string | No | - | MQTT password |
| `clientId` | string | No | fibaro-mcp | Client identifier |
| `publishState` | boolean | No | false | Auto-publish device states periodically |
| `subscriptions` | array | No | [] | Topics to subscribe to with action handlers |

### Auto-Publishing Device States

When `publishState: true`, the bridge periodically publishes all device states to MQTT:

```
fibaro/devices/{deviceId}/state
```

**Example payload:**
```json
{
  "id": 42,
  "name": "Living Room Light",
  "type": "com.fibaro.binarySwitch",
  "roomID": 5,
  "enabled": true,
  "properties": {
    "value": true,
    "dead": false
  }
}
```

States are published with `retain: true` so new subscribers get the latest state immediately.

### Subscribing to Commands

Configure subscriptions to control Fibaro devices via MQTT messages:

```json
{
  "subscriptions": [
    {
      "topic": "home/lights/+/set",
      "action": "device_action",
      "deviceId": 42,
      "actionName": "turnOn"
    },
    {
      "topic": "home/scenes/trigger",
      "action": "run_scene",
      "sceneId": 5
    },
    {
      "topic": "home/variables/+/set",
      "action": "set_variable",
      "variableName": "HomeMode"
    }
  ]
}
```

**Subscription actions:**
| Action | Required Fields | Description |
|--------|----------------|-------------|
| `run_scene` | `sceneId` | Execute a Fibaro scene |
| `device_action` | `deviceId`, `actionName` | Execute a device action |
| `set_variable` | `variableName` | Set a global variable (message = value) |

MQTT wildcards are supported in topic patterns:
- `+` matches a single topic level (e.g., `home/+/set`)
- `#` matches all remaining levels (e.g., `home/#`)

### Limitations

The MQTT bridge instance is **not persisted** across tool calls. This means:
- `mqtt_disconnect`, `mqtt_status`, and `mqtt_publish` are not currently functional
- Restarting the MCP server disconnects all MQTT bridges
- A future version may add an integration registry for lifecycle management

## Integration with External Platforms

### Home Assistant (REST Commands)

For webhook integration with Home Assistant, add to your `configuration.yaml`:

```yaml
rest_command:
  fibaro_scene:
    url: "http://fibaro-mcp-host:3000/scene/{{ scene_id }}/execute"
    method: POST
    headers:
      Authorization: "Bearer your-secret-token"

  fibaro_device:
    url: "http://fibaro-mcp-host:3000/device/{{ device_id }}/action"
    method: POST
    headers:
      Authorization: "Bearer your-secret-token"
      Content-Type: "application/json"
    payload: '{"args": {{ args | default([]) }}}'
```

Note: You must configure matching routes in `webhook_config.routes` for these endpoints.

### Node-RED

1. **MQTT Nodes:** Configure an MQTT broker and subscribe to `fibaro/devices/#` for state updates
2. **HTTP Nodes:** Use HTTP Request nodes to call webhook endpoints with Bearer token authentication

## Security Considerations

1. **Use authentication** — Always set `authToken` for the webhook server
2. **Use TLS** — For production, use HTTPS and MQTTS
3. **Network isolation** — Limit access to webhook port via firewall
4. **Strong tokens** — Use long, random authentication tokens
5. **Credential storage** — Store MQTT credentials securely

## Troubleshooting

### Webhook Not Starting

```
Error: Express is not installed. Install it with: npm install express
```

Install express: `npm install express`

### MQTT Connection Failed

```
Error: MQTT library is not installed. Install it with: npm install mqtt
```

Install mqtt: `npm install mqtt`

### Port Already in Use

Starting a second webhook server on the same port will fail. Restart the MCP server to free the port.

## API Reference

### fibaro_integration

| Operation | Description |
|-----------|-------------|
| `webhook_start` | Start HTTP webhook server (requires `webhook_config`) |
| `webhook_stop` | Stop webhook server (not yet implemented) |
| `webhook_status` | Get webhook server status (not yet implemented) |
| `mqtt_connect` | Connect to MQTT broker (requires `mqtt_config`) |
| `mqtt_disconnect` | Disconnect MQTT bridge (not yet implemented) |
| `mqtt_status` | Get MQTT bridge status (not yet implemented) |
| `mqtt_publish` | Publish MQTT message (not yet implemented) |

All operations use the `op` parameter: `fibaro_integration op=webhook_start ...`

## Related

- [Automation Builder](AUTOMATION.md) - Create automations triggered by external events
- [Examples](EXAMPLES.md) - More integration examples
