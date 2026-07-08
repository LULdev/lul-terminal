/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { useVisibilityAwarePoll } from './useVisibilityAwarePoll';

export function useRegisteredUserCount(pollMs = 30000) {
  const [registered, setRegistered] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/stats');
      if (!res.ok) return;
      const data = await res.json() as { registered?: number };
      setRegistered(Math.max(0, Number(data.registered) || 0));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useVisibilityAwarePoll(load, pollMs);

  return registered;
}