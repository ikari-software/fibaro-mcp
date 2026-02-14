/**
 * Ambient type declarations for optional peer dependencies.
 * These modules are dynamically imported and may not be installed.
 */

declare module "mqtt" {
  export interface MqttClient {
    on(event: "connect", callback: () => void): this;
    on(event: "message", callback: (topic: string, message: Buffer) => void): this;
    on(event: "error", callback: (error: Error) => void): this;
    on(event: "close", callback: () => void): this;
    on(event: string, callback: (...args: unknown[]) => void): this;
    subscribe(
      topic: string | string[],
      options?: { qos?: 0 | 1 | 2 },
      callback?: (error?: Error) => void
    ): this;
    publish(
      topic: string,
      message: string | Buffer,
      options?: { qos?: 0 | 1 | 2; retain?: boolean },
      callback?: (error?: Error) => void
    ): this;
    end(force?: boolean, callback?: () => void): this;
    connected: boolean;
  }

  export interface ConnectOptions {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    clientId?: string;
    clean?: boolean;
    keepalive?: number;
    reconnectPeriod?: number;
  }

  export function connect(brokerUrl: string, options?: ConnectOptions): MqttClient;
}

declare module "express" {
  import { Server } from "http";

  export interface Request {
    body: unknown;
    params: Record<string, string>;
    query: Record<string, string | string[] | undefined>;
    headers: Record<string, string | string[] | undefined>;
    method: string;
    path: string;
  }

  export interface Response {
    status(code: number): Response;
    json(body: unknown): Response;
    send(body?: string | Buffer | object): Response;
    set(field: string, value: string): Response;
    end(): Response;
  }

  export interface NextFunction {
    (err?: unknown): void;
  }

  export interface RequestHandler {
    (req: Request, res: Response, next: NextFunction): void | Promise<void>;
  }

  export interface Router {
    get(path: string, ...handlers: RequestHandler[]): Router;
    post(path: string, ...handlers: RequestHandler[]): Router;
    put(path: string, ...handlers: RequestHandler[]): Router;
    delete(path: string, ...handlers: RequestHandler[]): Router;
    use(...handlers: RequestHandler[]): Router;
  }

  export interface Application extends Router {
    listen(port: number, callback?: () => void): Server;
    use(path: string, router: Router): Application;
    use(handler: RequestHandler): Application;
  }

  function express(): Application;

  namespace express {
    function json(): RequestHandler;
    function Router(): Router;
  }

  export default express;
}
