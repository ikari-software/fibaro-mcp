/**
 * Simple logging utility with configurable log levels.
 *
 * Log levels (in order of verbosity):
 * - error: Critical errors
 * - warn: Warnings
 * - info: General information
 * - debug: Detailed debugging information
 *
 * Configure via FIBARO_LOG_LEVEL environment variable.
 * Default is 'info'.
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.WARN]: "WARN",
  [LogLevel.INFO]: "INFO",
  [LogLevel.DEBUG]: "DEBUG",
};

class Logger {
  private level: LogLevel;

  constructor() {
    const envLevel = process.env.FIBARO_LOG_LEVEL?.toUpperCase();
    this.level = this.parseLogLevel(envLevel);
  }

  private parseLogLevel(level?: string): LogLevel {
    switch (level) {
      case "ERROR":
        return LogLevel.ERROR;
      case "WARN":
        return LogLevel.WARN;
      case "INFO":
        return LogLevel.INFO;
      case "DEBUG":
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    const dataStr = data ? ` ${JSON.stringify(data)}` : "";
    return `[${timestamp}] [${levelName}] ${message}${dataStr}`;
  }

  /**
   * Log an error message.
   */
  error(message: string, error?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message, error));
    }
  }

  /**
   * Log a warning message.
   */
  warn(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, data));
    }
  }

  /**
   * Log an info message.
   */
  info(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message, data));
    }
  }

  /**
   * Log a debug message.
   */
  debug(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, data));
    }
  }

  /**
   * Log API request details (debug level).
   */
  logRequest(method: string, url: string, data?: unknown): void {
    this.debug(`API Request: ${method} ${url}`, data);
  }

  /**
   * Log API response details (debug level).
   */
  logResponse(method: string, url: string, status: number, duration: number): void {
    this.debug(`API Response: ${method} ${url} - ${status} (${duration}ms)`);
  }

  /**
   * Get current log level for testing.
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Set log level (useful for testing).
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

// Export singleton instance
export const logger = new Logger();
