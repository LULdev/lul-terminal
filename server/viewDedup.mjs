/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * In-memory guest view dedup — one counted view per IP + resource (survives until prune/restart).
 */

const guestViews = new Map();

const PRUNE_INTERVAL_MS = 5 * 60_000;
const ENTRY_TTL_MS = 90 * 24 * 60 * 60_000;
let lastPruneAt = Date.now();

function pruneStale() {
  const now = Date.now();
  if (now - lastPruneAt < PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  for (const [key, seenAt] of guestViews) {
    if (now - seenAt > ENTRY_TTL_MS) guestViews.delete(key);
  }
}

/** Returns true when this IP has not yet viewed the resource (caller should count the view). */
export function claimGuestView(scope, ip, resourceId) {
  if (!ip || !resourceId) return true;
  pruneStale();
  const key = `${scope}:${ip}:${resourceId}`;
  if (guestViews.has(key)) return false;
  guestViews.set(key, Date.now());
  return true;
}