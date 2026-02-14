# Scene Templates Guide

Scene templates provide a powerful way to create reusable automation patterns for your Fibaro Home Center. Templates use a JSON-based definition format with parameter substitution, making it easy to deploy consistent automations across your home.

## Overview

The template system includes:
- **Built-in templates** for common scenarios (lighting, security, energy management)
- **Parameter substitution** using `{{placeholder}}` syntax
- **Validation** to ensure templates are correctly configured
- **Custom templates** that you can create and share

## Using Templates

### List Available Templates

```
fibaro_template op=list
```

Returns all available templates organized by category:
- `lighting` - Light control and scheduling
- `security` - Alarm and motion detection
- `energy` - Power management and optimization
- `climate` - Temperature and HVAC control
- `notification` - Alerts and messages

### Get Template Details

```
fibaro_template op=get template_id=motion-light
```

Returns the complete template definition including:
- Name and description
- Required and optional parameters
- Default values
- Lua code template

### Instantiate a Template

```
fibaro_template op=instantiate template_id=motion-light parameters={"sensor_id": 42, "light_id": 15, "timeout": 300}
```

Creates a complete Lua scene from the template with your parameters substituted.

## Built-in Templates

### motion-light

Automatically turns on a light when motion is detected and turns it off after a timeout.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| sensor_id | number | Yes | - | Motion sensor device ID |
| light_id | number | Yes | - | Light device ID to control |
| timeout | number | No | 300 | Seconds before auto-off |
| brightness | number | No | 100 | Light brightness (0-100) |

**Example:**
```
fibaro_template op=instantiate template_id=motion-light parameters={"sensor_id": 42, "light_id": 15, "timeout": 180, "brightness": 80}
```

### sunset-lights

Turns on lights at sunset with optional offset.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| light_ids | array | Yes | - | Array of light device IDs |
| offset_minutes | number | No | 0 | Minutes before/after sunset |
| brightness | number | No | 100 | Light brightness (0-100) |

### peak-saver

Reduces energy consumption during peak hours by dimming lights and adjusting HVAC.

**Parameters:**
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| peak_start | string | Yes | - | Peak period start time (HH:MM) |
| peak_end | string | Yes | - | Peak period end time (HH:MM) |
| light_ids | array | No | [] | Lights to dim during peak |
| max_brightness | number | No | 50 | Maximum brightness during peak |

## Creating Custom Templates

### Template Structure

Templates are JSON files with the following structure:

```json
{
  "id": "my-custom-template",
  "name": "My Custom Template",
  "description": "Description of what this template does",
  "category": "lighting",
  "version": "1.0.0",
  "author": "Your Name",
  "parameters": [
    {
      "name": "device_id",
      "type": "number",
      "required": true,
      "description": "Target device ID"
    },
    {
      "name": "delay",
      "type": "number",
      "required": false,
      "default": 5,
      "description": "Delay in seconds"
    }
  ],
  "lua_code": "-- Scene: {{name}}\n-- {{description}}\n\nlocal deviceId = {{device_id}}\nlocal delay = {{delay}}\n\nfibaro.call(deviceId, \"turnOn\")\nfibaro.sleep(delay * 1000)\nfibaro.debug(\"Completed\")"
}
```

### Parameter Types

| Type | Description | Example |
|------|-------------|---------|
| `number` | Numeric value | `42`, `3.14` |
| `string` | Text value | `"Living Room"` |
| `boolean` | True/false | `true`, `false` |
| `array` | List of values | `[1, 2, 3]` |

### Parameter Substitution

Use `{{parameter_name}}` syntax in your Lua code. The template engine handles:

- **Number escaping**: Numbers are inserted directly
- **String escaping**: Strings are quoted and special characters escaped
- **Array formatting**: Arrays are converted to Lua table syntax
- **Default values**: Missing optional parameters use their defaults

### Adding Custom Templates

1. Create a JSON file in `data/scene-templates/<category>/`
2. The template is automatically loaded on startup
3. Or use the API to add templates dynamically:

```
fibaro_template op=create template={"id": "my-template", "name": "My Template", ...}
```

### Deleting Templates

```
fibaro_template op=delete template_id=my-template
```

Note: Built-in templates cannot be deleted.

## Template Validation

Templates are validated when loaded or created:

1. **Required fields**: id, name, category, parameters, lua_code
2. **Parameter definitions**: Each must have name, type, description
3. **Lua syntax**: The template code is checked for basic syntax errors
4. **Placeholder matching**: All placeholders must have corresponding parameters

## Best Practices

1. **Use descriptive IDs**: `motion-light-bedroom` instead of `template1`
2. **Document parameters**: Include clear descriptions and sensible defaults
3. **Add debug output**: Use `fibaro.debug()` to help troubleshoot
4. **Test thoroughly**: Instantiate with various parameter combinations
5. **Version your templates**: Update the version when making changes

## Example Workflow

1. Browse available templates:
   ```
   fibaro_template op=list
   ```

2. Get details for a template you want to use:
   ```
   fibaro_template op=get template_id=motion-light
   ```

3. Instantiate with your parameters:
   ```
   fibaro_template op=instantiate template_id=motion-light parameters={"sensor_id": 42, "light_id": 15}
   ```

4. Review the generated Lua code

5. Create the scene on your Fibaro system using `fibaro_scene create`

## API Reference

### fibaro_template

| Operation | Description |
|-----------|-------------|
| `list` | List all available templates |
| `get` | Get template details (`template_id` required) |
| `instantiate` | Generate Lua code from template (`template_id`, `parameters` required) |
| `create` | Add a custom template (`template` required) |
| `delete` | Remove a custom template (`template_id` required) |

All operations use the `op` parameter: `fibaro_template op=list`

## Related

- [Automation Builder](AUTOMATION.md) - For more complex multi-step automations
- [Lua Management](LUA_MANAGEMENT.md) - Lua scene management and validation
- [Examples](EXAMPLES.md) - More usage examples
