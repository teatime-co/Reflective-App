import type { Entry } from '../../types/database';

export interface EncryptedEntry {
  id: string;
  encrypted_content: string;
  iv: string;
  auth_tag: string;
  word_count: number;
  sentiment_score: number;
  created_at: number;
  updated_at: number;
  device_id: string | null;
}

export async function encryptEntry(entry: Entry): Promise<EncryptedEntry> {
  const encryptResult = await window.electronAPI.crypto.aes.encrypt(entry.content);

  if (!encryptResult.success || !encryptResult.data) {
    throw new Error(encryptResult.error || 'Encryption failed');
  }

  return {
    id: entry.id,
    encrypted_content: encryptResult.data.encrypted,
    iv: encryptResult.data.iv,
    auth_tag: encryptResult.data.authTag,
    word_count: entry.word_count,
    sentiment_score: entry.sentiment_score,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    device_id: entry.device_id,
  };
}

export async function decryptEntry(encryptedEntry: EncryptedEntry): Promise<Entry> {
  const decryptResult = await window.electronAPI.crypto.aes.decrypt({
    encrypted: encryptedEntry.encrypted_content,
    iv: encryptedEntry.iv,
    authTag: encryptedEntry.auth_tag,
  });

  if (!decryptResult.success || !decryptResult.data) {
    throw new Error(decryptResult.error || 'Decryption failed');
  }

  return {
    id: encryptedEntry.id,
    content: decryptResult.data,
    word_count: encryptedEntry.word_count,
    sentiment_score: encryptedEntry.sentiment_score,
    created_at: encryptedEntry.created_at,
    updated_at: encryptedEntry.updated_at,
    device_id: encryptedEntry.device_id,
    embedding: null,
    synced_at: null,
  };
}

export async function hasEncryptionKey(): Promise<boolean> {
  const result = await window.electronAPI.crypto.keys.exists('aes-key');
  return result.success && result.data === true;
}

export async function generateKeys(backendUrl?: string): Promise<boolean> {
  const result = await window.electronAPI.crypto.keys.generate(backendUrl);
  return result.success;
}

export async function generateHEKeys(backendUrl?: string): Promise<boolean> {
  const result = await window.electronAPI.crypto.keys.generateHE(backendUrl);
  return result.success;
}

export async function deleteAllKeys(): Promise<boolean> {
  const result = await window.electronAPI.crypto.keys.deleteAll();
  return result.success;
}
