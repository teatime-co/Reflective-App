import type { ConflictVersion, DecryptedConflictVersion, LocalConflict, DecryptedConflict } from '../../types/conflicts';

export async function decryptConflictVersion(
  version: ConflictVersion
): Promise<DecryptedConflictVersion> {
  if (!version.tag) {
    throw new Error('Cannot decrypt conflict version: missing authentication tag');
  }

  const encryptedData = {
    encrypted: version.encryptedContent,
    iv: version.iv,
    authTag: version.tag,
  };

  const result = await window.electronAPI.crypto.aes.decrypt(encryptedData);

  if (!result.success || !result.data) {
    throw new Error('Failed to decrypt conflict version');
  }

  const content = result.data;
  const wordCount = calculateWordCount(content);

  return {
    content,
    updatedAt: version.updatedAt,
    deviceId: version.deviceId,
    wordCount,
  };
}

export async function decryptConflict(conflict: LocalConflict): Promise<DecryptedConflict> {
  const [localDecrypted, remoteDecrypted] = await Promise.all([
    decryptConflictVersion(conflict.localVersion),
    decryptConflictVersion(conflict.remoteVersion),
  ]);

  return {
    id: conflict.id,
    logId: conflict.logId,
    localVersion: localDecrypted,
    remoteVersion: remoteDecrypted,
    detectedAt: conflict.detectedAt,
  };
}

export async function encryptForResolution(
  plaintext: string
): Promise<{ encryptedContent: string; iv: string; tag: string }> {
  const result = await window.electronAPI.crypto.aes.encrypt(plaintext);

  if (!result.success || !result.data) {
    throw new Error('Failed to encrypt content for resolution');
  }

  return {
    encryptedContent: result.data.encrypted,
    iv: result.data.iv,
    tag: result.data.authTag,
  };
}

export function calculateWordCount(text: string): number {
  const cleaned = text
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .trim();

  if (cleaned.length === 0) {
    return 0;
  }

  return cleaned.split(/\s+/).length;
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function formatDeviceId(deviceId: string): string {
  if (deviceId.length <= 8) {
    return deviceId;
  }
  return `${deviceId.substring(0, 8)}...`;
}

export function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

export function getConflictPreview(content: string, maxLength: number = 100): string {
  const plain = stripHtmlTags(content);
  if (plain.length <= maxLength) {
    return plain;
  }
  return plain.substring(0, maxLength) + '...';
}
