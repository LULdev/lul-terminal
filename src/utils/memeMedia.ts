/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function decodeMemeName(name: string) {
  return name
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

/** Proxy imgflip CDN through Vite dev server to avoid canvas CORS taint. */
export function memeMediaUrl(url: string) {
  if (url.startsWith('https://i.imgflip.com/')) {
    return url.replace('https://i.imgflip.com', '/imgflip-cdn');
  }
  if (url.startsWith('//i.imgflip.com/')) {
    return url.replace('//i.imgflip.com', '/imgflip-cdn');
  }
  return url;
}