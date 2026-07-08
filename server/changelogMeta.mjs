/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VERSION_FILE = path.join(__dirname, '..', 'src', 'config', 'version.ts');

/** @returns {string} */
export function getLatestChangelogVersion() {
  try {
    const raw = fs.readFileSync(VERSION_FILE, 'utf8');
    const match = raw.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
    return match?.[1] ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}