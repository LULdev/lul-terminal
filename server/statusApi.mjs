/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { wrapAsyncHandler } from './asyncMiddleware.mjs';
import { buildSystemStatus } from './statusService.mjs';
import { checkRateLimit, clientIp, isRateLimitError } from './rateLimit.mjs';

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=10');
  res.end(JSON.stringify(body));
}

export async function handleStatusRequest(req, res) {
  const pathname = req.url?.split('?')[0] ?? '';
  if (req.method !== 'GET' || pathname !== '/api/status') {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  try {
    checkRateLimit(`status:${clientIp(req)}`, { max: 60, windowMs: 60_000 });
    sendJson(res, 200, await buildSystemStatus());
  } catch (e) {
    if (isRateLimitError(e)) return sendJson(res, 429, { error: 'Too many requests' });
    const msg = e instanceof Error ? e.message : 'Server error';
    sendJson(res, 500, { error: msg });
  }
}

export function createStatusMiddleware() {
  return wrapAsyncHandler((req, res, next) => {
    const pathname = req.url?.split('?')[0] ?? '';
    if (pathname === '/api/status') {
      return handleStatusRequest(req, res);
    }
    next();
  });
}