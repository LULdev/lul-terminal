/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { attachAuth } from './auth/authApi.mjs';
import { isEffectivelyActive } from './auth/permissions.mjs';
import { isTabPublic, loadAccessControl } from './accessControlStore.mjs';

/** Require login when access-control marks a tab as members-only. */
export async function requireMemberTab(req, tabId) {
  const ac = await loadAccessControl();
  if (isTabPublic(ac.pages, tabId)) return;
  await attachAuth(req);
  const user = req.auth?.user;
  if (!user || !isEffectivelyActive(user)) {
    throw new Error('Permission denied');
  }
}