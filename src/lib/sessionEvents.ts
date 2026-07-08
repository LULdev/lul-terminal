/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

type SessionListener = () => void;

const listeners = new Set<SessionListener>();

export function onSessionInvalidated(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function invalidateSession(): void {
  for (const listener of listeners) listener();
}