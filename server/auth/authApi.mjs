/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { wrapAsyncHandler } from '../asyncMiddleware.mjs';
import { requireMemberTab } from '../tabAccessGuard.mjs';
import {
  clearSessionCookie,
  parseCookies,
  setRegistrationLockCookie,
  setSessionCookie,
  SESSION_COOKIE,
} from './cookies.mjs';
import {
  canAccessAdmin,
  canDeletePremiumAccounts,
  canSubmitPremiumAccounts,
  canViewPremiumAccounts,
  enrichUserForClient,
} from './permissions.mjs';
import {
  deleteOwnAccount,
  getPublicProfileByUsername,
  incrementProfileView,
  initAuth,
  loginUser,
  logoutUser,
  registerUser,
  reconcileExpiredSession,
  resolveSession,
  getPublicAuthStats,
  getReferralInfo,
  recordAchievementEvent,
  recordTerminalCommand,
  syncUserAchievements,
  updateProfile,
  uploadUserAvatar,
} from './authService.mjs';
import { getAvatarFile } from './avatarStore.mjs';
import {
  createUserAdmin,
  deleteUserAdmin,
  listUsers,
  updateUserAdmin,
} from './adminService.mjs';
import { checkRateLimit, clientIp, isRateLimitError } from '../rateLimit.mjs';

let initPromise = null;

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req, limit = 512 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Payload too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function attachAuth(req) {
  initPromise ??= initAuth();
  await initPromise;
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (token) await reconcileExpiredSession(token);
  const resolved = await resolveSession(token);
  req.auth = {
    token: token ?? null,
    user: resolved?.user ?? null,
    session: resolved?.session ?? null,
  };
  if (resolved?.user?.id) {
    const { touchUserLastSeen } = await import('../chatStats.mjs');
    touchUserLastSeen(resolved.user.id).catch(() => {});
  }
  return req.auth;
}

export function requireAuth(req) {
  if (!req.auth?.user) throw new Error('Not logged in');
  return req.auth.user;
}

export function requireRole(req, minChecker) {
  const user = requireAuth(req);
  if (!minChecker(user)) throw new Error('Permission denied');
  return user;
}

export async function handleAuthRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  try {
    await attachAuth(req);

    if (req.method === 'GET' && pathname === '/api/auth/me') {
      checkRateLimit(`auth-me:${clientIp(req)}`, { max: 120, windowMs: 60_000 });
      const { countAccountsByCreator } = await import('../premiumAccountsService.mjs');
      let user = null;
      let accountsSubmitted = 0;
      if (req.auth.user) {
        const { getAcceptedNotWorkingForCreator } = await import('../premiumAccountsReports.mjs');
        accountsSubmitted = await countAccountsByCreator(req.auth.user.id);
        const reportedNotWorkingAccounts = await getAcceptedNotWorkingForCreator(req.auth.user.id);
        const { buildProfileStats } = await import('../profileStats.mjs');
        const profileStats = await buildProfileStats(req.auth.user);
        user = enrichUserForClient(req.auth.user, accountsSubmitted, reportedNotWorkingAccounts, profileStats);
      }
      return sendJson(res, 200, {
        user,
        stats: req.auth.user ? { accountsSubmitted } : null,
        permissions: {
          premiumView: canViewPremiumAccounts(req.auth.user),
          premiumSubmit: canSubmitPremiumAccounts(req.auth.user),
          premiumDelete: canDeletePremiumAccounts(req.auth.user),
          admin: canAccessAdmin(req.auth.user),
          isVip: req.auth.user?.role === 'vip' || req.auth.user?.role === 'admin',
          isVerified: Boolean(req.auth.user?.verified),
        },
      });
    }

    if (req.method === 'GET' && pathname === '/api/auth/register/challenge') {
      checkRateLimit(`reg-challenge:${clientIp(req)}`, { max: 30, windowMs: 15 * 60_000 });
      const { issueRegistrationChallenge } = await import('./registrationChallenge.mjs');
      return sendJson(res, 200, issueRegistrationChallenge(req));
    }

    if (req.method === 'POST' && pathname === '/api/auth/register') {
      const ip = clientIp(req);
      checkRateLimit(`register:${ip}`, { max: 2, windowMs: 24 * 60 * 60_000 });
      const body = await readJsonBody(req);
      const result = await registerUser(body, req);
      if (result.registrationLockToken) {
        setRegistrationLockCookie(res, result.registrationLockToken);
      }
      return sendJson(res, 201, { user: result.user });
    }

    if (req.method === 'GET' && pathname === '/api/auth/referral/me') {
      const user = requireAuth(req);
      await requireMemberTab(req, 'invite');
      checkRateLimit(`referral-read:${user.id}`, { max: 30, windowMs: 60_000 });
      const info = await getReferralInfo(user.id, req);
      return sendJson(res, 200, info);
    }

    if (req.method === 'POST' && pathname === '/api/auth/login') {
      checkRateLimit(`login:${clientIp(req)}`, { max: 25, windowMs: 15 * 60_000 });
      const body = await readJsonBody(req);
      const result = await loginUser(body);
      setSessionCookie(res, result.token, result.maxAgeSec);
      const { countAccountsByCreator } = await import('../premiumAccountsService.mjs');
      const accountsSubmitted = await countAccountsByCreator(result.user.id);
      return sendJson(res, 200, {
        user: result.user,
        newUnlocks: result.newUnlocks ?? [],
        stats: { accountsSubmitted },
        permissions: {
          premiumView: canViewPremiumAccounts(result.user),
          premiumSubmit: canSubmitPremiumAccounts(result.user),
          premiumDelete: canDeletePremiumAccounts(result.user),
          admin: canAccessAdmin(result.user),
          isVip: result.user?.role === 'vip' || result.user?.role === 'admin',
          isVerified: Boolean(result.user?.verified),
        },
      });
    }

    if (req.method === 'POST' && pathname === '/api/auth/logout') {
      checkRateLimit(`logout:${clientIp(req)}`, { max: 30, windowMs: 60_000 });
      await logoutUser(req.auth.token);
      clearSessionCookie(res);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'PATCH' && pathname === '/api/auth/profile') {
      const user = requireAuth(req);
      checkRateLimit(`profile-patch:${user.id}`, { max: 10, windowMs: 60_000 });
      const body = await readJsonBody(req);
      const updated = await updateProfile(user.id, body, { keepToken: req.auth.token });
      return sendJson(res, 200, { user: updated.user, newUnlocks: updated.newUnlocks ?? [] });
    }

    if (req.method === 'POST' && pathname === '/api/auth/avatar') {
      const user = requireAuth(req);
      checkRateLimit(`avatar:${user.id}`, { max: 10, windowMs: 60_000 });
      const body = await readJsonBody(req, 3 * 1024 * 1024);
      const buffer = Buffer.from(body.data ?? '', 'base64');
      const result = await uploadUserAvatar(user.id, { mime: body.mime, buffer });
      return sendJson(res, 200, { user: result.user, newUnlocks: result.newUnlocks ?? [] });
    }

    if (req.method === 'POST' && pathname === '/api/auth/achievements/sync') {
      const user = requireAuth(req);
      await requireMemberTab(req, 'dashboard');
      checkRateLimit(`ach-sync:${user.id}`, { max: 30, windowMs: 60_000 });
      const result = await syncUserAchievements(user.id, {});
      return sendJson(res, 200, { user: result.user, newUnlocks: result.newUnlocks ?? [] });
    }

    if (req.method === 'POST' && pathname === '/api/auth/achievements/event') {
      const user = requireAuth(req);
      await requireMemberTab(req, 'fun');
      checkRateLimit(`ach-event:${user.id}`, { max: 20, windowMs: 60_000 });
      const body = await readJsonBody(req);
      const result = await recordAchievementEvent(user.id, String(body.event ?? ''), body.proof);
      return sendJson(res, 200, { user: result.user, newUnlocks: result.newUnlocks ?? [] });
    }

    if (req.method === 'POST' && pathname === '/api/auth/achievements/terminal-command') {
      const user = requireAuth(req);
      await requireMemberTab(req, 'dashboard');
      checkRateLimit(`ach-cmd:${user.id}`, { max: 40, windowMs: 60_000 });
      const body = await readJsonBody(req);
      const result = await recordTerminalCommand(user.id, String(body.command ?? ''), body.proof);
      return sendJson(res, 200, { user: result.user, newUnlocks: result.newUnlocks ?? [] });
    }

    const avatarFileMatch = pathname.match(/^\/api\/auth\/avatars\/([a-f0-9]+\.(?:jpg|png|gif|webp))$/);
    if (avatarFileMatch && req.method === 'GET') {
      checkRateLimit(`avatar-file:${clientIp(req)}`, { max: 180, windowMs: 60_000 });
      const hit = await getAvatarFile(avatarFileMatch[1]);
      if (!hit) return sendJson(res, 404, { error: 'Not found' });
      res.statusCode = 200;
      res.setHeader('Content-Type', hit.mime);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(hit.buf);
      return;
    }

    if (req.method === 'DELETE' && pathname === '/api/auth/account') {
      const user = requireAuth(req);
      checkRateLimit(`account-delete:${user.id}`, { max: 3, windowMs: 3600_000 });
      await deleteOwnAccount(user.id);
      clearSessionCookie(res);
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'GET' && pathname === '/api/auth/stats') {
      checkRateLimit(`auth-stats:${clientIp(req)}`, { max: 60, windowMs: 60_000 });
      return sendJson(res, 200, await getPublicAuthStats());
    }

    const publicUserMatch = pathname.match(/^\/api\/auth\/users\/([a-z0-9_]+)$/);
    if (publicUserMatch && req.method === 'GET') {
      checkRateLimit(`profile-read:${clientIp(req)}`, { max: 90, windowMs: 60_000 });
      const profile = await getPublicProfileByUsername(publicUserMatch[1]);
      return sendJson(res, 200, { user: profile });
    }

    const profileViewMatch = pathname.match(/^\/api\/auth\/users\/([a-z0-9_]+)\/view$/);
    if (profileViewMatch && req.method === 'POST') {
      await attachAuth(req);
      await requireMemberTab(req, 'profile');
      const viewerId = req.auth?.user?.id ?? clientIp(req);
      checkRateLimit(`profile-view:${viewerId}`, { max: 40, windowMs: 60_000 });
      const profile = await incrementProfileView(profileViewMatch[1], {
        viewer: req.auth?.user ?? null,
      });
      return sendJson(res, 200, { user: profile });
    }

    if (pathname.startsWith('/api/auth/admin')) {
      requireRole(req, canAccessAdmin);

      if (req.method === 'GET' && pathname === '/api/auth/admin/users') {
        checkRateLimit(`admin-users-list:${req.auth.user.id}`, { max: 60, windowMs: 60_000 });
        const data = await listUsers({
          search: url.searchParams.get('search') ?? undefined,
          role: url.searchParams.get('role') ?? undefined,
          active: url.searchParams.get('active') ?? undefined,
        });
        return sendJson(res, 200, data);
      }

      const adminActKey = `admin-users-act:${req.auth.user.id}`;

      if (req.method === 'POST' && pathname === '/api/auth/admin/users') {
        checkRateLimit(adminActKey, { max: 20, windowMs: 60_000 });
        const body = await readJsonBody(req);
        const user = await createUserAdmin(body);
        return sendJson(res, 201, { user });
      }

      const patchMatch = pathname.match(/^\/api\/auth\/admin\/users\/([a-f0-9]+)$/);
      if (patchMatch && req.method === 'PATCH') {
        checkRateLimit(adminActKey, { max: 30, windowMs: 60_000 });
        const body = await readJsonBody(req);
        const user = await updateUserAdmin(patchMatch[1], body);
        return sendJson(res, 200, { user });
      }

      if (patchMatch && req.method === 'DELETE') {
        checkRateLimit(adminActKey, { max: 20, windowMs: 60_000 });
        await deleteUserAdmin(patchMatch[1], req.auth.user.id);
        return sendJson(res, 200, { ok: true });
      }
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status = isRateLimitError(e)
      ? 429
      : msg === 'Permission denied'
        ? 403
        : msg === 'Not logged in' || msg === 'Invalid login credentials'
          ? 401
          : e instanceof SyntaxError || msg === 'Payload too large'
            || msg === 'Achievement proof required'
            || msg === 'Achievement proof expired'
            || msg === 'Achievement proof invalid for this action'
            ? 400
            : 500;
    return sendJson(res, status, { error: msg });
  }
}

export function createAuthMiddleware() {
  return wrapAsyncHandler((req, res, next) => {
    const pathname = req.url?.split('?')[0] ?? '';
    if (!pathname.startsWith('/api/auth')) {
      next();
      return;
    }
    return handleAuthRequest(req, res);
  });
}