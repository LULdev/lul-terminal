/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { attachAuth, requireRole } from './auth/authApi.mjs';
import { requireMemberTab } from './tabAccessGuard.mjs';
import { canAccessAdmin } from './auth/permissions.mjs';
import { scrapeAllSources, fetchSource } from './proxyScraperEngine.mjs';
import {
  loadCustomProxies,
  loadResults,
  loadScrapePool,
  loadSources,
  loadState,
  proxyEntryKey,
  saveCustomProxies,
  saveResults,
  saveSources,
  saveState,
} from './proxyScraperStore.mjs';
import { dedupeProxies } from './proxyScraperEngine.mjs';
import { parseProxiesFromText } from './proxyParseCore.mjs';
import { checkRateLimit, clientIp, isRateLimitError } from './rateLimit.mjs';

const jobs = new Map();

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req, limit = 4 * 1024 * 1024) {
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

async function requireAdmin(req) {
  await attachAuth(req);
  return requireRole(req, canAccessAdmin);
}

function sanitizeSource(raw, idx = 0) {
  const id = String(raw.id ?? `src-${crypto.randomBytes(4).toString('hex')}`).slice(0, 48);
  const url = String(raw.url ?? '').trim();
  if (!url.startsWith('http')) throw new Error('Invalid URL');
  const type = ['http', 'https', 'socks4', 'socks5'].includes(raw.type) ? raw.type : 'http';
  return {
    id,
    name: String(raw.name ?? `Source ${idx + 1}`).trim().slice(0, 80) || `Source ${idx + 1}`,
    url,
    type,
    repo: String(raw.repo ?? 'custom').slice(0, 40),
  };
}

function buildSourceList(body, allSources) {
  let sources = [...allSources];

  if (body.sourceIds?.length) {
    const ids = new Set(body.sourceIds.map(String));
    sources = sources.filter((s) => ids.has(s.id));
  }

  if (body.customUrls?.length) {
    const custom = body.customUrls.map((u, i) => sanitizeSource({
      id: `custom-${i}-${crypto.randomBytes(3).toString('hex')}`,
      name: `Custom ${i + 1}`,
      url: u,
      type: body.defaultType ?? 'http',
      repo: 'custom',
    }, i));
    sources = [...custom, ...sources];
  }

  return sources;
}

export async function handleProxyScraperRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  try {
    const isAdminRoute =
      (req.method === 'POST' && pathname === '/api/proxy/scrape') ||
      (req.method === 'POST' && pathname === '/api/proxy/sources') ||
      (req.method === 'POST' && pathname === '/api/proxy/test-source') ||
      (req.method === 'POST' && pathname === '/api/proxy/custom') ||
      (req.method === 'DELETE' && pathname === '/api/proxy/custom') ||
      (req.method === 'DELETE' && pathname.startsWith('/api/proxy/custom/')) ||
      (req.method === 'GET' && pathname === '/api/proxy/custom') ||
      (req.method === 'PATCH' && pathname.startsWith('/api/proxy/sources/')) ||
      (req.method === 'DELETE' && pathname.startsWith('/api/proxy/sources/'));

    if (isAdminRoute) {
      await requireAdmin(req);
    }

    if (req.method === 'GET' && pathname === '/api/proxy/sources') {
      checkRateLimit(`proxy-scraper:${clientIp(req)}`, { max: 60, windowMs: 60_000 });
      await requireMemberTab(req, 'proxydatabase');
      const sources = await loadSources();
      return sendJson(res, 200, { count: sources.length, sources });
    }

    if (req.method === 'GET' && pathname === '/api/proxy/stats') {
      checkRateLimit(`proxy-scraper:${clientIp(req)}`, { max: 60, windowMs: 60_000 });
      await requireMemberTab(req, 'proxydatabase');
      const state = await loadState();
      const sources = await loadSources();
      const pool = await loadScrapePool();
      return sendJson(res, 200, {
        ...state,
        sourceCount: sources.length,
        scrapedCount: pool.scrapedCount,
        customCount: pool.customCount,
        poolCount: pool.poolCount,
      });
    }

    if (req.method === 'GET' && pathname === '/api/proxy/results') {
      checkRateLimit(`proxy-scraper:${clientIp(req)}`, { max: 60, windowMs: 60_000 });
      await requireMemberTab(req, 'proxydatabase');
      const pool = await loadScrapePool();
      const state = await loadState();
      return sendJson(res, 200, {
        proxies: pool.proxies,
        checked: pool.checked,
        scrapedCount: pool.scrapedCount,
        customCount: pool.customCount,
        poolCount: pool.poolCount,
        scrapedAt: pool.scrapedAt,
        customUpdatedAt: pool.customUpdatedAt,
        stats: state,
      });
    }

    if (req.method === 'GET' && pathname === '/api/proxy/custom') {
      checkRateLimit(`proxy-scraper:${clientIp(req)}`, { max: 60, windowMs: 60_000 });
      await requireMemberTab(req, 'proxydatabase');
      const custom = await loadCustomProxies();
      return sendJson(res, 200, { count: custom.proxies.length, proxies: custom.proxies, updatedAt: custom.updatedAt });
    }

    if (req.method === 'POST' && pathname === '/api/proxy/custom') {
      const body = await readJsonBody(req);
      const defaultType = ['http', 'https', 'socks4', 'socks5'].includes(body.defaultType) ? body.defaultType : 'http';

      let incoming = [];
      if (body.text?.trim()) {
        incoming = parseProxiesFromText(body.text, defaultType);
      } else if (Array.isArray(body.proxies)) {
        incoming = parseProxiesFromText(
          body.proxies.map((p) => {
            if (typeof p === 'string') return p;
            const type = p.type ?? defaultType;
            return `${type}://${p.host}:${p.port}`;
          }).join('\n'),
          defaultType,
        );
      }

      if (!incoming.length) throw new Error('No valid proxies detected — format: ip:port or type://ip:port');

      const existing = await loadCustomProxies();
      const stamped = incoming.map((p) => ({
        ...p,
        source: 'custom',
        addedAt: Date.now(),
      }));
      const before = existing.proxies.length;
      const merged = dedupeProxies([...existing.proxies, ...stamped], { key: 'type:host:port' });
      await saveCustomProxies(merged.proxies);

      return sendJson(res, 201, {
        added: merged.proxies.length - before,
        skipped: incoming.length - (merged.proxies.length - before),
        count: merged.proxies.length,
        proxies: merged.proxies,
      });
    }

    const customDelete = pathname.match(/^\/api\/proxy\/custom\/([^/]+)$/);
    if (customDelete && req.method === 'DELETE') {
      const key = decodeURIComponent(customDelete[1]);
      const existing = await loadCustomProxies();
      const next = existing.proxies.filter((p) => proxyEntryKey(p) !== key);
      if (next.length === existing.proxies.length) throw new Error('Proxy not found');
      await saveCustomProxies(next);
      return sendJson(res, 200, { ok: true, count: next.length });
    }

    if (req.method === 'DELETE' && pathname === '/api/proxy/custom') {
      await saveCustomProxies([]);
      return sendJson(res, 200, { ok: true, count: 0 });
    }

    const jobMatch = pathname.match(/^\/api\/proxy\/jobs\/([a-f0-9]+)$/);
    if (jobMatch && req.method === 'GET') {
      checkRateLimit(`proxy-scraper-job:${clientIp(req)}`, { max: 120, windowMs: 60_000 });
      await attachAuth(req);
      requireRole(req, canAccessAdmin);
      const job = jobs.get(jobMatch[1]);
      if (!job) return sendJson(res, 404, { error: 'Job not found' });
      return sendJson(res, 200, job);
    }

    if (req.method === 'POST' && pathname === '/api/proxy/sources') {
      const body = await readJsonBody(req);
      const sources = await loadSources();
      const next = sanitizeSource(body, sources.length);
      if (sources.some((s) => s.id === next.id)) throw new Error('ID already taken');
      sources.push(next);
      await saveSources(sources);
      return sendJson(res, 201, { source: next, count: sources.length });
    }

    const patchSource = pathname.match(/^\/api\/proxy\/sources\/([^/]+)$/);
    if (patchSource && req.method === 'PATCH') {
      const body = await readJsonBody(req);
      const sources = await loadSources();
      const idx = sources.findIndex((s) => s.id === patchSource[1]);
      if (idx < 0) throw new Error('Source not found');
      const cur = sources[idx];
      sources[idx] = sanitizeSource({ ...cur, ...body, id: cur.id }, idx);
      await saveSources(sources);
      return sendJson(res, 200, { source: sources[idx] });
    }

    if (patchSource && req.method === 'DELETE') {
      const sources = await loadSources();
      const next = sources.filter((s) => s.id !== patchSource[1]);
      if (next.length === sources.length) throw new Error('Source not found');
      await saveSources(next);
      return sendJson(res, 200, { ok: true, count: next.length });
    }

    if (req.method === 'POST' && pathname === '/api/proxy/scrape') {
      const body = await readJsonBody(req);
      const jobId = crypto.randomBytes(8).toString('hex');
      const job = {
        id: jobId,
        type: 'scrape',
        status: 'running',
        progress: 0,
        total: 0,
        message: 'Starting scrape…',
        logs: [],
        result: null,
        error: null,
      };
      jobs.set(jobId, job);

      (async () => {
        try {
          const allSources = await loadSources();
          const sources = buildSourceList(body, allSources);
          if (!sources.length) throw new Error('No sources selected');

          job.total = sources.length;
          const scraped = await scrapeAllSources(sources, (p) => {
            job.progress = p.current;
            const extra = p.lastCount != null ? ` (+${p.lastCount})` : '';
            job.message = `Scrape ${p.current}/${p.total}: ${p.source}${extra}`;
            const meta = p.lastResult?.format ? ` · ${p.lastResult.format}` : '';
            const disc = p.lastResult?.discovered ? ` · +${p.lastResult.discovered} links` : '';
            if (p.lastCount != null && p.lastCount > 0) {
              job.logs.push(`✓ ${p.source}: ${p.lastCount.toLocaleString('en-US')}${meta}${disc}`);
            } else if (p.lastCount === 0) {
              job.logs.push(`○ ${p.source}: 0${meta}`);
            }
            if (job.logs.length > 250) job.logs.splice(0, job.logs.length - 250);
          }, { concurrency: 16, fetchTimeoutMs: 22000 });

          const ok = scraped.sourceResults.filter((s) => s.ok).length;
          const fail = scraped.sourceResults.length - ok;
          await saveResults({
            proxies: scraped.proxies,
            checked: [],
            sourceResults: scraped.sourceResults,
            scrapedAt: scraped.scrapedAt,
          });

          const prev = await loadState();
          const state = {
            lastScrapeAt: scraped.scrapedAt,
            lastCheckAt: prev.lastCheckAt,
            totalScraped: scraped.proxies.length,
            uniqueProxies: scraped.proxies.length,
            sourcesOk: ok,
            sourcesFailed: fail,
            alive: prev.alive ?? 0,
            dead: prev.dead ?? 0,
            avgLatency: prev.avgLatency ?? 0,
          };
          await saveState(state);

          job.status = 'done';
          job.message = `${scraped.proxies.length.toLocaleString('en-US')} proxies from ${ok}/${sources.length} sources`;
          job.result = { ...state, proxies: scraped.proxies.length, sourceResults: scraped.sourceResults };
        } catch (e) {
          job.status = 'error';
          job.error = e instanceof Error ? e.message : 'Scrape failed';
        }
      })();

      return sendJson(res, 202, { jobId });
    }

    if (req.method === 'POST' && pathname === '/api/proxy/test-source') {
      const body = await readJsonBody(req);
      const source = sanitizeSource(body);
      const result = await fetchSource(source);
      return sendJson(res, 200, { source, result });
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (e) {
    if (isRateLimitError(e)) return sendJson(res, 429, { error: 'Too many requests' });
    const msg = e instanceof Error ? e.message : 'Server error';
    const status =
      msg === 'Permission denied' ? 403 : msg === 'Not logged in' ? 401 : 400;
    return sendJson(res, status, { error: msg });
  }
}

export function createProxyScraperMiddleware() {
  return (req, res, next) => {
    const pathname = req.url?.split('?')[0] ?? '';
    if (pathname.startsWith('/api/proxy')) {
      handleProxyScraperRequest(req, res);
      return;
    }
    next();
  };
}