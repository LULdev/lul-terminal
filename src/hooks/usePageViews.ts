/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPageViews, recordPageView } from '../lib/pageViews';
import { useAuth } from '../context/AuthContext';
import { useVisibilityAwarePoll } from './useVisibilityAwarePoll';

export function usePageViews(pageId: string | undefined, enabled = true) {
  const { isLoggedIn } = useAuth();
  const [views, setViews] = useState(0);
  const loadGenRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!pageId) return;
    const gen = ++loadGenRef.current;
    try {
      const v = await fetchPageViews(pageId);
      if (v !== null && gen === loadGenRef.current && mountedRef.current) setViews(v);
    } catch { /* ignore */ }
  }, [pageId]);

  useEffect(() => {
    if (!pageId || !enabled) {
      setViews(0);
      return;
    }
    const gen = ++loadGenRef.current;
    if (isLoggedIn) {
      recordPageView(pageId)
        .then((v) => { if (gen === loadGenRef.current && mountedRef.current) setViews(v); })
        .catch(() => { if (gen === loadGenRef.current && mountedRef.current) refresh(); });
    } else {
      refresh();
    }
  }, [pageId, enabled, isLoggedIn, refresh]);

  useVisibilityAwarePoll(refresh, 10_000, Boolean(pageId && enabled));

  return views;
}