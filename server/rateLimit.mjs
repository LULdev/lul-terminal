/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const buckets = new Map();

const TRUST_PROXY = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';

if (process.env.NODE_ENV === 'production' && !TRUST_PROXY) {
  console.warn('[rate-limit] TRUST_PROXY is not set — clientIp uses socket address only (set TRUST_PROXY=1 behind a reverse proxy)');
}

const BUCKET_PRUNE_INTERVAL_MS = 5 * 60_000;
let lastPruneAt = Date.now();

function pruneStaleBuckets() {
  const now = Date.now();
  if (now - lastPruneAt < BUCKET_PRUNE_INTERVAL_MS) return;
  lastPruneAt = now;
  for (const [key, bucket] of buckets) {
    const ttl = (bucket.windowMs ?? 60_000) * 2;
    if (now - bucket.start > ttl) buckets.delete(key);
  }
}

export function clientIp(req) {
  if (TRUST_PROXY) {
    const fwd = req.headers?.['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

/** In-memory sliding-window rate limiter (per-process). */
export function checkRateLimit(key, { max = 30, windowMs = 60_000 } = {}) {
  const now = Date.now();
  pruneStaleBuckets();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0, windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    const err = new Error('Too many requests');
    err.code = 'RATE_LIMIT';
    throw err;
  }
}

export function isRateLimitError(err) {
  return err?.code === 'RATE_LIMIT' || err?.message === 'Too many requests';
}