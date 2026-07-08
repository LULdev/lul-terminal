/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchProxyDatabaseStats } from '../lib/proxyDatabase';
import { useVisibilityAwarePoll } from './useVisibilityAwarePoll';

export function useProxyDatabaseCount(pollMs = 30000) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const stats = await fetchProxyDatabaseStats();
      setCount(Math.max(0, stats.inDatabase ?? 0));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useVisibilityAwarePoll(load, pollMs);

  return count;
}