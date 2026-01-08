/**
 * Extend Axios types to include custom metadata property
 */

import "axios";

declare module "axios" {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime?: number;
    };
  }
}
