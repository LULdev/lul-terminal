/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { ensureActivity } from './achievements.mjs';

const PROOF_TTL_MS = 120_000;

/** Mint a single-use proof nonce after a server-recorded tab visit. */
export function mintAchievementProof(user, tab) {
  const act = ensureActivity(user);
  const safeTab = String(tab ?? '').slice(0, 24);
  const nonce = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + PROOF_TTL_MS;
  act.flags.achProofTab = safeTab;
  act.flags.achProofNonce = nonce;
  act.flags.achProofExp = exp;
  return { tab: safeTab, nonce, exp };
}

/** Validate and consume a proof nonce (one command / one claw per tab visit). */
export function consumeAchievementProof(user, { nonce, requiredTab = null } = {}) {
  const act = ensureActivity(user);
  const now = Date.now();
  const stored = String(act.flags?.achProofNonce ?? '');
  const exp = Number(act.flags?.achProofExp) || 0;
  const tab = String(act.flags?.achProofTab ?? '');
  const presented = String(nonce ?? '').trim();

  if (!presented || !stored || presented !== stored) {
    throw new Error('Achievement proof required');
  }
  if (now > exp) throw new Error('Achievement proof expired');
  if (requiredTab && tab !== requiredTab) {
    throw new Error('Achievement proof invalid for this action');
  }

  delete act.flags.achProofNonce;
  delete act.flags.achProofExp;
  delete act.flags.achProofTab;
  return true;
}