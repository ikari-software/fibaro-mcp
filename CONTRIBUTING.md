# Contributing to Fibaro MCP

Thank you for your interest in contributing to the Fibaro MCP server! This document provides guidelines and information for contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/fibaro-mcp.git`
3. Install dependencies: `npm install`
4. Build the project: `npm run build`

## Development Setup

### Prerequisites
- Node.js 18+ 
- TypeScript 5.0+
- A Fibaro Home Center for testing (or access to one)

### Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in your Fibaro Home Center credentials
3. Run `npm run dev` to start development mode with watch

### Project Structure
```
src/
├── fibaro-client.ts  # Fibaro API client implementation
└── index.ts          # MCP server implementation
```

## Making Changes

### Code Style
- Use TypeScript strict mode
- Follow existing code formatting
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose

### Adding New Tools
To add a new MCP tool:

1. **Add the tool definition** in `setupHandlers()`:
```typescript
{
  name: 'your_tool_name',
  description: 'Clear description of what it does',
  inputSchema: {
    type: 'object',
    properties: {
      // Define parameters
    },
    required: ['param1'],
  },
}
```

2. **Implement the handler** in the `CallToolRequestSchema` handler:
```typescript
case 'your_tool_name': {
  // Implementation
  return {
    content: [
      {
        type: 'text',
        text: 'Result',
      },
    ],
  };
}
```

3. **Add API method** to `FibaroClient` if needed:
```typescript
async yourMethod(param: type): Promise<ReturnType> {
  const response = await this.client.get('/api/endpoint');
  return response.data;
}
```

### Adding New Resources
To add a new MCP resource:

1. **Add resource definition** in `ListResourcesRequestSchema` handler
2. **Add resource read handler** in `ReadResourceRequestSchema` handler
3. **Implement API method** in `FibaroClient` if needed

### Testing Your Changes

#### Manual Testing
1. Build the project: `npm run build`
2. Update your Claude Desktop config to point to your local build
3. Restart Claude Desktop
4. Test the tools through natural language interactions

#### Testing Checklist
- [ ] Tool appears in Claude's tool list
- [ ] Tool accepts correct parameters
- [ ] Tool rejects invalid parameters
- [ ] Tool produces expected results
- [ ] Error handling works correctly
- [ ] Documentation is updated

## Fibaro API Reference

The Fibaro Home Center API documentation can be found at:
- `http://your-fibaro-ip/docs/` (on your Home Center)
- Official Fibaro documentation

### Common API Endpoints
- `GET /api/devices` - List all devices
- `GET /api/devices/{id}` - Get device details
- `POST /api/devices/{id}/action/{action}` - Execute device action
- `GET /api/scenes` - List all scenes
- `POST /api/scenes/{id}/action/start` - Start scene
- `GET /api/rooms` - List all rooms
- `GET /api/globalVariables` - List global variables

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, focused commits
   - Follow the code style
   - Update documentation

3. **Test thoroughly**
   - Test all affected functionality
   - Test error cases
   - Verify no regressions

4. **Update documentation**
   - Update README.md if adding features
   - Add examples to EXAMPLES.md
   - Update inline code comments

5. **Submit pull request**
   - Provide clear description of changes
   - Reference any related issues
   - Include testing notes

## Commit Messages

Use clear, descriptive commit messages:

Good:
- `Add support for RGB+W light control`
- `Fix error handling in device control`
- `Update documentation for scene management`

Bad:
- `fix bug`
- `update`
- `changes`

## Feature Ideas

Here are some ideas for contributions:

### High Priority
- [ ] Add support for alarm systems
- [ ] Add support for door locks
- [ ] Add support for blinds/shutters
- [ ] Implement event streaming/webhooks
- [ ] Add device grouping operations

### Medium Priority
- [ ] Add support for custom device types
- [ ] Implement scene creation/editing
- [ ] Add automation rule management
- [ ] Add user management tools
- [ ] Implement backup/restore functionality

### Nice to Have
- [ ] Add statistical data retrieval
- [ ] Implement diagnostic tools
- [ ] Add device pairing/unpairing
- [ ] Create device health monitoring
- [ ] Add Z-Wave network tools

## API Coverage Checklist

Currently implemented:
- ✅ Device listing and details
- ✅ Device control (basic actions)
- ✅ Light control (on/off, dimming, RGB)
- ✅ Thermostat control
- ✅ Scene execution
- ✅ **Scene creation and editing with Lua**
- ✅ **Full Lua script management**
- ✅ **Quick App creation and management**
- ✅ Room management
- ✅ Global variables
- ✅ System information
- ✅ Weather data
- ✅ Energy monitoring

Not yet implemented:
- ⬜ Alarm systems
- ⬜ Door locks
- ⬜ Blinds/roller shutters
- ⬜ Block scene editing (graphical scenes)
- ⬜ Automation rules (non-scene based)
- ⬜ User management
- ⬜ Event notifications
- ⬜ Device pairing
- ⬜ Z-Wave network management
- ⬜ Backup/restore

## Questions?

If you have questions about contributing:
1. Check existing issues for similar discussions
2. Review the Fibaro API documentation
3. Open a new issue with your question

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

