export interface ConflictVersion {
  encryptedContent: string;
  iv: string;
  tag: string | null;
  updatedAt: number;
  deviceId: string;
}

export interface LocalConflict {
  id: string;
  logId: string;
  localVersion: ConflictVersion;
  remoteVersion: ConflictVersion;
  detectedAt: number;
}

export type ConflictResolution = 'local' | 'remote' | 'merged';

export interface DecryptedConflictVersion {
  content: string;
  updatedAt: number;
  deviceId: string;
  wordCount: number;
}

export interface DecryptedConflict {
  id: string;
  logId: string;
  localVersion: DecryptedConflictVersion;
  remoteVersion: DecryptedConflictVersion;
  detectedAt: number;
}
