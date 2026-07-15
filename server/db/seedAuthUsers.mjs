/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { hashPassword } from '../auth/crypto.mjs';
import { AUTH_DB_DIR } from './authDatabase.mjs';

function newUserId() {
  return crypto.randomBytes(8).toString('hex');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_FILE = path.join(AUTH_DB_DIR, 'demo-credentials.json');

const DEMO_ADJECTIVES = [
  'Neon', 'Cyber', 'Pixel', 'Shadow', 'Quantum', 'Nova', 'Echo', 'Storm',
  'Frost', 'Blaze', 'Volt', 'Cosmic', 'Rogue', 'Silent', 'Swift', 'Lunar',
];
const DEMO_NOUNS = [
  'Specter', 'Rider', 'Wolf', 'Phoenix', 'Viper', 'Oracle', 'Nomad', 'Cipher',
  'Drifter', 'Hunter', 'Spark', 'Comet', 'Falcon', 'Ghost', 'Pulse', 'Vector',
];

export const ADMIN_USERNAME = 'Administrator';
export const VIP_USERNAME = 'VIPTestUser';
export const DEMO_PASSWORD = 'Test123456';
export const BOT_USERNAME = 'bot';

function randomDemoUsername(used) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const adj = DEMO_ADJECTIVES[crypto.randomInt(DEMO_ADJECTIVES.length)];
    const noun = DEMO_NOUNS[crypto.randomInt(DEMO_NOUNS.length)];
    const num = crypto.randomInt(10, 999);
    const name = `${adj}${noun}${num}`;
    const key = name.toLowerCase();
    if (!used.has(key)) {
      used.add(key);
      return name;
    }
  }
  const fallback = `User${crypto.randomBytes(3).toString('hex')}`;
  used.add(fallback.toLowerCase());
  return fallback;
}

function randomPassword() {
  return crypto.randomBytes(9).toString('base64url').slice(0, 12);
}

function baseUser(overrides) {
  const now = Date.now();
  return {
    id: newUserId(),
    role: 'user',
    active: true,
    verified: false,
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
    lulCoins: 1000,
    chatBanned: false,
    chatMutedUntil: null,
    abuseWarnings: 0,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    ...overrides,
  };
}

export async function buildDefaultAuthUsers() {
  const now = Date.now();
  const adminHash = await hashPassword(DEMO_PASSWORD);
  const vipHash = await hashPassword(DEMO_PASSWORD);
  const botHash = await hashPassword(crypto.randomBytes(32).toString('hex'));

  const credentials = {
    generatedAt: new Date().toISOString(),
    fixedAccounts: [
      { login: ADMIN_USERNAME, password: DEMO_PASSWORD, role: 'admin', email: 'administrator@lul.terminal' },
      { login: VIP_USERNAME, password: DEMO_PASSWORD, role: 'vip', email: 'viptestuser@lul.terminal' },
    ],
    demoUsers: [],
  };

  const users = [
    baseUser({
      username: ADMIN_USERNAME,
      email: 'administrator@lul.terminal',
      passwordHash: adminHash,
      role: 'admin',
      displayName: 'Administrator',
      bio: 'System administrator account.',
      avatarUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=Administrator',
      coverUrl: 'linear-gradient(135deg,#1e1b4b,#312e81,#0f172a)',
      verified: true,
      lulCoins: 5000,
    }),
    baseUser({
      username: VIP_USERNAME,
      email: 'viptestuser@lul.terminal',
      passwordHash: vipHash,
      role: 'vip',
      displayName: 'VIP Test User',
      bio: 'VIP demo account for premium vault access.',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=VIPTestUser',
      coverUrl: 'linear-gradient(135deg,#78350f,#b45309,#0f172a)',
      verified: true,
      lulCoins: 2500,
    }),
    baseUser({
      username: BOT_USERNAME,
      email: 'bot@lul.terminal',
      passwordHash: botHash,
      role: 'bot',
      displayName: 'BOT',
      bio: 'Automated system announcements.',
      avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=bot',
      coverUrl: 'linear-gradient(135deg,#0c4a6e,#0369a1,#0f172a)',
      verified: true,
      achievements: [{ id: 'bot_supreme_nerd', earnedAt: now }],
    }),
  ];

  const usedNames = new Set(users.map((u) => u.username.toLowerCase()));
  for (let i = 0; i < 20; i++) {
    const username = randomDemoUsername(usedNames);
    const password = randomPassword();
    const email = `${username.toLowerCase().replace(/[^a-z0-9]/g, '')}@demo.lul.terminal`;
    users.push(baseUser({
      username,
      email,
      passwordHash: await hashPassword(password),
      displayName: username,
      bio: 'Demo member account.',
      avatarUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(username)}`,
      lulCoins: 500 + crypto.randomInt(0, 1500),
    }));
    credentials.demoUsers.push({ login: username, password, role: 'user', email });
  }

  return { users, credentials };
}

export async function writeDemoCredentials(credentials) {
  await fs.mkdir(AUTH_DB_DIR, { recursive: true });
  await fs.writeFile(CREDENTIALS_FILE, `${JSON.stringify(credentials, null, 2)}\n`, 'utf8');
  return CREDENTIALS_FILE;
}