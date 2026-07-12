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

/**
 * Atomically check dwell chain and commit tab visit (prevents parallel tab_visit farm).
 * Returns true when achievement side effects may run.
 */
export async function tryClaimTabVisitCredit(token, tab, { forceRemint = false } = {}) {
  if (!token || !tab) return false;
  return withSessionsWrite(async () => {
    const db = await loadSessionsDb();
    const session = db.sessions.find((s) => s.token === token);
    if (!session || session.expiresAt <= Date.now()) return false;

    const last = session.analyticsLastTab ?? null;
    let canCredit = false;
    if (last === null) canCredit = true;
    else if (tab === last) canCredit = true;
    else if (!forceRemint && session.analyticsDwellReady) canCredit = true;

    if (!canCredit) return false;

    session.analyticsLastTab = tab;
    session.analyticsDwellReady = false;
    await saveSessionsDb(db);
    return true;
  });
}

/** @deprecated Use tryClaimTabVisitCredit — kept for tests/readers */
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