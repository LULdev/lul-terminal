/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { attachAuth, requireAuth, requireRole } from './auth/authApi.mjs';
import { checkRateLimit, clientIp, isRateLimitError } from './rateLimit.mjs';
import { claimGuestView } from './viewDedup.mjs';
import { requireMemberTab } from './tabAccessGuard.mjs';
import { canAccessAdmin } from './auth/permissions.mjs';
import { pasteViewLink, postBotPastePublished } from './chatBot.mjs';
import { ensureActivity } from './auth/achievements.mjs';
import { loadUsersDb, saveUsersDb } from './auth/authStore.mjs';
import { incrementUserPasteCount, incrementUserPasteViews } from './auth/authService.mjs';
import { runCoinTransaction } from './gamesCoinLock.mjs';
import { resolvePasteAccess } from './pasteAccess.mjs';
import {
  adminDeletePaste,
  adminUpdatePaste,
  computeAdminPasteStats,
  computeUserPasteStats,
  deletePaste,
  getContent,
  getMeta,
  listAllPastes,
  listByUser,
  listPublicArchive,
  listTrendingPublic,
  purgeIfExpired,
  readStats,
  getUserPasteRating,
  ratePaste,
  recordView,
  savePaste,
  updatePaste,
} from './pasteStore.mjs';

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req, limit = 600 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('Payload too large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw);
}

function originFromReq(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}`;
}

async function requireAdmin(req) {
  await attachAuth(req);
  requireRole(req, canAccessAdmin);
}

function toAdminClientMeta(meta, req) {
  return {
    ...toClientMeta(meta, req, { includePrivate: true }),
    hasPassword: Boolean(meta.passwordHash),
  };
}

function toClientMeta(meta, req, { includePrivate = false, userId = null } = {}) {
  const origin = originFromReq(req);
  const locked = meta.visibility === 'protected';
  const ownerOnly = meta.visibility === 'private';
  const base = {
    id: meta.id,
    title: meta.title,
    language: meta.language,
    visibility: meta.visibility,
    locked,
    ownerOnly,
    membersOnly: ownerOnly,
    expiresAt: meta.expiresAt ?? null,
    burnAfterRead: Boolean(meta.burnAfterRead),
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt ?? null,
    views: meta.views ?? 0,
    size: meta.size ?? 0,
    lineCount: meta.lineCount ?? 0,
    pinned: Boolean(meta.pinned),
    username: meta.username ?? null,
    ratingAvg: meta.ratingAvg ?? 0,
    ratingCount: meta.ratingCount ?? 0,
    viewUrl: `${origin}/p/${meta.id}`,
    rawUrl: `${origin}/api/paste/${meta.id}/raw`,
  };
  if (includePrivate) {
    base.userId = meta.userId ?? null;
  }
  if (userId) {
    const ur = getUserPasteRating(meta, userId);
    if (ur) base.userRating = ur;
  }
  return base;
}

function toClientPaste(meta, content, req, opts = {}) {
  return {
    ...toClientMeta(meta, req, opts),
    content,
  };
}

async function clientUserId(req) {
  try {
    await attachAuth(req);
    return req.auth?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function loadAlive(id) {
  const meta = await purgeIfExpired(await getMeta(id));
  return meta;
}

export async function handlePasteRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  try {
    const isAdminRoute = pathname.startsWith('/api/paste/admin');
    if (!isAdminRoute) {
      await requireMemberTab(req, 'paste');
    }

    if (req.method === 'GET' && pathname === '/api/paste/stats') {
      checkRateLimit(`paste-stats:${clientIp(req)}`, { max: 60, windowMs: 60_000 });
      return sendJson(res, 200, await readStats());
    }

    if (req.method === 'GET' && pathname === '/api/paste/public') {
      checkRateLimit(`paste-public:${clientIp(req)}`, { max: 60, windowMs: 60_000 });
      const limit = Math.min(80, Math.max(1, Number(url.searchParams.get('limit')) || 40));
      const items = await listPublicArchive(limit);
      return sendJson(res, 200, {
        pastes: items.map((m) => toClientMeta(m, req)),
        total: items.length,
      });
    }

    if (req.method === 'GET' && pathname === '/api/paste/trending') {
      checkRateLimit(`paste-trending:${clientIp(req)}`, { max: 60, windowMs: 60_000 });
      const limit = Math.min(40, Math.max(1, Number(url.searchParams.get('limit')) || 12));
      const items = await listTrendingPublic(limit);
      return sendJson(res, 200, {
        pastes: items.map((m) => toClientMeta(m, req)),
        total: items.length,
      });
    }

    if (req.method === 'GET' && pathname === '/api/paste/admin/stats') {
      await requireAdmin(req);
      checkRateLimit(`paste-admin:${req.auth?.user?.id ?? clientIp(req)}`, { max: 120, windowMs: 60_000 });
      return sendJson(res, 200, await computeAdminPasteStats());
    }

    if (req.method === 'GET' && pathname === '/api/paste/admin') {
      await requireAdmin(req);
      checkRateLimit(`paste-admin:${req.auth?.user?.id ?? clientIp(req)}`, { max: 120, windowMs: 60_000 });
      const q = url.searchParams.get('q') ?? '';
      const visibility = url.searchParams.get('visibility') ?? 'all';
      const sort = url.searchParams.get('sort') ?? 'newest';
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 100));
      const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
      const result = await listAllPastes({ q, visibility, sort, limit, offset });
      return sendJson(res, 200, {
        pastes: result.pastes.map((m) => toAdminClientMeta(m, req)),
        total: result.total,
      });
    }

    const adminIdMatch = pathname.match(/^\/api\/paste\/admin\/([A-Za-z0-9_-]{10,14})$/);
    if (adminIdMatch) {
      const id = adminIdMatch[1];
      await requireAdmin(req);
      const adminKey = req.auth?.user?.id ?? clientIp(req);
      checkRateLimit(`paste-admin:${adminKey}`, { max: 120, windowMs: 60_000 });
      const meta = await loadAlive(id);
      if (!meta) return sendJson(res, 404, { error: 'Paste not found' });

      if (req.method === 'GET') {
        const content = await getContent(id);
        if (!content) return sendJson(res, 404, { error: 'Paste not found' });
        return sendJson(res, 200, {
          ...toAdminClientMeta(meta, req),
          content,
        });
      }

      if (req.method === 'PATCH') {
        checkRateLimit(`paste-admin-act:${adminKey}`, { max: 30, windowMs: 60_000 });
        const body = await readJsonBody(req);
        const updated = await adminUpdatePaste(id, body);
        const content = await getContent(id);
        return sendJson(res, 200, {
          ...toAdminClientMeta(updated, req),
          content,
        });
      }

      if (req.method === 'DELETE') {
        checkRateLimit(`paste-admin-act:${adminKey}`, { max: 20, windowMs: 60_000 });
        const result = await adminDeletePaste(id);
        return sendJson(res, 200, result);
      }
    }

    if (req.method === 'GET' && pathname === '/api/paste/my/stats') {
      await attachAuth(req);
      const user = requireAuth(req);
      checkRateLimit(`paste-my-stats:${user.id}`, { max: 60, windowMs: 60_000 });
      return sendJson(res, 200, await computeUserPasteStats(user.id));
    }

    if (req.method === 'GET' && pathname === '/api/paste/my') {
      await attachAuth(req);
      const user = requireAuth(req);
      checkRateLimit(`paste-my-list:${user.id}`, { max: 60, windowMs: 60_000 });
      const sort = url.searchParams.get('sort') ?? 'newest';
      const items = await listByUser(user.id, sort);
      return sendJson(res, 200, {
        pastes: items.map((m) => toClientMeta(m, req, { includePrivate: true })),
        total: items.length,
      });
    }

    if (req.method === 'POST' && pathname === '/api/paste') {
      await attachAuth(req);
      const user = requireAuth(req);
      checkRateLimit(`paste-create:${user.id}`, { max: 15, windowMs: 60_000 });
      const body = await readJsonBody(req);
      const meta = await savePaste({
        title: body.title,
        content: body.content,
        language: body.language,
        visibility: body.visibility,
        password: body.password,
        expiry: body.expiry,
        burnAfterRead: body.burnAfterRead,
        userId: user.id,
        username: user.username,
      });
      const content = await getContent(meta.id);
      const unlocks = await incrementUserPasteCount(user.id);
      if (user.username) {
        postBotPastePublished({
          username: user.username,
          pasteTitle: meta.title,
          pasteHref: pasteViewLink(meta.id),
          visibility: meta.visibility,
        }).catch(() => {});
      }
      const payload = toClientPaste(meta, content, req, { includePrivate: true });
      if (unlocks.length) payload.achievementUnlocks = unlocks;
      return sendJson(res, 201, payload);
    }

    const rawMatch = pathname.match(/^\/api\/paste\/([A-Za-z0-9_-]{10,14})\/raw$/);
    if (rawMatch && req.method === 'GET') {
      checkRateLimit(`paste-pw:${clientIp(req)}:${rawMatch[1]}`, { max: 15, windowMs: 900_000 });
      const meta = await loadAlive(rawMatch[1]);
      if (!meta) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const access = await resolvePasteAccess(req, meta, url.searchParams.get('password') ?? '');
      if (!access.allowed) {
        if (access.notFound) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        res.statusCode = access.requiresLogin ? 401 : 403;
        res.end(access.requiresLogin ? 'Sign in required' : 'Password required');
        return;
      }
      const content = await getContent(meta.id);
      if (!content) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      await attachAuth(req);
      const viewResult = await recordView(meta.id, { consumeBurn: meta.burnAfterRead });
      if (viewResult?.meta?.userId && req.auth?.user?.id) {
        incrementUserPasteViews(viewResult.meta.userId, {
          viewerId: req.auth.user.id,
          pasteId: viewResult.meta.id,
        }).catch(() => {});
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(content);
      return;
    }

    const viewMatch = pathname.match(/^\/api\/paste\/([A-Za-z0-9_-]{10,14})\/view$/);
    if (viewMatch && req.method === 'POST') {
      checkRateLimit(`paste-view:${clientIp(req)}:${viewMatch[1]}`, { max: 40, windowMs: 60_000 });
      const meta = await loadAlive(viewMatch[1]);
      if (!meta) return sendJson(res, 404, { error: 'Not found' });
      let viewPassword = '';
      try {
        const body = await readJsonBody(req, 8 * 1024);
        viewPassword = body.password ?? '';
      } catch { /* empty body */ }
      const access = await resolvePasteAccess(req, meta, viewPassword);
      if (!access.allowed) {
        if (access.notFound) return sendJson(res, 404, { error: 'Not found' });
        return sendJson(res, access.requiresLogin ? 401 : 403, {
          error: access.requiresLogin ? 'Sign in required' : 'Password required',
          requiresLogin: access.requiresLogin ?? false,
          requiresPassword: access.requiresPassword ?? false,
        });
      }
      await attachAuth(req);
      const pasteId = viewMatch[1];
      const viewerId = req.auth?.user?.id ?? null;
      const payload = await runCoinTransaction(async () => {
        let countMeta = true;
        if (viewerId) {
          const db = await loadUsersDb();
          const viewer = db.users.find((u) => u.id === viewerId);
          if (viewer) {
            const flagKey = `paste_meta_view_${pasteId.slice(0, 14)}`;
            const act = ensureActivity(viewer);
            if (act.flags[flagKey]) {
              countMeta = false;
            } else {
              act.flags[flagKey] = true;
              viewer.updatedAt = Date.now();
              await saveUsersDb(db);
            }
          }
        }
        if (!countMeta) {
          const meta = await loadAlive(pasteId);
          if (!meta) return null;
          return { views: meta.views ?? 0, burned: false, deduped: true };
        }
        if (!viewerId && !claimGuestView('paste', clientIp(req), pasteId)) {
          const meta = await loadAlive(pasteId);
          if (!meta) return null;
          return { views: meta.views ?? 0, burned: false, deduped: true };
        }
        const result = await recordView(pasteId);
        if (!result) return null;
        return { views: result.meta.views ?? 0, burned: result.burned, deduped: false, meta: result.meta };
      });
      if (!payload) return sendJson(res, 404, { error: 'Not found' });
      if (payload.meta?.userId && viewerId) {
        incrementUserPasteViews(payload.meta.userId, {
          viewerId,
          pasteId: payload.meta.id,
        }).catch(() => {});
      }
      return sendJson(res, 200, {
        views: payload.views,
        burned: payload.burned,
      });
    }

    const forkMatch = pathname.match(/^\/api\/paste\/([A-Za-z0-9_-]{10,14})\/fork$/);
    if (forkMatch && req.method === 'POST') {
      await attachAuth(req);
      const user = requireAuth(req);
      checkRateLimit(`paste-fork:${user.id}`, { max: 30, windowMs: 60_000 });
      const meta = await loadAlive(forkMatch[1]);
      if (!meta) return sendJson(res, 404, { error: 'Not found' });
      if (meta.userId !== user.id) return sendJson(res, 403, { error: 'Not allowed' });
      const content = await getContent(meta.id);
      if (!content) return sendJson(res, 404, { error: 'Not found' });
      return sendJson(res, 200, {
        title: `${meta.title} (fork)`,
        content,
        language: meta.language,
        visibility: meta.visibility === 'public' ? 'public' : 'private',
        sourceId: meta.id,
      });
    }

    const rateMatch = pathname.match(/^\/api\/paste\/([A-Za-z0-9_-]{10,14})\/rate$/);
    if (rateMatch && req.method === 'POST') {
      await attachAuth(req);
      const user = requireAuth(req);
      checkRateLimit(`paste-rate:${user.id}`, { max: 20, windowMs: 60_000 });
      const meta = await loadAlive(rateMatch[1]);
      if (!meta) return sendJson(res, 404, { error: 'Not found' });
      const access = await resolvePasteAccess(req, meta, '');
      if (!access.allowed) {
        if (access.notFound) return sendJson(res, 404, { error: 'Not found' });
        return sendJson(res, 403, { error: 'Not allowed' });
      }
      const body = await readJsonBody(req, 4 * 1024);
      const result = await ratePaste(rateMatch[1], user.id, body.stars);
      return sendJson(res, 200, result);
    }

    const unlockMatch = pathname.match(/^\/api\/paste\/([A-Za-z0-9_-]{10,14})\/unlock$/);
    if (unlockMatch && req.method === 'POST') {
      checkRateLimit(`paste-pw:${clientIp(req)}:${unlockMatch[1]}`, { max: 15, windowMs: 900_000 });
      const meta = await loadAlive(unlockMatch[1]);
      if (!meta) return sendJson(res, 404, { error: 'Not found' });
      if (meta.visibility !== 'protected') {
        return sendJson(res, 400, { error: 'Paste is not password protected' });
      }
      const body = await readJsonBody(req, 8 * 1024);
      const access = await resolvePasteAccess(req, meta, body.password ?? '');
      if (!access.allowed) {
        return sendJson(res, 403, { error: 'Invalid password' });
      }
      const content = await getContent(meta.id);
      const unlockUid = await clientUserId(req);
      return sendJson(res, 200, {
        ...toClientPaste(meta, content, req, { userId: unlockUid }),
      });
    }

    const idMatch = pathname.match(/^\/api\/paste\/([A-Za-z0-9_-]{10,14})$/);
    if (idMatch) {
      const id = idMatch[1];

      if (req.method === 'GET') {
        checkRateLimit(`paste-read:${clientIp(req)}`, { max: 90, windowMs: 60_000 });
        const meta = await loadAlive(id);
        if (!meta) return sendJson(res, 404, { error: 'Not found' });
        const uid = await clientUserId(req);

        const access = await resolvePasteAccess(req, meta, url.searchParams.get('password') ?? '');
        if (!access.allowed) {
          if (access.notFound) return sendJson(res, 404, { error: 'Not found' });
          return sendJson(res, 200, {
            ...toClientMeta(meta, req, { userId: uid }),
            content: null,
            requiresPassword: access.requiresPassword ?? false,
            requiresLogin: access.requiresLogin ?? false,
          });
        }

        const content = await getContent(id);
        return sendJson(res, 200, toClientPaste(meta, content, req, { userId: uid }));
      }

      if (req.method === 'PATCH') {
        await attachAuth(req);
        const user = requireAuth(req);
        checkRateLimit(`paste-update:${user.id}`, { max: 30, windowMs: 60_000 });
        const body = await readJsonBody(req);
        const meta = await updatePaste(id, user.id, body);
        const content = await getContent(id);
        return sendJson(res, 200, toClientPaste(meta, content, req, { includePrivate: true }));
      }

      if (req.method === 'DELETE') {
        await attachAuth(req);
        const user = requireAuth(req);
        checkRateLimit(`paste-delete:${user.id}`, { max: 20, windowMs: 60_000 });
        const result = await deletePaste(id, user.id);
        return sendJson(res, 200, result);
      }
    }

    res.statusCode = 404;
    res.end('Not found');
  } catch (e) {
    if (isRateLimitError(e)) return sendJson(res, 429, { error: 'Too many requests' });
    const msg = e instanceof Error ? e.message : 'Server error';
    const status = msg === 'Not logged in' ? 401
      : msg === 'Permission denied' || msg === 'Not allowed' ? 403
      : msg.includes('too large') || msg.includes('empty') ? 400
      : e instanceof SyntaxError ? 400
      : 500;
    sendJson(res, status, { error: msg });
  }
}

export function createPasteMiddleware() {
  return (req, res, next) => {
    const pathname = req.url?.split('?')[0] ?? '';
    if (pathname.startsWith('/api/paste')) {
      handlePasteRequest(req, res);
      return;
    }
    next();
  };
}