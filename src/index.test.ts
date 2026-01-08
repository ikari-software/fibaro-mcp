import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// We mock the MCP Server implementation so that importing index.ts does not
// require a live transport and we can introspect which handlers were registered.
let lastServerInstance: any;

// Allow tests to force handler functions to throw, to cover toMcpError wrapping paths.
let forceToolThrow: null | (() => unknown) = null;
let forceResourceThrow: null | (() => unknown) = null;

vi.mock("./mcp-handlers.js", async () => {
  const actual: any = await vi.importActual("./mcp-handlers.js");
  return {
    ...actual,
    handleToolCall: async (...args: any[]) => {
      if (forceToolThrow) throw forceToolThrow();
      return actual.handleToolCall(...args);
    },
    handleResourceRead: async (...args: any[]) => {
      if (forceResourceThrow) throw forceResourceThrow();
      return actual.handleResourceRead(...args);
    },
  };
});

vi.mock("@modelcontextprotocol/sdk/server/index.js", () => {
  class Server {
    public onerror: any;
    public handlers = new Map<any, any>();

    constructor(_info: any, _opts: any) {
      lastServerInstance = this;
    }

    setRequestHandler(schema: any, handler: any) {
      this.handlers.set(schema, handler);
    }

    async connect() {
      return;
    }

    async close() {
      return;
    }
  }

  return { Server };
});

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => {
  class StdioServerTransport {
    constructor() {
      // no-op
    }
  }

  return { StdioServerTransport };
});

// Prevent index.ts from auto-running its main guard during tests.
beforeEach(() => {
  // Ensure isMain evaluates false.
  process.argv[1] = "/__vitest__/not-index.js";
  forceToolThrow = null;
  forceResourceThrow = null;
  delete process.env.FIBARO_HOST;
  delete process.env.FIBARO_USERNAME;
  delete process.env.FIBARO_PASSWORD;
  delete process.env.FIBARO_CONFIG;
});

describe("index wiring", () => {
  it("registers list tools, list resources, read resource and call tool handlers", async () => {
    const {
      ListToolsRequestSchema,
      ListResourcesRequestSchema,
      ReadResourceRequestSchema,
      CallToolRequestSchema,
    } = await import("@modelcontextprotocol/sdk/types.js");

    const mod = await import("./index.js");
    const server = new mod.FibaroMCPServer();

    expect(lastServerInstance).toBeTruthy();
    expect(lastServerInstance.handlers.has(ListToolsRequestSchema)).toBe(true);
    expect(lastServerInstance.handlers.has(ListResourcesRequestSchema)).toBe(true);
    expect(lastServerInstance.handlers.has(ReadResourceRequestSchema)).toBe(true);
    expect(lastServerInstance.handlers.has(CallToolRequestSchema)).toBe(true);

    // Smoke-call list tools handler (does not need a Fibaro client)
    const listToolsHandler = lastServerInstance.handlers.get(ListToolsRequestSchema);
    const toolsResult = await listToolsHandler({});
    expect(toolsResult.tools.length).toBeGreaterThan(0);

    // Smoke-call list resources handler (does not need a Fibaro client)
    const listResourcesHandler = lastServerInstance.handlers.get(ListResourcesRequestSchema);
    const resourcesResult = await listResourcesHandler({});
    expect(resourcesResult.resources.length).toBeGreaterThan(0);

    // Ensure run() uses connect() (we don't assert args; just that it doesn't crash)
    // Provide env so initializeClient succeeds.
    process.env.FIBARO_HOST = "example";
    process.env.FIBARO_USERNAME = "u";
    process.env.FIBARO_PASSWORD = "p";
    await server.run();
  });

  it("initializeClient loads valid FIBARO_CONFIG object values (covers parsed object branch)", async () => {
    const mod = await import("./index.js");
    const server = new mod.FibaroMCPServer() as any;

    const p = join(tmpdir(), `fibaro-mcp-test-${Date.now()}-ok.json`);
    writeFileSync(
      p,
      JSON.stringify({ host: "filehost", username: "fu", password: "fp", https: false, port: 80 }),
      "utf8",
    );
    process.env.FIBARO_CONFIG = p;

    server.initializeClient();
    expect(server.fibaroClient).toBeTruthy();
  });

  it("initializeClient prefers env FIBARO_PORT when set (covers parseInt branch)", async () => {
    const mod = await import("./index.js");
    const server = new mod.FibaroMCPServer() as any;

    process.env.FIBARO_HOST = "example";
    process.env.FIBARO_USERNAME = "u";
    process.env.FIBARO_PASSWORD = "p";
    process.env.FIBARO_PORT = "1234";
    process.env.FIBARO_HTTPS = "false";

    server.initializeClient();
    expect(server.fibaroClient).toBeTruthy();
  });

  it("routes first_run tool calls without requiring a client (covers first_run fast path)", async () => {
    const { CallToolRequestSchema } = await import("@modelcontextprotocol/sdk/types.js");
    const mod = await import("./index.js");
    new mod.FibaroMCPServer();

    const handler = lastServerInstance.handlers.get(CallToolRequestSchema);
    const out = await handler({ params: { name: "first_run", arguments: {} } });
    expect(out.content[0].text).toContain("first_run");
  });

  it("wraps tool handler errors into McpError via toMcpError", async () => {
    const { CallToolRequestSchema, McpError } = await import("@modelcontextprotocol/sdk/types.js");

    const mod = await import("./index.js");
    // Construct server and then inject a minimal fibaro client instance into it.
    const server = new mod.FibaroMCPServer() as any;
    server.fibaroClient = {
      // make handleToolCall throw (unknown tool)
    };

    const handler = lastServerInstance.handlers.get(CallToolRequestSchema);
    await expect(handler({ params: { name: "nope", arguments: {} } })).rejects.toBeInstanceOf(
      McpError,
    );
  });

  it("getClient throws when client is not initialized (resource handler)", async () => {
    const { ReadResourceRequestSchema, McpError } =
      await import("@modelcontextprotocol/sdk/types.js");
    const mod = await import("./index.js");
    new mod.FibaroMCPServer();

    const handler = lastServerInstance.handlers.get(ReadResourceRequestSchema);
    await expect(handler({ params: { uri: "fibaro://devices" } })).rejects.toBeInstanceOf(McpError);
  });

  it("initializeClient throws on missing env vars", async () => {
    const mod = await import("./index.js");
    const server = new mod.FibaroMCPServer();

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(server.run()).resolves.toBeUndefined();

    // Even though the server starts, Fibaro-dependent handlers should still error.
    const { ReadResourceRequestSchema, McpError } =
      await import("@modelcontextprotocol/sdk/types.js");
    const handler = lastServerInstance.handlers.get(ReadResourceRequestSchema);
    await expect(handler({ params: { uri: "fibaro://devices" } })).rejects.toBeInstanceOf(McpError);
    spy.mockRestore();
  });

  it("initializeClient throws when FIBARO_CONFIG points to invalid JSON", async () => {
    const mod = await import("./index.js");
    const server = new mod.FibaroMCPServer() as any;

    const p = join(tmpdir(), `fibaro-mcp-test-${Date.now()}.json`);
    writeFileSync(p, "{not json", "utf8");
    process.env.FIBARO_CONFIG = p;

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => server.initializeClient()).toThrow("Failed to read FIBARO_CONFIG file");
    spy.mockRestore();
  });

  it("initializeClient throws when FIBARO_CONFIG points to missing file", async () => {
    const mod = await import("./index.js");
    const server = new mod.FibaroMCPServer() as any;

    process.env.FIBARO_CONFIG = join(tmpdir(), `fibaro-mcp-does-not-exist-${Date.now()}.json`);

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => server.initializeClient()).toThrow("Failed to read FIBARO_CONFIG file");
    spy.mockRestore();
  });

  it("initializeClient handles FIBARO_CONFIG with non-object JSON", async () => {
    const mod = await import("./index.js");
    const server = new mod.FibaroMCPServer() as any;

    const p = join(tmpdir(), `fibaro-mcp-test-array-${Date.now()}.json`);
    writeFileSync(p, "null", "utf8");
    process.env.FIBARO_CONFIG = p;
    process.env.FIBARO_HOST = "test";
    process.env.FIBARO_USERNAME = "u";
    process.env.FIBARO_PASSWORD = "p";

    expect(() => server.initializeClient()).not.toThrow();
  });

  it("initializeClient uses valid object from FIBARO_CONFIG", async () => {
    const mod = await import("./index.js");
    const server = new mod.FibaroMCPServer() as any;

    const p = join(tmpdir(), `fibaro-mcp-test-obj-${Date.now()}.json`);
    writeFileSync(
      p,
      JSON.stringify({ host: "config-host", username: "config-user", password: "config-pass" }),
      "utf8",
    );
    process.env.FIBARO_CONFIG = p;
    delete process.env.FIBARO_HOST;
    delete process.env.FIBARO_USERNAME;
    delete process.env.FIBARO_PASSWORD;

    server.initializeClient();
    expect(server.fibaroClient).toBeDefined();
  });

  it("handleToolCall allows first_run tool without client", async () => {
    const { CallToolRequestSchema } = await import("@modelcontextprotocol/sdk/types.js");
    const mod = await import("./index.js");
    new mod.FibaroMCPServer();

    const handler = lastServerInstance.handlers.get(CallToolRequestSchema);
    const result = await handler({ params: { name: "first_run", arguments: {} } });
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
  });

  it("main guard runs when argv[1] matches module path", async () => {
    // Trigger the main guard by setting argv[1] to this module path.
    // This should construct a server and call run().
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Under Vitest/Vite, importing './index.js' actually evaluates src/index.ts,
    // so isMain compares against the index.ts path.
    const indexTsPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    process.argv[1] = indexTsPath;

    vi.resetModules();
    await import("./index.js");

    // Give the async run() a tick to execute.
    await new Promise((r) => setTimeout(r, 0));
    expect(lastServerInstance).toBeTruthy();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("server.onerror logs MCP errors", async () => {
    const mod = await import("./index.js");
    new mod.FibaroMCPServer();

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    lastServerInstance.onerror(new Error("boom"));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("SIGINT handler closes server and exits", async () => {
    const onSpy = vi.spyOn(process, "on");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as any);

    const mod = await import("./index.js");
    new mod.FibaroMCPServer();

    // Find and invoke the SIGINT handler registered in setupErrorHandling.
    const sigint = onSpy.mock.calls.find((c) => c[0] === "SIGINT");
    expect(sigint).toBeTruthy();
    const handler = sigint![1] as () => Promise<void>;

    const closeSpy = vi.spyOn(lastServerInstance, "close");
    await expect(handler()).rejects.toThrow("exit:0");
    expect(closeSpy).toHaveBeenCalled();

    onSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("wraps thrown errors in resource/tool handlers via toMcpError", async () => {
    const { CallToolRequestSchema, ReadResourceRequestSchema, McpError } =
      await import("@modelcontextprotocol/sdk/types.js");
    const mod = await import("./index.js");
    const server = new mod.FibaroMCPServer() as any;
    server.fibaroClient = makeClient();

    forceToolThrow = () => new Error("tool boom");
    const toolHandler = lastServerInstance.handlers.get(CallToolRequestSchema);
    await expect(
      toolHandler({ params: { name: "list_devices", arguments: {} } }),
    ).rejects.toBeInstanceOf(McpError);

    forceResourceThrow = () => new Error("resource boom");
    const resourceHandler = lastServerInstance.handlers.get(ReadResourceRequestSchema);
    await expect(resourceHandler({ params: { uri: "fibaro://devices" } })).rejects.toBeInstanceOf(
      McpError,
    );
  });
});

function makeClient() {
  return {
    getDevices: async () => [],
    getRooms: async () => [],
    getSections: async () => [],
  };
}
