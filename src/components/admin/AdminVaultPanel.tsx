/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Crown, RefreshCw, Search } from 'lucide-react';
import {
  fetchPremiumAccounts,
  fetchPremiumAccountStats,
  type PremiumAccount,
  type PremiumAccountStats,
} from '../../lib/premiumAccounts';
import {
  PLAN_LABELS,
  PREMIUM_CATEGORY_LABELS,
  STATUS_LABELS,
  type PremiumAccountCategory,
  type PremiumAccountStatus,
} from '../../data/premiumAccounts';
import { ToolCard } from '../pages/PageShell';

const STATUS_COLORS: Record<string, string> = {
  working: 'text-emerald-400',
  working_free: 'text-cyan-300',
  offline: 'text-rose-400',
  expired: 'text-amber-400',
  unchecked: 'text-slate-500',
};

export function AdminVaultPanel() {
  const [stats, setStats] = useState<PremiumAccountStats | null>(null);
  const [accounts, setAccounts] = useState<PremiumAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PremiumAccountCategory | 'all'>('all');
  const [status, setStatus] = useState<PremiumAccountStatus | 'all'>('all');
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const revealed = accounts.find((a) => a.id === revealedId) ?? null;

  const load = useCallback(async () => {
    setError('');
    try {
      const [s, data] = await Promise.all([
        fetchPremiumAccountStats(),
        fetchPremiumAccounts({ search, category, status }),
      ]);
      setStats(s);
      setAccounts(data.accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [search, category, status]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => { void load(); }, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const copyCreds = async (a: PremiumAccount) => {
    const text = `${a.service}\t${a.email}\t${a.password}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      <p className="text-[9px] font-mono text-slate-500">
        Premium Vault Explorer — full account inventory, filters & credential preview.
      </p>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: 'Total', value: stats.total, accent: 'text-slate-200' },
            { label: 'Working', value: stats.working, accent: 'text-emerald-400' },
            { label: 'Offline', value: stats.offline, accent: 'text-rose-400' },
            { label: 'Pending', value: stats.pending ?? 0, accent: 'text-amber-300' },
            { label: 'Categories', value: stats.activeCategories, accent: 'text-violet-300' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-800/80 bg-black/25 px-3 py-2 text-center">
              <div className="text-[7px] font-mono uppercase text-slate-600">{s.label}</div>
              <div className={`text-sm font-mono font-bold ${s.accent}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" size={12} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Service, email…"
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-800 bg-black/40 text-[10px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PremiumAccountCategory | 'all')}
          className="px-2 py-2 rounded-lg border border-slate-800 bg-black/40 text-[10px] font-mono text-slate-300"
        >
          <option value="all">All categories</option>
          {(Object.keys(PREMIUM_CATEGORY_LABELS) as PremiumAccountCategory[]).map((c) => (
            <option key={c} value={c}>{PREMIUM_CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as PremiumAccountStatus | 'all')}
          className="px-2 py-2 rounded-lg border border-slate-800 bg-black/40 text-[10px] font-mono text-slate-300"
        >
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABELS) as PremiumAccountStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button type="button" onClick={() => void load()} className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-amber-300">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <div className="text-[9px] font-mono text-rose-400">{error}</div>}

      <ToolCard title="Accounts" icon="👑" accent="amber">
        <div className="overflow-x-auto">
          <table className="w-full text-[9px] font-mono">
            <thead>
              <tr className="text-slate-600 border-b border-slate-800/80">
                <th className="text-left py-2 pr-2">Service</th>
                <th className="text-left py-2 pr-2">Category</th>
                <th className="text-left py-2 pr-2">Status</th>
                <th className="text-left py-2 pr-2">Plan</th>
                <th className="text-left py-2 pr-2">Views</th>
                <th className="text-right py-2">Act</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-b border-slate-800/40 hover:bg-white/[0.02] group">
                  <td className="py-2 pr-2">
                    <div className="text-slate-200 flex items-center gap-1">
                      {a.vip && <Crown size={10} className="text-amber-400" />}
                      {a.service}
                    </div>
                    <div className="text-slate-600 truncate max-w-[140px]">{a.email}</div>
                  </td>
                  <td className="py-2 pr-2 text-slate-500">{PREMIUM_CATEGORY_LABELS[a.category]}</td>
                  <td className={`py-2 pr-2 ${STATUS_COLORS[a.status] ?? 'text-slate-400'}`}>
                    {STATUS_LABELS[a.status]}
                  </td>
                  <td className="py-2 pr-2 text-slate-500">{a.plan ? PLAN_LABELS[a.plan] : '—'}</td>
                  <td className="py-2 pr-2 text-cyan-300/80">{a.views ?? 0}</td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setRevealedId(revealedId === a.id ? null : a.id)}
                      className="text-[8px] text-violet-400/70 hover:text-violet-300 mr-1"
                    >
                      {revealedId === a.id ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyCreds(a)}
                      className="p-1 rounded border border-slate-700 text-slate-500 hover:text-amber-300 opacity-0 group-hover:opacity-100"
                    >
                      <Copy size={10} />
                    </button>
                  </td>
                </tr>
              ))}
              {!accounts.length && !loading && (
                <tr><td colSpan={6} className="py-6 text-center text-slate-600">No accounts</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </ToolCard>

      {revealed && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-[9px] font-mono text-amber-200/90">
          <span className="text-amber-400/80">{revealed.service}:</span> {revealed.email} : {revealed.password}
        </div>
      )}
    </div>
  );
}