import type { NetworkState } from './App';

async function readJson<T>(input: Response) {
  if (!input.ok) {
    throw new Error(`Request failed with ${input.status}`);
  }
  return (await input.json()) as T;
}

export async function fetchState() {
  const res = await fetch('/api/emojireso');
  return readJson<NetworkState>(res);
}

export async function pushEmojis(emojis: string[]) {
  const res = await fetch('/api/emojireso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emojis })
  });
  return readJson<NetworkState>(res);
}

export async function resetState() {
  const res = await fetch('/api/emojireso/reset', { method: 'POST' });
  if (!res.ok) throw new Error('Reset failed');
}
