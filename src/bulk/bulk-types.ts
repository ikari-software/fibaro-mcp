/**
 * Fibaro MCP Server - Bulk Operations Types
 *
 * Copyright (c) 2025 Cezar "ikari" Pokorski
 * Licensed under the MIT License
 */

/**
 * Device query criteria
 */
export interface DeviceQuery {
  room_ids?: number[];
  section_ids?: number[];
  type?: string;
  base_type?: string;
  interface?: string;
  name_pattern?: string;
  property?: { name: string; value: any; operator?: "==" | "!=" | ">" | "<" | ">=" | "<=" };
  enabled?: boolean;
  visible?: boolean;
  device_ids?: number[];
}

/**
 * Bulk operation result for a single device
 */
export interface DeviceOperationResult {
  deviceId: number;
  deviceName?: string;
  success: boolean;
  error?: string;
  value?: any;
}

/**
 * Bulk operation overall result
 */
export interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  results: DeviceOperationResult[];
  duration: number;
  query: DeviceQuery;
}

/**
 * Bulk action types
 */
export type BulkActionType =
  | "device_action"
  | "set_property"
  | "update_config"
  | "enable"
  | "disable";

/**
 * Bulk action configuration
 */
export interface BulkAction {
  type: BulkActionType;
  action?: string; // For device_action type
  args?: any[]; // For device_action type
  property?: string; // For set_property type
  value?: any; // For set_property type
  config?: any; // For update_config type
}

/**
 * Bulk operation options
 */
export interface BulkOperationOptions {
  dry_run?: boolean;
  parallel?: boolean;
  concurrency?: number; // Max parallel operations (default: 5)
  stop_on_error?: boolean;
  rollback_on_error?: boolean;
}

/**
 * Rollback entry for error recovery
 */
export interface RollbackEntry {
  deviceId: number;
  action: BulkAction;
  previousValue?: any;
}
