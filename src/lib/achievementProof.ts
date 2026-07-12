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

/** Read proof nonce without consuming it. */
export function peekAchievementProof(requiredTab?: string): string | null {
  const now = Date.now();
  if (requiredTab) {
    const entry = cache.get(requiredTab);
    if (!entry || now > entry.exp) return null;
    return entry.nonce;
  }
  for (const [, entry] of cache) {
    if (now <= entry.exp) return entry.nonce;
  }
  return null;
}

/** Consume a previously peeked proof after a successful API call. */
export function commitAchievementProof(requiredTab?: string) {
  const now = Date.now();
  if (requiredTab) {
    const entry = cache.get(requiredTab);
    if (entry && now <= entry.exp) cache.delete(requiredTab);
    return;
  }
  for (const [tab, entry] of cache) {
    if (now <= entry.exp) {
      cache.delete(tab);
      return;
    }
    cache.delete(tab);
  }
}

/** Take proof for an action; optionally require it was minted on a specific tab. */
export function takeAchievementProof(requiredTab?: string): string | null {
  const nonce = peekAchievementProof(requiredTab);
  if (!nonce) return null;
  commitAchievementProof(requiredTab);
  return nonce;
}

export function clearAchievementProofs() {
  cache.clear();
}