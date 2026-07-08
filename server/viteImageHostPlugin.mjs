/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createServerMiddleware } from './serverMiddleware.mjs';

export function viteImageHostPlugin() {
  return {
    name: 'lul-server-api',
    configureServer(server) {
      server.middlewares.use(createServerMiddleware());
    },
  };
}