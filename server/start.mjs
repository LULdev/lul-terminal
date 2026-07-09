/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { isTrustProxyEnabled } from './loadEnv.mjs';
import { createServerMiddleware } from './serverMiddleware.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');
const port = Number(process.env.PORT) || 3000;

const app = express();
if (isTrustProxyEnabled()) {
  app.set('trust proxy', 1);
}
app.use(createServerMiddleware());
app.use(express.static(dist));

app.get('/i/:id', (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

app.get('/p/:id', (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

app.get('/profile/:username', (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/hosting/')) return next();
  res.sendFile(path.join(dist, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`LUL Terminal + Image Host → http://localhost:${port}`);
});