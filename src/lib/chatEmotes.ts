/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const API = '/api/chat/emotes';

export type ChatEmote = {
  id: string;
  code: string;
  label: string;
  url: string;
  enabled: boolean;
  isPlaceholder?: boolean;
};

export type ChatEmotesResponse = {
  updatedAt: string | null;
  emotes: ChatEmote[];
};

export async function fetchChatEmotes(): Promise<ChatEmotesResponse> {
  const res = await fetch(API);
  if (!res.ok) throw new Error('Emotes unavailable');
  return res.json() as Promise<ChatEmotesResponse>;
}

export function emoteToken(code: string): string {
  return `:${code}:`;
}