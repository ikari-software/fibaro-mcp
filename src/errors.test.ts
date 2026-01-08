import { describe, expect, it } from "vitest";
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { toMcpError } from "./errors.js";

describe("toMcpError", () => {
  it("passes through McpError unchanged", () => {
    const e = new McpError(ErrorCode.InvalidRequest, "bad input");
    const out = toMcpError(e, { operation: "tool", name: "x" });
    expect(out).toBe(e);
  });

  it("formats Axios 401 with suggested fix", () => {
    const err: any = {
      isAxiosError: true,
      message: "Request failed with status code 401",
      response: { status: 401, statusText: "Unauthorized" },
      config: { url: "/devices", method: "get" },
    };

    const out = toMcpError(err, { operation: "tool", name: "list_devices" });
    expect(out).toBeInstanceOf(McpError);
    expect(out.code).toBe(ErrorCode.InternalError);
    expect(out.message).toContain("Failed to execute tool: list_devices");
    expect(out.message).toContain("HTTP 401");
    expect(out.message).toContain("Likely cause: invalid credentials");
  });

  it("formats DNS error with suggested fix", () => {
    const err: any = {
      isAxiosError: true,
      message: "getaddrinfo ENOTFOUND",
      code: "ENOTFOUND",
      config: { url: "/rooms", method: "get" },
    };

    const out = toMcpError(err, { operation: "resource", uri: "fibaro://rooms" });
    expect(out.message).toContain("Failed to read resource: fibaro://rooms");
    expect(out.message).toContain("Network error: ENOTFOUND");
    expect(out.message).toContain("Verify FIBARO_HOST");
  });

  it("formats non-Axios errors for tools", () => {
    const out = toMcpError(new Error("boom"), { operation: "tool", name: "turn_on" });
    expect(out.message).toContain("Tool execution failed (turn_on): boom");
  });

  it("formats Axios error for startup with generic prefix", () => {
    const err: any = {
      isAxiosError: true,
      message: "Request failed with status code 500",
      response: { status: 500, statusText: "Server Error" },
      config: { url: "/api/devices", method: "get" },
    };

    const out = toMcpError(err, { operation: "startup" });
    expect(out.message).toContain("Request failed");
    expect(out.message).toContain("Request: GET /api/devices");
    expect(out.message).toContain("HTTP 500");
  });

  it("formats ECONNREFUSED with suggested fix", () => {
    const err: any = {
      isAxiosError: true,
      message: "connect ECONNREFUSED",
      code: "ECONNREFUSED",
      config: { url: "/api/system", method: "get" },
    };

    const out = toMcpError(err, { operation: "resource", uri: "fibaro://system" });
    expect(out.message).toContain("connection refused");
    expect(out.message).toContain("FIBARO_PORT");
  });

  it("formats ETIMEDOUT with suggested fix", () => {
    const err: any = {
      isAxiosError: true,
      message: "timeout",
      code: "ETIMEDOUT",
      config: { url: "/api/weather", method: "get" },
    };

    const out = toMcpError(err, { operation: "resource", uri: "fibaro://weather" });
    expect(out.message).toContain("Likely cause: request timeout");
    expect(out.message).toContain("Check network connectivity");
  });

  it("formats non-Axios startup errors by returning base message", () => {
    const out = toMcpError("startup boom", { operation: "startup" });
    expect(out.message).toContain("startup boom");
  });
});
