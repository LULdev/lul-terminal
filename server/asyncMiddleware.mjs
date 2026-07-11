/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Wrap async API handlers so unexpected rejections return 500 instead of hanging. */
export function wrapAsyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch((e) => {
      if (res.headersSent) return;
      const msg = e instanceof Error ? e.message : 'Server error';
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: msg }));
    });
  };
}