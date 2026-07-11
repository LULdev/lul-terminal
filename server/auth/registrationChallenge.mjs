/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Short-lived registration proof — must load challenge before POST /register.
 */

import crypto from 'crypto';
import { clientIp } from '../rateLimit.mjs';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const MAX_CHALLENGES = 5000;
const challenges = new Map();

function purgeExpired() {
  const now = Date.now();
  for (const [id, row] of challenges.entries()) {
    if (row.expiresAt <= now) challenges.delete(id);
  }
}

export function issueRegistrationChallenge(req) {
  purgeExpired();
  if (challenges.size >= MAX_CHALLENGES) {
    throw new Error('Registration temporarily unavailable — try again shortly');
  }
  const id = crypto.randomBytes(12).toString('hex');
  const ip = clientIp(req);
  if (process.env.NODE_ENV === 'production' && ip === 'unknown') {
    throw new Error('Registration temporarily unavailable — try again shortly');
  }
  const row = {
    id,
    ip,
    issuedAt: Date.now(),
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
    used: false,
  };
  challenges.set(id, row);
  return { challenge: id, expiresAt: row.expiresAt, ttlSec: Math.floor(CHALLENGE_TTL_MS / 1000) };
}

export function consumeRegistrationChallenge(challengeId, req) {
  purgeExpired();
  const id = String(challengeId ?? '').trim().slice(0, 32);
  if (!id) throw new Error('Registration challenge required — refresh and try again');
  const row = challenges.get(id);
  if (!row || row.used || row.expiresAt <= Date.now()) {
    throw new Error('Registration challenge expired — refresh and try again');
  }
  const ip = clientIp(req);
  if (process.env.NODE_ENV === 'production' && (row.ip === 'unknown' || ip === 'unknown')) {
    throw new Error('Registration challenge invalid for this network');
  }
  if (row.ip && row.ip !== 'unknown' && ip !== 'unknown' && row.ip !== ip) {
    throw new Error('Registration challenge invalid for this network');
  }
  row.used = true;
  challenges.delete(id);
  return true;
}