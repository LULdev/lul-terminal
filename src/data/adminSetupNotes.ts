/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AdminSetupNote = {
  id: string;
  title: string;
  body: string;
  category: 'deployment' | 'security' | 'database' | 'general';
  envVar?: string;
  highlight?: boolean;
};

export const ADMIN_SETUP_NOTES: AdminSetupNote[] = [
  {
    id: 'trust-proxy',
    title: 'Reverse proxy & rate limits',
    category: 'deployment',
    envVar: 'TRUST_PROXY=1',
    highlight: true,
    body: 'Set TRUST_PROXY=1 in production when the app runs behind a reverse proxy (nginx, Caddy, Cloudflare, Vercel, etc.). Without it, rate limits use the proxy IP instead of the real client — and spoofed X-Forwarded-For headers could bypass limits in dev. With TRUST_PROXY enabled, clientIp() reads the first X-Forwarded-For hop only when the proxy is trusted.',
  },
];