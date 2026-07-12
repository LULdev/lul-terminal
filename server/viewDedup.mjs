/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Guest view dedup — persisted JSON store + in-memory cache.
 * GUEST_VIEW_DEDUP_FAIL_OPEN=1 (default): store errors allow first view (no under-count).
 * GUEST_VIEW_DEDUP_FAIL_OPEN=0: store errors block counting (fail-closed).
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUEST_VIEWS_FILE = path.join(__dirname, '..', 'data', 'analytics', 'guest-views.json');

const PRUNE_INTERVAL_MS = 5 * 60_000;
const ENTRY_TTL_MS = 90 * 24 * 60 * 60_000;

const guestViews = new Map();
let lastPruneAt = Date.now();
let writeChain = Promise.resolve();
let loaded = false;

function guestViewDedupFailOpen() {
  const raw = String(process.env.GUEST_VIEW_DEDUP_FAIL_OPEN ?? '1').toLowerCase();
  return raw !== '0' && raw !== 'false';
}

async function ensureGuestViewsStore() {
  await fs.mkdir(path.dirname(GUEST_VIEWS_FILE), { recursive: true });
  try {
    await fs.access(GUEST_VIEWS_FILE);
  } catch {
    const tmp = `${GUEST_VIEWS_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify({ version: 1, entries: {} }, null, 2), 'utf8');
    await fs.rename(tmp, GUEST_VIEWS_FILE);
  }
}

async function loadGuestViews() {
  if (loaded) return;
  await ensureGuestViewsStore();
  try {
    const raw = await fs.readFile(GUEST_VIEWS_FILE, 'utf8');
    const data = JSON.parse(raw);
    const entries = data.entries && typeof data.entries === 'object' ? data.entries : {};
    for (const [key, seenAt] of Object.entries(entries)) {
      guestViews.set(key, Number(seenAt) || Date.now());
    }
  } catch (err) {
    console.error('[view-dedup] CRITICAL: guest-views.json unreadable', err);
    throw new Error('Guest view dedup unavailable');
  }
  loaded = true;
}

const guestViewsReady = loadGuestViews().catch((err) => {
  console.error('[view-dedup] initial load failed', err);
  throw err;
});

function pruneStale() {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  for (const [key, seenAt] of guestViews) {
    if (now - seenAt > ENTRY_TTL_MS) guestViews.delete(key);
  }
}

async function persistGuestViews() {
  const entries = Object.fromEntries(guestViews.entries());
  const tmp = `${GUEST_VIEWS_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ version: 1, updatedAt: Date.now(), entries }, null, 2), 'utf8');
  await fs.rename(tmp, GUEST_VIEWS_FILE);
}

function withGuestViewWrite(task) {
  const run = writeChain.then(() => task());
  writeChain = run.then(() => undefined, () => undefined);
  return run;
}

/**
 * Returns true when this IP has not yet viewed the resource (caller should count the view).
 * On persistence failure: fail-open (default) returns true; fail-closed returns false.
 */
export async function claimGuestView(scope, ip, resourceId) {
  await guestViewsReady;
  if (!ip || !resourceId) return true;
  pruneStale();
  const key = `${scope}:${ip}:${resourceId}`;
  if (guestViews.has(key)) return false;
  try {
    return await withGuestViewWrite(async () => {
      if (guestViews.has(key)) return false;
      guestViews.set(key, Date.now());
      pruneStale();
      await persistGuestViews();
      return true;
    });
  } catch (err) {
    console.error('[view-dedup] claim persist failed', err);
    return guestViewDedupFailOpen();
  }
}