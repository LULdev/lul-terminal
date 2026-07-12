/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AchievementProof = {
  tab: string;
  nonce: string;
  exp: number;
};

let cached: AchievementProof | null = null;

export function setAchievementProof(proof: AchievementProof | null | undefined) {
  if (!proof?.nonce || !proof.exp) {
    return;
  }
  cached = proof;
}

/** Take proof for an action; optionally require it was minted on a specific tab. */
export function takeAchievementProof(requiredTab?: string): string | null {
  if (!cached || Date.now() > cached.exp) return null;
  if (requiredTab && cached.tab !== requiredTab) return null;
  const nonce = cached.nonce;
  cached = null;
  return nonce;
}