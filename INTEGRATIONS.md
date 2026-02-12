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

If these packages are not installed, the integration features gracefully degrade and return helpful error messages.

## Webhook Server

The webhook server provides HTTP endpoints for external services to interact with your Fibaro system.

### Starting the Webhook Server

```
fibaro_integration operation=webhook_start port=3000 auth_token=your-secret-token
```

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| port | number | No | 3000 | HTTP port to listen on |
| auth_token | string | No | - | Bearer token for authentication |

Once started, the server provides these endpoints:

### Built-in Endpoints

#### Health Check
```
GET /health
```
Returns `{"status": "ok"}` - useful for monitoring and load balancers.

#### Execute Scene
```
POST /scene/:sceneId/execute
Authorization: Bearer your-secret-token
```

Triggers the specified scene.

**Example:**
```bash
curl -X POST http://localhost:3000/scene/42/execute \
  -H "Authorization: Bearer your-secret-token"
```

#### Control Device
```
POST /device/:deviceId/action
Authorization: Bearer your-secret-token
Content-Type: application/json

{"action": "turnOn", "args": []}
```

Executes an action on the specified device.

**Example:**
```bash
curl -X POST http://localhost:3000/device/15/action \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"action": "setValue", "args": [50]}'
```

#### Set Variable
```
POST /variable/:name
Authorization: Bearer your-secret-token
Content-Type: application/json

{"value": "newValue"}
```

Sets a global variable value.

**Example:**
```bash
curl -X POST http://localhost:3000/variable/HomeMode \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"value": "away"}'
```

### Authentication

When `auth_token` is provided, all requests (except `/health`) must include:

```
Authorization: Bearer your-secret-token
```

Requests without valid authentication receive a `401 Unauthorized` response.

### Stopping the Server

The webhook server automatically stops when the MCP server shuts down. You can also check its status:

```
fibaro_integration operation=status
```

## MQTT Bridge

The MQTT bridge connects your Fibaro system to an MQTT broker, enabling integration with Home Assistant, Node-RED, and other MQTT-compatible platforms.

### Connecting to MQTT

```
fibaro_integration operation=mqtt_connect broker=mqtt://localhost:1883 username=mqttuser password=secret
```

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| broker | string | Yes | - | MQTT broker URL |
| username | string | No | - | MQTT username |
| password | string | No | - | MQTT password |
| client_id | string | No | fibaro-mcp | Client identifier |
| topic_prefix | string | No | fibaro | Topic prefix for all messages |

### Topic Structure

The MQTT bridge uses a hierarchical topic structure:

```
{prefix}/device/{deviceId}/state     - Device state updates
{prefix}/device/{deviceId}/set       - Commands to device
{prefix}/scene/{sceneId}/trigger     - Scene triggers
{prefix}/variable/{name}/state       - Variable values
{prefix}/variable/{name}/set         - Variable commands
{prefix}/status                       - Connection status
```

### Auto-Publishing Device States

Once connected, the bridge automatically publishes device states:

```
fibaro/device/42/state
{"value": true, "brightness": 75, "lastUpdate": 1704067200000}
```

State updates are published:
- On initial connection (all devices)
- When device values change (polled periodically)
- When explicitly refreshed

### Subscribing to Commands

The bridge subscribes to command topics:

**Device Control:**
```
fibaro/device/42/set
{"action": "turnOff"}
```

**Scene Trigger:**
```
fibaro/scene/5/trigger
{}
```

**Variable Set:**
```
fibaro/variable/HomeMode/set
{"value": "home"}
```

### Publishing Custom Messages

You can publish custom MQTT messages:

```
fibaro_integration operation=publish topic=custom/alert message={"type": "motion", "room": "kitchen"}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| topic | string | Yes | MQTT topic to publish to |
| message | string | Yes | Message payload (JSON recommended) |
| qos | number | No | Quality of Service (0, 1, or 2) |
| retain | boolean | No | Retain message on broker |

### Integration Status

Check the status of all integrations:

```
fibaro_integration operation=status
```

Returns:
```json
{
  "webhook": {
    "running": true,
    "port": 3000,
    "routes": 4
  },
  "mqtt": {
    "connected": true,
    "broker": "mqtt://localhost:1883",
    "subscriptions": 12,
    "lastPublish": 1704067200000
  }
}
```

## Home Assistant Integration

### MQTT Discovery

The MQTT bridge supports Home Assistant MQTT discovery. Devices are automatically announced with proper configuration:

```
homeassistant/light/fibaro_42/config
{
  "name": "Living Room Light",
  "unique_id": "fibaro_42",
  "state_topic": "fibaro/device/42/state",
  "command_topic": "fibaro/device/42/set",
  "brightness": true,
  "schema": "json"
}
```

### REST Commands

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
    payload: '{"action": "{{ action }}", "args": {{ args | default([]) }}}'
```

## Node-RED Integration

### MQTT Nodes

1. Add an MQTT broker configuration pointing to your broker
2. Use MQTT In nodes to subscribe to `fibaro/device/#` for state updates
3. Use MQTT Out nodes to publish commands to `fibaro/device/+/set`

### HTTP Nodes

1. Use HTTP Request nodes to call webhook endpoints
2. Add Authorization header with your Bearer token
3. Parse JSON responses for further processing

## Security Considerations

1. **Use authentication** - Always set `auth_token` for webhook server
2. **Use TLS** - For production, use HTTPS and MQTTS
3. **Network isolation** - Limit access to webhook port via firewall
4. **Strong tokens** - Use long, random authentication tokens
5. **Credential storage** - Store credentials in environment variables

## Troubleshooting

### Webhook Not Starting

```
Error: express library not found
```

Install express: `npm install express`

### MQTT Connection Failed

```
Error: MQTT library not found
```

Install mqtt: `npm install mqtt`

### Authentication Errors

Ensure your Bearer token matches exactly (case-sensitive).

### No Device Updates

Check that the MQTT bridge has permission to read device states and that your broker accepts connections.

## API Reference

### fibaro_integration

| Operation | Description |
|-----------|-------------|
| `webhook_start` | Start HTTP webhook server |
| `mqtt_connect` | Connect to MQTT broker |
| `status` | Get status of all integrations |
| `publish` | Publish MQTT message |

### Webhook Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `port` | number | HTTP port (default: 3000) |
| `auth_token` | string | Bearer authentication token |

### MQTT Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `broker` | string | MQTT broker URL |
| `username` | string | MQTT username |
| `password` | string | MQTT password |
| `client_id` | string | MQTT client ID |
| `topic_prefix` | string | Topic prefix (default: fibaro) |

## Related

- [Automation Builder](AUTOMATION.md) - Create automations triggered by external events
- [Examples](EXAMPLES.md) - More integration examples
- [Quickstart](QUICKSTART.md) - Getting started guide
