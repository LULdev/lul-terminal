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

/** Public origin for user-visible URLs — only trusts forwarded headers from trusted proxy hops. */
export function resolvePublicOrigin(req) {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const remote = req.socket?.remoteAddress ?? '';
  const trustForwarded = TRUST_PROXY && isTrustedProxyHop(remote);

  const hostRaw = trustForwarded
    ? (req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000')
    : (req.headers.host || 'localhost:3000');
  const host = String(hostRaw).split(',')[0].trim();

  const proto = trustForwarded
    ? (req.headers['x-forwarded-proto'] || 'http')
    : (req.socket?.encrypted ? 'https' : 'http');

  return `${proto}://${host}`;
}