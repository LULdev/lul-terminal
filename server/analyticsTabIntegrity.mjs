/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { loadSessionsDb, saveSessionsDb, withSessionsWrite } from './auth/authStore.mjs';

/** Whether a tab_visit may trigger achievement side effects (blocks spoofed tab bursts). */
export function canCreditTabVisit(session, tab, { forceRemint = false } = {}) {
  if (!session || !tab) return false;
  const last = session.analyticsLastTab ?? null;
  if (last === null) return true;
  if (tab === last) return true;
  if (forceRemint) return false;
  return Boolean(session.analyticsDwellReady);
}

export async function markTabDwellIntegrity(token, tab) {
  if (!token || !tab) return;
  await withSessionsWrite(async () => {
    const db = await loadSessionsDb();
    const session = db.sessions.find((s) => s.token === token);
    if (!session || session.expiresAt <= Date.now()) return;
    const last = session.analyticsLastTab ?? null;
    if (last === null || tab === last) {
      session.analyticsDwellReady = true;
      await saveSessionsDb(db);
    }
  });
}

export async function commitTabVisitIntegrity(token, tab) {
  if (!token || !tab) return;
  await withSessionsWrite(async () => {
    const db = await loadSessionsDb();
    const session = db.sessions.find((s) => s.token === token);
    if (!session || session.expiresAt <= Date.now()) return;
    session.analyticsLastTab = tab;
    session.analyticsDwellReady = false;
    await saveSessionsDb(db);
  });
}