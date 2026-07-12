/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { loadSessionsDb, saveSessionsDb, withSessionsWrite } from './auth/authStore.mjs';

const MIN_DWELL_MS = 2000;

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
    if (last !== null && tab !== last) return;
    const lastVisitAt = Number(session.analyticsLastVisitAt) || 0;
    if (lastVisitAt > 0 && Date.now() - lastVisitAt < MIN_DWELL_MS) return;
    session.analyticsDwellReady = true;
    await saveSessionsDb(db);
  });
}

/**
 * Atomically check dwell chain and commit tab visit (prevents parallel tab_visit farm).
 * Returns { claimed, snapshot } for rollback on achievement side-effect failure.
 */
export async function tryClaimTabVisitCredit(token, tab, { forceRemint = false } = {}) {
  if (!token || !tab) return { claimed: false, snapshot: null };
  return withSessionsWrite(async () => {
    const db = await loadSessionsDb();
    const session = db.sessions.find((s) => s.token === token);
    if (!session || session.expiresAt <= Date.now()) return { claimed: false, snapshot: null };

    const last = session.analyticsLastTab ?? null;
    let canCredit = false;
    if (last === null) canCredit = true;
    else if (tab === last) canCredit = true;
    else if (!forceRemint && session.analyticsDwellReady) canCredit = true;

    if (!canCredit) return { claimed: false, snapshot: null };

    const snapshot = {
      analyticsLastTab: session.analyticsLastTab ?? null,
      analyticsDwellReady: Boolean(session.analyticsDwellReady),
      analyticsLastVisitAt: session.analyticsLastVisitAt ?? null,
    };

    session.analyticsLastTab = tab;
    session.analyticsDwellReady = false;
    session.analyticsLastVisitAt = Date.now();
    await saveSessionsDb(db);
    return { claimed: true, snapshot };
  });
}

export async function rollbackTabVisitCredit(token, snapshot) {
  if (!token || !snapshot) return;
  await withSessionsWrite(async () => {
    const db = await loadSessionsDb();
    const session = db.sessions.find((s) => s.token === token);
    if (!session || session.expiresAt <= Date.now()) return;
    session.analyticsLastTab = snapshot.analyticsLastTab;
    session.analyticsDwellReady = snapshot.analyticsDwellReady;
    session.analyticsLastVisitAt = snapshot.analyticsLastVisitAt;
    await saveSessionsDb(db);
  });
}