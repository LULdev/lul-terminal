/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { hashPassword } from './crypto.mjs';
import { extractPublicGameStats } from '../gameStatsConfig.mjs';
import { normalizeProfileCustomization } from '../profileCustomization.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..', 'data', 'auth');
const USERS_FILE = path.join(ROOT, 'users.json');
const SESSIONS_FILE = path.join(ROOT, 'sessions.json');

const EMPTY_USERS = { version: 1, updatedAt: null, users: [] };
const EMPTY_SESSIONS = { version: 1, sessions: [] };

export function newUserId() {
  return crypto.randomBytes(8).toString('hex');
}

export async function ensureAuthStore() {
  await fs.mkdir(ROOT, { recursive: true });
  try { await fs.access(USERS_FILE); } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify(EMPTY_USERS, null, 2), 'utf8');
  }
  try { await fs.access(SESSIONS_FILE); } catch {
    await fs.writeFile(SESSIONS_FILE, JSON.stringify(EMPTY_SESSIONS, null, 2), 'utf8');
  }
}

export async function loadUsersDb() {
  await ensureAuthStore();
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    const data = JSON.parse(raw);
    const users = (Array.isArray(data.users) ? data.users : []).map((u) => ({
      ...u,
      verified: Boolean(u.verified),
      profileViews: Number(u.profileViews) || 0,
      website: String(u.website ?? ''),
      socialLinks: Array.isArray(u.socialLinks) ? u.socialLinks : [],
      achievements: Array.isArray(u.achievements) ? u.achievements : [],
      coinLedger: Array.isArray(u.coinLedger)
        ? u.coinLedger
          .filter((e) => e && typeof e === 'object')
          .map((e) => ({
            id: String(e.id ?? ''),
            kind: String(e.kind ?? 'credit').slice(0, 24),
            amount: Math.max(0, Number(e.amount) || 0),
            label: String(e.label ?? '').slice(0, 140),
            icon: String(e.icon ?? '🪙').slice(0, 8),
            at: Number(e.at) || 0,
            meta: e.meta && typeof e.meta === 'object' ? e.meta : undefined,
          }))
          .filter((e) => e.id && e.amount > 0)
        : [],
      referralCode: String(u.referralCode ?? ''),
      referredBy: u.referredBy ?? null,
      referralsCount: Math.max(0, Number(u.referralsCount) || 0),
      imagesUploaded: Math.max(0, Number(u.imagesUploaded) || 0),
      memesCreated: Math.max(0, Number(u.memesCreated) || 0),
      pastesCreated: Math.max(0, Number(u.pastesCreated) || 0),
      pasteViewsTotal: Math.max(0, Number(u.pasteViewsTotal) || 0),
      lulCoins: u.lulCoins != null ? Math.max(0, Number(u.lulCoins) || 0) : 1000,
      ...extractPublicGameStats(u),
      gameJackpotsWon: Math.max(0, Number(u.gameJackpotsWon) || 0),
      gameTotalWon: Math.max(0, Number(u.gameTotalWon) || 0),
      gameTotalLost: Math.max(0, Number(u.gameTotalLost) || 0),
      gameRpsMoves: {
        rock: Math.max(0, Number(u.gameRpsMoves?.rock) || 0),
        paper: Math.max(0, Number(u.gameRpsMoves?.paper) || 0),
        scissors: Math.max(0, Number(u.gameRpsMoves?.scissors) || 0),
      },
      gameLastDailyBonus: u.gameLastDailyBonus ? Number(u.gameLastDailyBonus) : null,
      chatBanned: Boolean(u.chatBanned),
      chatMutedUntil: u.chatMutedUntil ? Number(u.chatMutedUntil) : null,
      abuseWarnings: Math.max(0, Number(u.abuseWarnings) || 0),
      onlineMinutes: Math.max(0, Number(u.onlineMinutes) || 0),
      lastSeenAt: u.lastSeenAt ? Number(u.lastSeenAt) : null,
      profileCustomization: normalizeProfileCustomization(u.profileCustomization),
      activity: u.activity && typeof u.activity === 'object'
        ? {
            loginCount: Math.max(0, Number(u.activity.loginCount) || 0),
            commandsRun: Math.max(0, Number(u.activity.commandsRun) || 0),
            pageVisits: Math.max(0, Number(u.activity.pageVisits) || 0),
            profileVisits: Math.max(0, Number(u.activity.profileVisits) || 0),
            shoutboxSent: Math.max(0, Number(u.activity.shoutboxSent) || 0),
            changelogReads: Math.max(0, Number(u.activity.changelogReads) || 0),
            changelogLastReadVersion: u.activity.changelogLastReadVersion
              ? String(u.activity.changelogLastReadVersion).trim().slice(0, 32)
              : null,
            newsReads: Math.max(0, Number(u.activity.newsReads) || 0),
            newsLastReadVersion: u.activity.newsLastReadVersion
              ? String(u.activity.newsLastReadVersion).trim().slice(0, 32)
              : null,
            tabsVisited: Array.isArray(u.activity.tabsVisited)
              ? u.activity.tabsVisited.map((t) => String(t).slice(0, 24))
              : [],
            flags: u.activity.flags && typeof u.activity.flags === 'object' ? u.activity.flags : {},
          }
        : { loginCount: 0, commandsRun: 0, pageVisits: 0, profileVisits: 0, shoutboxSent: 0, changelogReads: 0, changelogLastReadVersion: null, newsReads: 0, newsLastReadVersion: null, tabsVisited: [], flags: {} },
    }));
    return { ...EMPTY_USERS, ...data, users };
  } catch (err) {
    console.error('[auth] CRITICAL: users.json unreadable — refusing empty fallback', err);
    throw new Error('User database unavailable');
  }
}

async function atomicWriteJson(file, data) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

export async function saveUsersDb(db) {
  await ensureAuthStore();
  db.updatedAt = new Date().toISOString();
  await atomicWriteJson(USERS_FILE, db);
}

let usersWriteChain = Promise.resolve();

/** Serialize users.json read-modify-write to prevent registration/account races. */
export function withUsersWrite(task) {
  const run = usersWriteChain.then(() => task());
  usersWriteChain = run.then(() => undefined, () => undefined);
  return run;
}

export async function loadSessionsDb() {
  await ensureAuthStore();
  try {
    const raw = await fs.readFile(SESSIONS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return { ...EMPTY_SESSIONS, ...data, sessions: Array.isArray(data.sessions) ? data.sessions : [] };
  } catch (err) {
    console.error('[auth] CRITICAL: sessions.json unreadable — refusing empty fallback', err);
    throw new Error('Session database unavailable');
  }
}

let sessionsWriteChain = Promise.resolve();

/** Serialize sessions.json read-modify-write to prevent login/logout races. */
export function withSessionsWrite(task) {
  const run = sessionsWriteChain.then(() => task());
  sessionsWriteChain = run.then(() => undefined, () => undefined);
  return run;
}

export async function saveSessionsDb(db) {
  await ensureAuthStore();
  await atomicWriteJson(SESSIONS_FILE, db);
}

export const BOT_USERNAME = 'bot';

export async function ensureBotUser() {
  const db = await loadUsersDb();
  const existing = db.users.find((u) => u.username === BOT_USERNAME);
  if (existing) {
    let changed = false;
    if (existing.role !== 'bot') {
      existing.role = 'bot';
      existing.displayName = 'BOT';
      changed = true;
    }
    if (!Array.isArray(existing.achievements)) existing.achievements = [];
    if (!existing.achievements.some((a) => a.id === 'bot_supreme_nerd')) {
      existing.achievements.push({ id: 'bot_supreme_nerd', earnedAt: Date.now() });
      changed = true;
    }
    if (changed) {
      existing.updatedAt = Date.now();
      await saveUsersDb(db);
    }
    return existing;
  }

  const now = Date.now();
  const botHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
  const bot = {
    id: newUserId(),
    username: BOT_USERNAME,
    email: 'bot@lul.terminal',
    passwordHash: botHash,
    role: 'bot',
    active: true,
    displayName: 'BOT',
    bio: 'Automated system announcements.',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot',
    coverUrl: 'linear-gradient(135deg,#0c4a6e,#0369a1,#0f172a)',
    verified: true,
    profileViews: 0,
    website: '',
    socialLinks: [],
    achievements: [{ id: 'bot_supreme_nerd', earnedAt: now }],
    referralCode: '',
    referredBy: null,
    referralsCount: 0,
    imagesUploaded: 0,
    memesCreated: 0,
    pastesCreated: 0,
    pasteViewsTotal: 0,
    chatBanned: false,
    chatMutedUntil: null,
    abuseWarnings: 0,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
  };
  db.users.push(bot);
  await saveUsersDb(db);
  return bot;
}

export async function seedDefaultUsersIfEmpty() {
  const db = await loadUsersDb();
  if (db.users.length > 0) {
    await ensureBotUser();
    return db;
  }

  const now = Date.now();
  const seedPw = (envKey, label) => {
    const fromEnv = process.env[envKey];
    if (fromEnv) return fromEnv;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[auth] ${envKey} is required in production`);
    }
    const generated = crypto.randomBytes(12).toString('base64url');
    console.warn(`[auth] Seeded ${label} password — set ${envKey} or change immediately (password not logged).`);
    return generated;
  };
  const adminHash = await hashPassword(seedPw('SEED_ADMIN_PASSWORD', 'admin'));
  const vipHash = await hashPassword(seedPw('SEED_VIP_PASSWORD', 'vip'));

  db.users = [
    {
      id: newUserId(),
      username: 'admin',
      email: 'admin@lul.terminal',
      passwordHash: adminHash,
      role: 'admin',
      active: true,
      displayName: 'System Admin',
      bio: 'Terminal root access.',
      avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=admin',
      coverUrl: 'linear-gradient(135deg,#1e1b4b,#312e81,#0f172a)',
      verified: true,
      profileViews: 0,
      website: '',
      socialLinks: [],
      achievements: [],
      referralCode: '',
      referredBy: null,
      referralsCount: 0,
      imagesUploaded: 0,
      memesCreated: 0,
      pastesCreated: 0,
      pasteViewsTotal: 0,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    },
    {
      id: newUserId(),
      username: 'vipdemo',
      email: 'vip@lul.terminal',
      passwordHash: vipHash,
      role: 'vip',
      active: true,
      displayName: 'VIP Demo',
      bio: 'Premium vault access.',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vip',
      coverUrl: 'linear-gradient(135deg,#78350f,#b45309,#0f172a)',
      verified: true,
      profileViews: 0,
      website: '',
      socialLinks: [],
      achievements: [],
      referralCode: '',
      referredBy: null,
      referralsCount: 0,
      imagesUploaded: 0,
      memesCreated: 0,
      pastesCreated: 0,
      pasteViewsTotal: 0,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    },
  ];

  await saveUsersDb(db);
  await ensureBotUser();
  return db;
}