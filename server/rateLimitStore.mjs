/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared rate-limit backends: memory (default), file (multi-process same host), redis (multi-instance).
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_STORE = path.join(__dirname, '..', 'data', 'rate-limits', 'buckets.json');

const memoryBuckets = new Map();
let fileCache = new Map();
let fileWriteChain = Promise.resolve();
let fileLoadedAt = 0;
const FILE_RELOAD_MS = 250;

let redisClient = null;
let redisInit = null;

function resolveBackend() {
  const explicit = String(process.env.RATE_LIMIT_BACKEND ?? 'auto').toLowerCase();
  if (explicit === 'memory') return 'memory';
  if (explicit === 'file') return 'file';
  if (explicit === 'redis') return 'redis';
  if (process.env.REDIS_URL) return 'redis';
  if (process.env.RATE_LIMIT_SHARED === '1' || process.env.RATE_LIMIT_SHARED === 'true') return 'file';
  return 'memory';
}

function pruneBucketMap(map, now) {
  for (const [key, bucket] of map) {
    const ttl = (bucket.windowMs ?? 60_000) * 2;
    if (now - bucket.start > ttl) map.delete(key);
  }
}

function incrementLocal(map, key, max, windowMs, now) {
  pruneBucketMap(map, now);
  let bucket = map.get(key);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0, windowMs };
    map.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= max;
}

async function ensureFileStore() {
  await fs.mkdir(path.dirname(FILE_STORE), { recursive: true });
  try {
    await fs.access(FILE_STORE);
  } catch {
    const tmp = `${FILE_STORE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify({ version: 1, buckets: {} }, null, 2), 'utf8');
    await fs.rename(tmp, FILE_STORE);
  }
}

async function loadFileBuckets(force = false) {
  const now = Date.now();
  if (!force && now - fileLoadedAt < FILE_RELOAD_MS) return;
  await ensureFileStore();
  try {
    const raw = await fs.readFile(FILE_STORE, 'utf8');
    const data = JSON.parse(raw);
    const buckets = data.buckets && typeof data.buckets === 'object' ? data.buckets : {};
    fileCache = new Map();
    for (const [key, bucket] of Object.entries(buckets)) {
      if (bucket && typeof bucket === 'object') {
        fileCache.set(key, {
          start: Number(bucket.start) || 0,
          count: Number(bucket.count) || 0,
          windowMs: Number(bucket.windowMs) || 60_000,
        });
      }
    }
    fileLoadedAt = now;
  } catch (err) {
    console.error('[rate-limit] file store read failed — using memory fallback', err);
    fileCache = new Map(memoryBuckets);
  }
}

async function persistFileBuckets() {
  const buckets = Object.fromEntries(fileCache.entries());
  const tmp = `${FILE_STORE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify({ version: 1, updatedAt: Date.now(), buckets }, null, 2), 'utf8');
  await fs.rename(tmp, FILE_STORE);
  fileLoadedAt = Date.now();
}

function withFileWrite(task) {
  const run = fileWriteChain.then(() => task());
  fileWriteChain = run.then(() => undefined, () => undefined);
  return run;
}

async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (redisClient?.isOpen) return redisClient;
  if (!redisInit) {
    redisInit = (async () => {
      try {
        const { createClient } = await import('redis');
        const client = createClient({ url: process.env.REDIS_URL });
        client.on('error', (err) => console.error('[rate-limit] redis error', err));
        await client.connect();
        redisClient = client;
        console.info('[rate-limit] Redis backend active');
        return client;
      } catch (err) {
        console.error('[rate-limit] Redis unavailable — falling back to memory', err);
        redisInit = null;
        return null;
      }
    })();
  }
  return redisInit;
}

async function incrementRedis(key, max, windowMs) {
  const client = await getRedisClient();
  if (!client) return incrementLocal(memoryBuckets, key, max, windowMs, Date.now());
  const now = Date.now();
  const bucketKey = `rl:${key}`;
  const count = await client.incr(bucketKey);
  if (count === 1) {
    await client.pExpire(bucketKey, windowMs);
  }
  const ttl = await client.pTTL(bucketKey);
  if (ttl < 0) await client.pExpire(bucketKey, windowMs);
  return count <= max;
}

async function incrementFile(key, max, windowMs) {
  const now = Date.now();
  return withFileWrite(async () => {
    await loadFileBuckets(true);
    const ok = incrementLocal(fileCache, key, max, windowMs, now);
    await persistFileBuckets();
    incrementLocal(memoryBuckets, key, max, windowMs, now);
    return ok;
  });
}

/** Returns true when request is within limit. */
export async function incrementRateLimit(key, { max = 30, windowMs = 60_000 } = {}) {
  const backend = resolveBackend();
  if (backend === 'redis') return incrementRedis(key, max, windowMs);
  if (backend === 'file') return incrementFile(key, max, windowMs);
  return incrementLocal(memoryBuckets, key, max, windowMs, Date.now());
}

export function getRateLimitBackend() {
  return resolveBackend();
}