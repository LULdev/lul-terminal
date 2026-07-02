/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SystemStats {
  hits: number;
  unique: number;
  online: number;
}

export type GrabState = 'waiting' | 'stalking' | 'grabbing' | 'grabbed' | 'shaka';

export interface LogLine {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'warn' | 'success' | 'alert';
  commandToRun?: string;
}
