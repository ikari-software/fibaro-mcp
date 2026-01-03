import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

export function toMcpError(
    error: unknown,
    context: {
        operation: 'tool' | 'resource' | 'startup';
        name?: string;
        uri?: string;
    }
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
        if (context.operation === 'tool') {
            parts.push(`Failed to execute tool: ${context.name}`);
        } else if (context.operation === 'resource') {
            parts.push(`Failed to read resource: ${context.uri}`);
        } else {
            parts.push('Request failed');
        }

        if (method || url) {
            parts.push(`Request: ${(method || 'GET').toUpperCase()} ${url || ''}`.trim());
        }

        if (status) {
            parts.push(`HTTP ${status}${statusText ? ` ${statusText}` : ''}`);
        } else if (code) {
            parts.push(`Network error: ${code}`);
        }

        if (status === 401 || status === 403) {
            parts.push(
                'Likely cause: invalid credentials or insufficient permissions. Fix: verify FIBARO_USERNAME / FIBARO_PASSWORD and that the user has API access.'
            );
        } else if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
            parts.push('Likely cause: host not reachable/DNS issue. Fix: verify FIBARO_HOST and network connectivity.');
        } else if (code === 'ECONNREFUSED') {
            parts.push('Likely cause: connection refused. Fix: verify FIBARO_HOST, FIBARO_PORT and whether HTTPS is enabled.');
        } else if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
            parts.push('Likely cause: timeout. Fix: verify connectivity and consider increasing timeout or checking Fibaro load.');
        }

        if (base && base !== 'undefined') {
            parts.push(`Details: ${base}`);
        }

        return new McpError(ErrorCode.InternalError, parts.join('\n'));
    }

    if (context.operation === 'tool') {
        return new McpError(ErrorCode.InternalError, `Tool execution failed (${context.name}): ${base}`);
    }
    if (context.operation === 'resource') {
        return new McpError(ErrorCode.InternalError, `Failed to read resource (${context.uri}): ${base}`);
    }
    return new McpError(ErrorCode.InternalError, base);
}
