/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { invalidateSession } from './sessionEvents';

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

/** Credentialed fetch that broadcasts 401 to the global session bus. */
export async function sessionFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    invalidateSession();
    throw new SessionExpiredError();
  }
  return res;
}

export async function sessionJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await sessionFetch(input, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data as T;
}