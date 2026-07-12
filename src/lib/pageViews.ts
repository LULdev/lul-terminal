/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sessionFetch } from './sessionFetch';

const API = '/api/page-views';
const SESSION_PREFIX = 'lul_page_view_';

export async function fetchPageViews(pageId: string): Promise<number | null> {
  const res = await fetch(`${API}/${encodeURIComponent(pageId)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return Math.max(0, Number(data.views) || 0);
}

export async function recordPageView(pageId: string): Promise<number> {
  const sessionKey = `${SESSION_PREFIX}${pageId}`;
  if (!sessionStorage.getItem(sessionKey)) {
    try {
      const res = await sessionFetch(`${API}/${encodeURIComponent(pageId)}/view`, {
        method: 'POST',
      });
      if (res.ok) {
        sessionStorage.setItem(sessionKey, '1');
        const data = await res.json();
        return Math.max(0, Number(data.views) || 0);
      }
    } catch { /* fall through */ }
  }
  return fetchPageViews(pageId);
}