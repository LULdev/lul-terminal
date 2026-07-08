/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { attachAuth, requireAuth } from './auth/authApi.mjs';
import { requireRole } from './auth/authApi.mjs';
import { canAccessAdmin } from './auth/permissions.mjs';
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
      const event = await recordEvent({
        type: eventType,
        userId: req.auth?.user?.id ?? null,
        username: req.auth?.user?.username ?? null,
        guestId: req.auth?.user ? null : (body.guestId ? String(body.guestId).slice(0, 64) : null),
        sessionId: body.sessionId ?? null,
        tab: body.tab ?? null,
        meta: body.meta ?? {},
      });

      let user = null;
      if (req.auth?.user?.id && eventType === 'tab_visit' && body.tab) {
        const { recordTabVisitFromAnalytics } = await import('./auth/authService.mjs');
        try {
          const result = await recordTabVisitFromAnalytics(req.auth.user.id, body.tab);
          user = result?.user ?? null;
        } catch (err) {
          console.warn('[analytics] recordTabVisitFromAnalytics failed:', err);
        }
      }

      return sendJson(res, 201, { ok: true, eventId: event?.id ?? null, user });
    }

    if (req.method === 'GET' && pathname === '/api/analytics/me') {
      await attachAuth(req);
      requireAuth(req);
      const summary = await buildUserActivitySummary(req.auth.user.id);
      if (!summary) return sendJson(res, 404, { error: 'Not found' });
      return sendJson(res, 200, summary);
    }

    if (req.method === 'GET' && pathname === '/api/analytics/active-today') {
      await attachAuth(req);
      requireRole(req, canAccessAdmin);
      const limit = Math.min(Number(url.searchParams.get('limit')) || 48, 80);
      return sendJson(res, 200, await listActiveTodayUsers(limit));
    }

    const adminRoutes = pathname.startsWith('/api/analytics/admin/');
    if (adminRoutes) {
      await attachAuth(req);
      requireRole(req, canAccessAdmin);
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
  return (req, res, next) => {
    const pathname = req.url?.split('?')[0] ?? '';
    if (pathname.startsWith('/api/analytics')) {
      handleAnalyticsRequest(req, res);
      return;
    }
    next();
  };
}