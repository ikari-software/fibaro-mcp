import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

export function toMcpError(
  error: unknown,
  context: {
    operation: "tool" | "resource" | "startup";
    name?: string;
    uri?: string;
  },
): McpError {
  if (error instanceof McpError) return error;

  const base = error instanceof Error ? error.message : String(error);

  const anyErr = error as any;
  const isAxios = Boolean(anyErr?.isAxiosError);

  if (isAxios) {
    const status = anyErr?.response?.status as number | undefined;
    const statusText = anyErr?.response?.statusText as string | undefined;
    const code = anyErr?.code as string | undefined;
    const url = anyErr?.config?.url as string | undefined;
    const method = anyErr?.config?.method as string | undefined;

    const parts: string[] = [];
    if (context.operation === "tool") {
      parts.push(`Failed to execute tool: ${context.name}`);
    } else if (context.operation === "resource") {
      parts.push(`Failed to read resource: ${context.uri}`);
    } else {
      parts.push("Request failed");
    }

    if (method || url) {
      parts.push(`Request: ${(method || "GET").toUpperCase()} ${url || ""}`.trim());
    }

    if (status) {
      parts.push(`HTTP ${status}${statusText ? ` ${statusText}` : ""}`);
    } else if (code) {
      parts.push(`Network error: ${code}`);
    }

    if (status === 401 || status === 403) {
      parts.push(
        "Likely cause: invalid credentials or insufficient permissions.",
        "Fix: Verify FIBARO_USERNAME and FIBARO_PASSWORD. Ensure the user has API access permissions in Fibaro Home Center.",
        "Debug: Try logging into the Fibaro web interface with these credentials to confirm they work.",
      );
    } else if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
      parts.push(
        "Likely cause: host not reachable or DNS resolution issue.",
        "Fix: Verify FIBARO_HOST is correct (e.g., 192.168.1.100 or fibaro.local).",
        "Debug: Try pinging the host or accessing it in a web browser to confirm it's reachable.",
      );
    } else if (code === "ECONNREFUSED") {
      parts.push(
        "Likely cause: connection refused by the host.",
        "Fix: Verify FIBARO_HOST, FIBARO_PORT (default: 80 for HTTP, 443 for HTTPS), and FIBARO_HTTPS setting.",
        "Debug: Try accessing http(s)://FIBARO_HOST:PORT/api in a web browser to confirm the API is accessible.",
      );
    } else if (code === "ETIMEDOUT" || code === "ECONNABORTED") {
      parts.push(
        "Likely cause: request timeout.",
        "Fix: Check network connectivity and Fibaro Home Center responsiveness.",
        "Debug: Try reducing cache TTL (FIBARO_CACHE_TTL_MS) or check if Fibaro is under heavy load.",
      );
    } else if (code === "CERT_HAS_EXPIRED" || code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
      parts.push(
        "Likely cause: SSL/TLS certificate issue (self-signed or expired).",
        "Note: Self-signed certificates are automatically accepted by this client.",
        "Debug: Verify FIBARO_HTTPS setting and try accessing the Fibaro web interface in a browser.",
      );
    } else if (status === 404) {
      parts.push(
        "Likely cause: API endpoint not found.",
        "Fix: Verify you are using a compatible Fibaro Home Center version (HC2, HC3, HCL).",
        "Debug: Check the Fibaro Home Center firmware version and API documentation.",
      );
    } else if (status === 500 || status === 502 || status === 503) {
      parts.push(
        "Likely cause: Fibaro Home Center internal error or service unavailable.",
        "Fix: Check Fibaro system logs and ensure the Home Center is functioning properly.",
        "Debug: Try restarting the Fibaro Home Center or waiting a few moments before retrying.",
      );
    }

    if (base && base !== "undefined") {
      parts.push(`Details: ${base}`);
    }

    return new McpError(ErrorCode.InternalError, parts.join("\n"));
  }

  if (context.operation === "tool") {
    return new McpError(
      ErrorCode.InternalError,
      `Tool execution failed (${context.name}): ${base}`,
    );
  }
  if (context.operation === "resource") {
    return new McpError(
      ErrorCode.InternalError,
      `Failed to read resource (${context.uri}): ${base}`,
    );
  }
  return new McpError(ErrorCode.InternalError, base);
}
