/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const TRUST_PROXY = process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true';

const TRUSTED_PROXY_IPS = new Set(
  (process.env.TRUSTED_PROXY_IPS ?? '127.0.0.1,::1,::ffff:127.0.0.1')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

function isTrustedProxyHop(remote) {
  if (!remote) return false;
  return TRUSTED_PROXY_IPS.has(remote);
}

function sanitizeProto(raw) {
  const first = String(raw ?? 'http').split(',')[0].trim().toLowerCase();
  return first === 'https' ? 'https' : 'http';
}

function sanitizeHost(raw) {
  const host = String(raw ?? 'localhost:3000').split(',')[0].trim();
  if (!host || /[\s\r\n@]/.test(host)) return 'localhost:3000';
  return host.slice(0, 200);
}

/** Public origin for user-visible URLs — only trusts forwarded headers from trusted proxy hops. */
export function resolvePublicOrigin(req) {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const remote = req.socket?.remoteAddress ?? '';
  const trustForwarded = TRUST_PROXY && isTrustedProxyHop(remote);

  const hostRaw = trustForwarded
    ? (req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000')
    : (req.headers.host || 'localhost:3000');
  const host = sanitizeHost(hostRaw);

  const proto = trustForwarded
    ? sanitizeProto(req.headers['x-forwarded-proto'])
    : (req.socket?.encrypted ? 'https' : 'http');

  return `${proto}://${host}`;
}