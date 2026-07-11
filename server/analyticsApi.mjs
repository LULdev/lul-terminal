/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { attachAuth, requireAuth } from './auth/authApi.mjs';
import { requireRole } from './auth/authApi.mjs';
import { canAccessAdmin } from './auth/permissions.mjs';
import { wrapAsyncHandler } from './asyncMiddleware.mjs';
import { recordTabVisitFromAnalytics } from './auth/authService.mjs';
import { checkRateLimit, clientIp, isRateLimitError } from './rateLimit.mjs';
import {
  buildAdminOverview,
  buildUserActivitySummary,
  exportAnalyticsBundle,
  listActiveTodayUsers,
  listAdminUserActivity,
  purgeOldEvents,
  recordEvent,
} from './analyticsService.mjs';

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req, limit = 256 * 1024) {
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

export async function handleAnalyticsRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  try {
    if (req.method === 'POST' && pathname === '/api/analytics/track') {
      checkRateLimit(`analytics:${clientIp(req)}`, { max: 90, windowMs: 60_000 });
      const body = await readJsonBody(req);
      await attachAuth(req);

      const eventType = String(body.type ?? '').slice(0, 48);
      const ip = clientIp(req);
      const derivedGuestId = req.auth?.user
        ? null
        : crypto.createHash('sha256').update(`guest:${ip}`).digest('hex').slice(0, 16);
      const event = await recordEvent({
        type: eventType,
        userId: req.auth?.user?.id ?? null,
        username: req.auth?.user?.username ?? null,
        guestId: derivedGuestId,
        sessionId: req.auth?.user ? (body.sessionId ?? null) : derivedGuestId,
        tab: body.tab ?? null,
        meta: body.meta && typeof body.meta === 'object' ? body.meta : {},
      });

      if (eventType === 'tab_visit' && req.auth?.user?.id && body.tab) {
        recordTabVisitFromAnalytics(req.auth.user.id, body.tab).catch(() => {});
      }

      return sendJson(res, 201, { ok: true, eventId: event?.id ?? null, user: null });
    }

    if (req.method === 'GET' && pathname === '/api/analytics/me') {
      await attachAuth(req);
      const user = requireAuth(req);
      checkRateLimit(`analytics-me:${user.id}`, { max: 60, windowMs: 60_000 });
      const summary = await buildUserActivitySummary(user.id);
      if (!summary) return sendJson(res, 404, { error: 'Not found' });
      return sendJson(res, 200, summary);
    }

    const adminRoutes = pathname.startsWith('/api/analytics/admin/');
    if (adminRoutes) {
      await attachAuth(req);
      requireRole(req, canAccessAdmin);
      const adminKey = req.auth?.user?.id ?? clientIp(req);
      checkRateLimit(`analytics-admin:${adminKey}`, { max: 120, windowMs: 60_000 });
    }

    if (req.method === 'GET' && pathname === '/api/analytics/active-today') {
      await attachAuth(req);
      requireRole(req, canAccessAdmin);
      const adminKey = req.auth?.user?.id ?? clientIp(req);
      checkRateLimit(`analytics-admin:${adminKey}`, { max: 120, windowMs: 60_000 });
      const limit = Math.min(Number(url.searchParams.get('limit')) || 48, 80);
      return sendJson(res, 200, await listActiveTodayUsers(limit));
    }

    if (req.method === 'GET' && pathname === '/api/analytics/admin/overview') {
      return sendJson(res, 200, await buildAdminOverview());
    }

    if (req.method === 'GET' && pathname === '/api/analytics/admin/users') {
      const search = url.searchParams.get('search') ?? '';
      const limit = Number(url.searchParams.get('limit')) || 100;
      return sendJson(res, 200, await listAdminUserActivity({ search, limit }));
    }

    if (req.method === 'GET' && pathname === '/api/analytics/admin/export') {
      return sendJson(res, 200, await exportAnalyticsBundle());
    }

    if (req.method === 'POST' && pathname === '/api/analytics/admin/purge') {
      const adminKey = req.auth?.user?.id ?? clientIp(req);
      checkRateLimit(`analytics-admin-act:${adminKey}`, { max: 10, windowMs: 60_000 });
      const body = await readJsonBody(req);
      const keep = Number(body.keep) || 2000;
      return sendJson(res, 200, await purgeOldEvents(keep));
    }

    const userDetail = pathname.match(/^\/api\/analytics\/admin\/users\/([^/]+)$/);
    if (userDetail && req.method === 'GET') {
      const summary = await buildUserActivitySummary(userDetail[1]);
      if (!summary) return sendJson(res, 404, { error: 'User not found' });
      return sendJson(res, 200, summary);
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    const status = isRateLimitError(e)
      ? 429
      : msg === 'Permission denied'
        ? 403
        : msg === 'Not logged in'
          ? 401
          : e instanceof SyntaxError || msg === 'Payload too large'
            ? 400
            : 400;
    return sendJson(res, status, { error: msg });
  }
}

export function createAnalyticsMiddleware() {
  return wrapAsyncHandler((req, res, next) => {
    const pathname = req.url?.split('?')[0] ?? '';
    if (pathname.startsWith('/api/analytics')) {
      return handleAnalyticsRequest(req, res);
    }
    next();
  });
}