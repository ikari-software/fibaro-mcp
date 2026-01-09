/**
 * Fibaro MCP Server - Backup Types
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

/**
 * Export format types
 */
export type ExportFormat = "json" | "yaml";

/**
 * Data types that can be included in export
 */
export type ExportDataType =
  | "devices"
  | "scenes"
  | "rooms"
  | "sections"
  | "variables"
  | "users";

/**
 * Complete system export structure
 */
export interface FibaroExport {
  version: string;
  export_date: string;
  system_info: SystemInfo;
  devices?: any[];
  scenes?: any[];
  rooms?: any[];
  sections?: any[];
  global_variables?: any[];
  users?: any[];
  metadata: ExportMetadata;
}

/**
 * System information
 */
export interface SystemInfo {
  serial_number?: string;
  hc_name?: string;
  platform?: string;
  current_version?: string;
  zwaveVersion?: string;
  newestVersion?: string;
  updateStableAvailable?: boolean;
  updateBetaAvailable?: boolean;
  mac?: string;
  serverStatus?: number;
  defaultLanguage?: string;
}

/**
 * Export metadata
 */
export interface ExportMetadata {
  device_count: number;
  scene_count: number;
  room_count: number;
  section_count: number;
  variable_count: number;
  user_count: number;
  export_duration_ms?: number;
}

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  include?: ExportDataType[];
  exclude?: ExportDataType[];
  include_users?: boolean;
  include_passwords?: boolean;
}

/**
 * Import validation result
 */
export interface ImportValidationResult {
  valid: boolean;
  errors: ImportValidationError[];
  warnings: ImportValidationWarning[];
  metadata?: ExportMetadata;
}

/**
 * Import validation error
 */
export interface ImportValidationError {
  type: "schema" | "version" | "data";
  message: string;
  field?: string;
}

/**
 * Import validation warning
 */
export interface ImportValidationWarning {
  type: "compatibility" | "missing" | "deprecated";
  message: string;
  field?: string;
}

/**
 * Import options
 */
export interface ImportOptions {
  dry_run?: boolean;
  skip_existing?: boolean;
  update_existing?: boolean;
  types?: ExportDataType[];
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  imported: ImportStats;
  skipped: ImportStats;
  failed: ImportStats;
  errors: Array<{
    type: ExportDataType;
    id?: number;
    name?: string;
    error: string;
  }>;
  duration_ms: number;
}

/**
 * Import statistics
 */
export interface ImportStats {
  devices: number;
  scenes: number;
  rooms: number;
  sections: number;
  variables: number;
  users: number;
}
