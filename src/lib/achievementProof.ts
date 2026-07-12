/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AchievementProof = {
  tab: string;
  nonce: string;
  exp: number;
};

const cache = new Map<string, AchievementProof>();

export function setAchievementProof(proof: AchievementProof | null | undefined) {
  if (!proof?.nonce || !proof.exp || !proof.tab) {
    return;
  }
  cache.set(proof.tab, proof);
}

/** Take proof for an action; optionally require it was minted on a specific tab. */
export function takeAchievementProof(requiredTab?: string): string | null {
  const now = Date.now();
  if (requiredTab) {
    const entry = cache.get(requiredTab);
    if (!entry || now > entry.exp) return null;
    cache.delete(requiredTab);
    return entry.nonce;
  }
  for (const [tab, entry] of cache) {
    if (now <= entry.exp) {
      cache.delete(tab);
      return entry.nonce;
    }
    cache.delete(tab);
  }
  return null;
}

export function clearAchievementProofs() {
  cache.clear();
}