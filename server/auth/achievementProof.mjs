/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { ensureActivity } from './achievements.mjs';

const PROOF_TTL_MS = 120_000;

/** Read-only / milestone tabs must not mint claw/terminal proof (faq → terminal farm). */
export const ACHIEVEMENT_PROOF_INELIGIBLE_TABS = new Set(['faq', 'changelog', 'news']);

function safeCompareNonce(a, b) {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/** Mint a single-use proof nonce after a server-recorded tab visit. */
export function mintAchievementProof(user, tab) {
  const safeTab = String(tab ?? '').slice(0, 24);
  if (ACHIEVEMENT_PROOF_INELIGIBLE_TABS.has(safeTab)) return null;
  const act = ensureActivity(user);
  const nonce = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + PROOF_TTL_MS;
  act.flags.achProofTab = safeTab;
  act.flags.achProofNonce = nonce;
  act.flags.achProofExp = exp;
  return { tab: safeTab, nonce, exp };
}

/** Validate and consume a proof nonce (one command / one claw per tab visit). */
export function consumeAchievementProof(user, { nonce, requiredTab = null, excludedTabs = null } = {}) {
  const act = ensureActivity(user);
  const now = Date.now();
  const stored = String(act.flags?.achProofNonce ?? '');
  const exp = Number(act.flags?.achProofExp) || 0;
  const tab = String(act.flags?.achProofTab ?? '');
  const presented = String(nonce ?? '').trim();

  if (!presented || !stored || !safeCompareNonce(presented, stored)) {
    throw new Error('Achievement proof required');
  }
  if (now > exp) throw new Error('Achievement proof expired');
  if (requiredTab && tab !== requiredTab) {
    throw new Error('Achievement proof invalid for this action');
  }
  if (excludedTabs?.has(tab)) {
    throw new Error('Achievement proof invalid for this action');
  }

  delete act.flags.achProofNonce;
  delete act.flags.achProofExp;
  delete act.flags.achProofTab;
  return true;
}