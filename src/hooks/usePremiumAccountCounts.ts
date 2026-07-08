/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { useVisibilityAwarePoll } from './useVisibilityAwarePoll';

type AccountCounts = { premium: number; free: number };

export function usePremiumAccountCounts(pollMs = 30000) {
  const [counts, setCounts] = useState<AccountCounts>({ premium: 0, free: 0 });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/premium-accounts/public-stats');
      if (!res.ok) return;
      const data = await res.json() as AccountCounts;
      setCounts({
        premium: Math.max(0, Number(data.premium) || 0),
        free: Math.max(0, Number(data.free) || 0),
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useVisibilityAwarePoll(load, pollMs);

  return counts;
}