#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Seed or reset the SQLite auth database.
 *
 *   node scripts/seed-auth-database.mjs          # seed if empty
 *   node scripts/seed-auth-database.mjs --reset  # wipe + reseed
 */

import '../server/loadEnv.mjs';
import { resetAuthDatabase, seedDefaultUsersIfEmpty } from '../server/auth/authStore.mjs';

const reset = process.argv.includes('--reset');

if (reset) {
  await resetAuthDatabase();
  console.log('Auth database reset and reseeded.');
} else {
  await seedDefaultUsersIfEmpty();
  console.log('Auth database seed complete (skipped if users already exist).');
}