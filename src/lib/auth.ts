/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SocialLink } from '../data/achievements';
import type { AuthPermissions, AuthUser, PublicProfile, UserRole } from '../types/auth';
import type { ProfileCustomization } from '../types/profileCustomization';

export type AuthUnlockResponse = {
  user: AuthUser;
  newUnlocks?: string[];
  unlockRewards?: Record<string, number>;
  unlockCoinsTotal?: number;
  permissions?: AuthPermissions;
  stats?: { accountsSubmitted: number };
};

import { invalidateSession } from './sessionEvents';
import { sessionFetch } from './sessionFetch';

const API = '/api/auth';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) invalidateSession();
    const err = new Error(data.error ?? `HTTP ${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export async function fetchMe(): Promise<{
  user: AuthUser | null;
  permissions: AuthPermissions;
  stats: { accountsSubmitted: number } | null;
}> {
  return api('/me');
}

export async function fetchPublicProfile(username: string): Promise<PublicProfile> {
  const uname = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const res = await fetch(`${API}/users/${encodeURIComponent(uname)}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.user as PublicProfile;
}

const PROFILE_VIEW_PREFIX = 'lul_profile_view_';

export async function recordProfileView(username: string): Promise<PublicProfile> {
  const uname = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const sessionKey = `${PROFILE_VIEW_PREFIX}${uname}`;
  if (!sessionStorage.getItem(sessionKey)) {
    try {
      const res = await sessionFetch(`${API}/users/${encodeURIComponent(uname)}/view`, {
        method: 'POST',
      });
      if (res.ok) {
        sessionStorage.setItem(sessionKey, '1');
        const data = await res.json();
        return data.user as PublicProfile;
      }
    } catch { /* fall through */ }
  }
  return fetchPublicProfile(uname);
}

export async function login(email: string, password: string, remember: boolean) {
  return api<AuthUnlockResponse>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, remember }),
  });
}

export type ReferralInfo = {
  referralCode: string;
  referralsCount: number;
  inviteUrl: string;
  user: AuthUser;
};

export async function fetchReferralInfo(): Promise<ReferralInfo> {
  return api<ReferralInfo>('/referral/me');
}

export async function register(input: {
  email: string;
  password: string;
  username?: string;
  displayName?: string;
  referralCode?: string;
  website?: string;
  registrationChallenge?: string;
  registrationContext?: Record<string, string | number>;
}) {
  return api<{ user: AuthUser }>('/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function logout() {
  return api<{ ok: boolean }>('/logout', { method: 'POST' });
}

export async function updateProfile(input: Partial<{
  displayName: string;
  bio: string;
  website: string;
  email: string;
  password: string;
  avatarUrl: string;
  coverUrl: string;
  socialLinks: SocialLink[];
  profileCustomization: Partial<ProfileCustomization> & {
    status?: Partial<ProfileCustomization['status']>;
    privacy?: Partial<ProfileCustomization['privacy']>;
  };
}>) {
  return api<AuthUnlockResponse>('/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function uploadAvatar(file: File): Promise<AuthUnlockResponse> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
  const base64 = dataUrl.split(',')[1] ?? '';
  return api<AuthUnlockResponse>('/avatar', {
    method: 'POST',
    body: JSON.stringify({ mime: file.type, data: base64 }),
  });
}

export type SyncAchievementsOpts = {
  visitedTab?: string;
};

export async function syncAchievements(opts: SyncAchievementsOpts = {}) {
  return api<AuthUnlockResponse>('/achievements/sync', {
    method: 'POST',
    body: JSON.stringify(opts),
  });
}

export async function recordAchievementEvent(event: 'claw_victim' | 'matrix' | 'self_destruct') {
  return api<AuthUnlockResponse>('/achievements/event', {
    method: 'POST',
    body: JSON.stringify({ event }),
  });
}

export async function recordTerminalCommand(command: string) {
  return api<AuthUnlockResponse>('/achievements/terminal-command', {
    method: 'POST',
    body: JSON.stringify({ command }),
  });
}

export async function deleteAccount() {
  return api<{ ok: boolean }>('/account', { method: 'DELETE' });
}

export async function adminListUsers(opts: { search?: string; role?: UserRole | ''; active?: string } = {}) {
  const params = new URLSearchParams();
  if (opts.search?.trim()) params.set('search', opts.search.trim());
  if (opts.role) params.set('role', opts.role);
  if (opts.active) params.set('active', opts.active);
  const q = params.toString();
  return api<{ users: AuthUser[]; total: number }>(`/admin/users${q ? `?${q}` : ''}`);
}

export async function adminCreateUser(input: Record<string, unknown>) {
  return api<{ user: AuthUser }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function adminUpdateUser(id: string, input: Record<string, unknown>) {
  return api<{ user: AuthUser }>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function adminDeleteUser(id: string) {
  return api<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE' });
}