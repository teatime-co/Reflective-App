import { ipcMain } from 'electron';
import { getDatabase } from '../database/init';
import type { LocalConflict } from '../../types/conflicts';
import axios from 'axios';
import { getSettings } from '../settings/settingsStore';

export interface ConflictResult {
  success: boolean;
  data?: {
    conflicts?: LocalConflict[];
    conflict?: LocalConflict;
    count?: number;
  };
  error?: string;
}

interface BackendConflictData {
  id: string;
  log_id: string;
  local_version: {
    encrypted_content: string;
    iv: string;
    tag?: string;
    updated_at: string;
    device_id: string;
  };
  remote_version: {
    encrypted_content: string;
    iv: string;
    tag?: string;
    updated_at: string;
    device_id: string;
  };
  detected_at: string;
}

interface BackendConflictsResponse {
  conflicts: BackendConflictData[];
  total_count: number;
}

interface ResolveConflictRequest {
  chosen_version: 'local' | 'remote' | 'merged';
  final_encrypted_content?: string;
  final_iv?: string;
  final_encrypted_embedding?: string;
  final_embedding_iv?: string;
}

async function fetchConflictsFromBackend(): Promise<BackendConflictsResponse> {
  const settings = getSettings();
  const token = settings.authToken;

  if (!token) {
    throw new Error('No auth token available');
  }

  try {
    const response = await axios.get<BackendConflictsResponse>(
      `${settings.backendUrl}/sync/conflicts`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.detail || 'Failed to fetch conflicts from backend');
    }
    throw new Error('Network error during fetch conflicts');
  }
}

async function resolveConflictOnBackend(
  conflictId: string,
  resolution: ResolveConflictRequest
): Promise<void> {
  const settings = getSettings();
  const token = settings.authToken;

  if (!token) {
    throw new Error('No auth token available');
  }

  try {
    await axios.post(
      `${settings.backendUrl}/sync/conflicts/${conflictId}/resolve`,
      resolution,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data?.detail || 'Failed to resolve conflict');
    }
    throw new Error('Network error during resolve conflict');
  }
}

function convertBackendToLocal(backendConflict: BackendConflictData): LocalConflict {
  return {
    id: backendConflict.id,
    logId: backendConflict.log_id,
    localVersion: {
      encryptedContent: backendConflict.local_version.encrypted_content,
      iv: backendConflict.local_version.iv,
      tag: backendConflict.local_version.tag || null,
      updatedAt: new Date(backendConflict.local_version.updated_at).getTime(),
      deviceId: backendConflict.local_version.device_id,
    },
    remoteVersion: {
      encryptedContent: backendConflict.remote_version.encrypted_content,
      iv: backendConflict.remote_version.iv,
      tag: backendConflict.remote_version.tag || null,
      updatedAt: new Date(backendConflict.remote_version.updated_at).getTime(),
      deviceId: backendConflict.remote_version.device_id,
    },
    detectedAt: new Date(backendConflict.detected_at).getTime(),
  };
}

export function registerConflictHandlers(): void {
  ipcMain.handle('conflicts:fetch', async (): Promise<ConflictResult> => {
    try {
      const db = getDatabase();
      const conflicts = db
        .prepare(
          `SELECT * FROM conflicts ORDER BY detected_at DESC`
        )
        .all() as Array<{
          id: string;
          log_id: string;
          local_encrypted_content: string;
          local_iv: string;
          local_tag: string | null;
          local_updated_at: number;
          local_device_id: string;
          remote_encrypted_content: string;
          remote_iv: string;
          remote_tag: string | null;
          remote_updated_at: number;
          remote_device_id: string;
          detected_at: number;
        }>;

      const localConflicts: LocalConflict[] = conflicts.map((c) => ({
        id: c.id,
        logId: c.log_id,
        localVersion: {
          encryptedContent: c.local_encrypted_content,
          iv: c.local_iv,
          tag: c.local_tag,
          updatedAt: c.local_updated_at,
          deviceId: c.local_device_id,
        },
        remoteVersion: {
          encryptedContent: c.remote_encrypted_content,
          iv: c.remote_iv,
          tag: c.remote_tag,
          updatedAt: c.remote_updated_at,
          deviceId: c.remote_device_id,
        },
        detectedAt: c.detected_at,
      }));

      return {
        success: true,
        data: { conflicts: localConflicts },
      };
    } catch (error) {
      console.error('Failed to fetch conflicts from database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('conflicts:fetchFromBackend', async (): Promise<ConflictResult> => {
    try {
      const response = await fetchConflictsFromBackend();
      const db = getDatabase();

      db.prepare('DELETE FROM conflicts').run();

      for (const backendConflict of response.conflicts) {
        const localConflict = convertBackendToLocal(backendConflict);
        db.prepare(
          `INSERT OR REPLACE INTO conflicts (
            id, log_id,
            local_encrypted_content, local_iv, local_tag, local_updated_at, local_device_id,
            remote_encrypted_content, remote_iv, remote_tag, remote_updated_at, remote_device_id,
            detected_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          localConflict.id,
          localConflict.logId,
          localConflict.localVersion.encryptedContent,
          localConflict.localVersion.iv,
          localConflict.localVersion.tag,
          localConflict.localVersion.updatedAt,
          localConflict.localVersion.deviceId,
          localConflict.remoteVersion.encryptedContent,
          localConflict.remoteVersion.iv,
          localConflict.remoteVersion.tag,
          localConflict.remoteVersion.updatedAt,
          localConflict.remoteVersion.deviceId,
          localConflict.detectedAt
        );
      }

      const conflicts = response.conflicts.map(convertBackendToLocal);

      return {
        success: true,
        data: { conflicts },
      };
    } catch (error) {
      console.error('Failed to fetch conflicts from backend:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle(
    'conflicts:resolve',
    async (
      _event,
      conflictId: string,
      resolution: 'local' | 'remote' | 'merged',
      mergedData?: {
        encryptedContent: string;
        iv: string;
        tag: string;
      }
    ): Promise<ConflictResult> => {
      try {
        const resolutionRequest: {
          chosen_version: 'local' | 'remote' | 'merged';
          final_encrypted_content?: string;
          final_iv?: string;
        } = {
          chosen_version: resolution,
        };

        if (resolution === 'merged' && mergedData) {
          resolutionRequest.final_encrypted_content = mergedData.encryptedContent;
          resolutionRequest.final_iv = mergedData.iv;
        }

        await resolveConflictOnBackend(conflictId, resolutionRequest);

        const db = getDatabase();
        db.prepare('DELETE FROM conflicts WHERE id = ?').run(conflictId);

        return {
          success: true,
        };
      } catch (error) {
        console.error('Failed to resolve conflict:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  ipcMain.handle('conflicts:getCount', async (): Promise<ConflictResult> => {
    try {
      const db = getDatabase();
      const result = db.prepare('SELECT COUNT(*) as count FROM conflicts').get() as {
        count: number;
      };

      return {
        success: true,
        data: { count: result.count },
      };
    } catch (error) {
      console.error('Failed to get conflict count:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('conflicts:delete', async (_event, conflictId: string): Promise<ConflictResult> => {
    try {
      const db = getDatabase();
      db.prepare('DELETE FROM conflicts WHERE id = ?').run(conflictId);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Failed to delete conflict:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
