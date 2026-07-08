/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchPageViews, recordPageView } from '../lib/pageViews';
import { useVisibilityAwarePoll } from './useVisibilityAwarePoll';

export function usePageViews(pageId: string | undefined, enabled = true) {
  const [views, setViews] = useState(0);

  const refresh = useCallback(async () => {
    if (!pageId) return;
    try {
      setViews(await fetchPageViews(pageId));
    } catch { /* ignore */ }
  }, [pageId]);

  useEffect(() => {
    if (!pageId || !enabled) {
      setViews(0);
      return;
    }
    let active = true;
    recordPageView(pageId)
      .then((v) => { if (active) setViews(v); })
      .catch(() => refresh());
    return () => { active = false; };
  }, [pageId, enabled, refresh]);

  useVisibilityAwarePoll(refresh, 10_000, Boolean(pageId && enabled));

  return views;
}