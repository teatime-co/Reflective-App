import keytar from 'keytar';
import { generateKey } from './aesEncryption';

const SERVICE_NAME = 'reflective';

export const KEY_NAMES = {
  AES: 'aes-key',
  HE_PUBLIC: 'he-public-key',
  HE_PRIVATE: 'he-private-key',
} as const;

export async function saveKey(keyName: string, keyData: Buffer | string): Promise<void> {
  const keyString = typeof keyData === 'string' ? keyData : keyData.toString('hex');
  await keytar.setPassword(SERVICE_NAME, keyName, keyString);
}

export async function getKey(keyName: string): Promise<Buffer | null> {
  const keyHex = await keytar.getPassword(SERVICE_NAME, keyName);
  return keyHex ? Buffer.from(keyHex, 'hex') : null;
}

export async function getKeyString(keyName: string): Promise<string | null> {
  return await keytar.getPassword(SERVICE_NAME, keyName);
}

export async function deleteKey(keyName: string): Promise<boolean> {
  return await keytar.deletePassword(SERVICE_NAME, keyName);
}

export async function keyExists(keyName: string): Promise<boolean> {
  const key = await keytar.getPassword(SERVICE_NAME, keyName);
  return key !== null;
}

export async function generateAESKey(): Promise<Buffer> {
  const key = generateKey();
  await saveKey(KEY_NAMES.AES, key);
  return key;
}

export async function getAESKey(): Promise<Buffer | null> {
  return await getKey(KEY_NAMES.AES);
}

export async function deleteAllKeys(): Promise<void> {
  await Promise.all([
    deleteKey(KEY_NAMES.AES),
    deleteKey(KEY_NAMES.HE_PUBLIC),
    deleteKey(KEY_NAMES.HE_PRIVATE),
  ]);
}
