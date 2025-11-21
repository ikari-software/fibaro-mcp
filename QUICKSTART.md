# Fibaro MCP Quick Start Guide

Get your Fibaro MCP server up and running in 5 minutes!

## Prerequisites

- Node.js 18 or later
- A Fibaro Home Center (HC2, HC3, or HCL)
- Network access to your Fibaro Home Center

## Installation

1. **Clone or download this repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

## Configuration

### Option 1: Environment Variables (Recommended for Testing)

Set the following environment variables:

```bash
export FIBARO_HOST="192.168.1.100"        # Your Fibaro IP address
export FIBARO_USERNAME="admin"             # Your username
export FIBARO_PASSWORD="your-password"     # Your password
export FIBARO_PORT="443"                   # Optional, defaults to 443
export FIBARO_HTTPS="true"                 # Optional, defaults to true
```

### Option 2: Claude Desktop Configuration (Recommended for Production)

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "fibaro": {
      "command": "node",
      "args": ["/absolute/path/to/fibaro-mcp/dist/index.js"],
      "env": {
        "FIBARO_HOST": "192.168.1.100",
        "FIBARO_USERNAME": "admin",
        "FIBARO_PASSWORD": "your-password"
      }
    }
  }
}
```

**Important:** Use the absolute path to the `dist/index.js` file!

## Usage

### With Claude Desktop

1. Add the configuration as shown above
2. Restart Claude Desktop completely (quit and reopen)
3. Start a conversation and try commands like:
   - "Show me all my devices"
   - "Turn on the living room light"
   - "What's the current temperature?"
   - "List all my scenes"

### Testing Manually

You can test the server manually from the command line:

```bash
# Set environment variables first
export FIBARO_HOST="192.168.1.100"
export FIBARO_USERNAME="admin"
export FIBARO_PASSWORD="your-password"

# Run the server
npm start
```

The server will communicate via stdio (standard input/output).

## Verifying Installation

After adding to Claude Desktop:

1. **Restart Claude Desktop completely**
2. **Start a new conversation**
3. **Ask Claude:** "Can you list my Fibaro devices?"
4. **Claude should:** Call the `list_devices` tool and show your devices

## Common Issues

### "Failed to initialize Fibaro client"
- Check that all required environment variables are set
- Verify the `FIBARO_HOST`, `FIBARO_USERNAME`, and `FIBARO_PASSWORD` values

### "Connection refused" or timeout errors
- Verify your Fibaro Home Center is powered on and accessible
- Check that the IP address is correct
- Ensure your computer can ping the Fibaro IP: `ping 192.168.1.100`
- Try accessing `https://192.168.1.100` in your web browser

### "Authentication failed"
- Double-check your username and password
- Try logging into the Fibaro web interface to verify credentials
- Check for special characters in the password that might need escaping

### Claude doesn't recognize the server
- Verify the path to `dist/index.js` is absolute and correct
- Make sure you built the project: `npm run build`
- Check that Node.js is in your system PATH
- Completely quit and restart Claude Desktop (not just close the window)

### Self-signed certificate errors
- This is normal for Fibaro installations
- The server automatically accepts self-signed certificates
- If needed, you can set `FIBARO_HTTPS` to `"false"` to use HTTP instead

## Next Steps

Once you have the server running:

1. **Explore the tools** - See [README.md](README.md) for a complete list of available tools
2. **Try examples** - Check [EXAMPLES.md](EXAMPLES.md) for usage examples
3. **Customize** - Modify the code to add custom functionality
4. **Contribute** - See [CONTRIBUTING.md](CONTRIBUTING.md) to contribute improvements

## Example Commands for Claude

Here are some natural language commands you can try:

**Device Control:**
- "Show me all devices in the bedroom"
- "Turn off device 45"
- "Set the kitchen light to 50% brightness"
- "Turn on all lights in the living room"

**Scenes:**
- "List all my scenes"
- "Run the Good Night scene"
- "What scenes are available in the bedroom?"

**Information:**
- "What's the current weather?"
- "Show me my energy consumption"
- "Get system information"

**Advanced:**
- "Set the RGB light to purple"
- "Set the thermostat to 22 degrees"
- "Show me all devices that are currently on"

## Security Notes

⚠️ **Important Security Considerations:**

1. **Store credentials securely** - Never commit credentials to version control
2. **Use strong passwords** - Ensure your Fibaro account has a strong password
3. **Network security** - Keep your Fibaro Home Center on a secure network
4. **Access control** - Consider creating a dedicated user account with limited permissions
5. **Local only** - This MCP server is designed for local network use only

## Troubleshooting Checklist

- [ ] Node.js 18+ installed: `node --version`
- [ ] Dependencies installed: `npm install`
- [ ] Project built: `npm run build`
- [ ] `dist/index.js` file exists
- [ ] Environment variables set correctly
- [ ] Fibaro Home Center accessible on network
- [ ] Credentials are correct
- [ ] Claude Desktop completely restarted
- [ ] Absolute path used in configuration

## Support

If you encounter issues:

1. Check the [README.md](README.md) for detailed documentation
2. Review [EXAMPLES.md](EXAMPLES.md) for usage patterns
3. Check the [CONTRIBUTING.md](CONTRIBUTING.md) for development information
4. Open an issue on GitHub with:
   - Error messages
   - Your configuration (without passwords!)
   - Steps to reproduce the issue

## Development

To develop and modify the server:

```bash
# Watch mode for automatic recompilation
npm run dev

# Build for production
npm run build

# Run the built server
npm start
```

Happy automating! 🏠✨

