import { ipcMain } from 'electron';
import * as aesEncryption from '../crypto/aesEncryption';
import * as heEncryption from '../crypto/heEncryption';
import * as keyManager from '../crypto/keyManager';
import { EncryptedData } from '../crypto/types';

export function registerCryptoHandlers(): void {
  // AES Encryption
  ipcMain.handle('crypto:aes:encrypt', async (_event, plaintext: string) => {
    try {
      let key = await keyManager.getAESKey();
      if (!key) {
        key = await keyManager.generateAESKey();
      }

      const encrypted = aesEncryption.encrypt(plaintext, key);
      return { success: true, data: encrypted };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('crypto:aes:decrypt', async (_event, encryptedData: EncryptedData) => {
    try {
      const key = await keyManager.getAESKey();
      if (!key) {
        throw new Error('AES key not found. Generate keys first.');
      }

      const decrypted = aesEncryption.decrypt(encryptedData, key);
      return { success: true, data: decrypted };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // HE Encryption
  ipcMain.handle('crypto:he:getContext', async (_event, backendUrl?: string) => {
    try {
      const context = await heEncryption.fetchHEContext(backendUrl);
      return { success: true, data: context };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('crypto:he:initContext', async (_event, heContext: any) => {
    try {
      await heEncryption.initializeContext(heContext);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('crypto:he:encryptMetric', async (_event, metricType: string, value: number) => {
    try {
      const encryptedMetric = await heEncryption.createEncryptedMetric(metricType, value);
      return {
        success: true,
        data: {
          ...encryptedMetric,
          encrypted_value: Array.from(encryptedMetric.encrypted_value)
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('crypto:he:decryptMetric', async (_event, ciphertext: number[]) => {
    try {
      const uint8Array = new Uint8Array(ciphertext);
      const decrypted = await heEncryption.decryptMetric(uint8Array);
      return { success: true, data: decrypted };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Key Management
  ipcMain.handle('crypto:keys:generate', async (_event, backendUrl?: string) => {
    try {
      console.log('[Crypto IPC] Generating AES key...');
      console.log('[Crypto IPC] Backend URL provided:', backendUrl);

      await keyManager.generateAESKey();
      console.log('[Crypto IPC] AES key generated successfully');

      let hePublicKey: string | undefined;

      if (backendUrl) {
        console.log('[Crypto IPC] Attempting HE key generation...');
        try {
          const heContext = await heEncryption.fetchHEContext(backendUrl);
          await heEncryption.initializeContext(heContext);
          const heKeys = await heEncryption.generateHEKeys();
          hePublicKey = heKeys.publicKey;
          console.log('[Crypto IPC] HE keys generated successfully');
        } catch (heError: any) {
          console.warn('[Crypto IPC] HE key generation failed (backend may be offline):', heError.message);
          console.warn('[Crypto IPC] Stack trace:', heError.stack);
        }
      } else {
        console.log('[Crypto IPC] No backend URL provided, skipping HE key generation');
      }

      return {
        success: true,
        data: {
          aesKeyGenerated: true,
          hePublicKey
        }
      };
    } catch (error: any) {
      console.error('[Crypto IPC] FATAL ERROR generating keys:', error.message);
      console.error('[Crypto IPC] Stack trace:', error.stack);
      console.error('[Crypto IPC] Error details:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('crypto:keys:generateHE', async (_event, backendUrl?: string) => {
    try {
      console.log('[Crypto IPC] Starting HE key generation...');
      console.log('[Crypto IPC] Backend URL:', backendUrl || 'default');

      console.log('[Crypto IPC] Step 1: Fetching HE context from backend...');
      const heContext = await heEncryption.fetchHEContext(backendUrl);
      console.log('[Crypto IPC] HE context fetched successfully');
      console.log('[Crypto IPC] Context poly_modulus_degree:', heContext.context_params.poly_modulus_degree);

      console.log('[Crypto IPC] Step 2: Initializing SEAL context...');
      await heEncryption.initializeContext(heContext);
      console.log('[Crypto IPC] SEAL context initialized successfully');

      console.log('[Crypto IPC] Step 3: Generating HE key pair...');
      const heKeys = await heEncryption.generateHEKeys();
      console.log('[Crypto IPC] HE keys generated successfully');
      console.log('[Crypto IPC] Public key length:', heKeys.publicKey.length);

      return {
        success: true,
        data: {
          publicKey: heKeys.publicKey
        }
      };
    } catch (error: any) {
      console.error('[Crypto IPC] HE key generation FAILED');
      console.error('[Crypto IPC] Error message:', error.message);
      console.error('[Crypto IPC] Error stack:', error.stack);
      console.error('[Crypto IPC] Full error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('crypto:keys:load', async (_event) => {
    try {
      const aesKey = await keyManager.getAESKey();
      const heKeysLoaded = await heEncryption.loadHEKeys();

      return {
        success: true,
        data: {
          aesKeyExists: aesKey !== null,
          heKeysLoaded
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('crypto:keys:exists', async (_event, keyName: string) => {
    try {
      const exists = await keyManager.keyExists(keyName);
      return { success: true, data: exists };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('crypto:keys:delete', async (_event, keyName: string) => {
    try {
      const deleted = await keyManager.deleteKey(keyName);
      return { success: true, data: deleted };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('crypto:keys:deleteAll', async (_event) => {
    try {
      await keyManager.deleteAllKeys();
      heEncryption.cleanup();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('crypto:keys:getPublicKey', async (_event) => {
    try {
      const publicKey = await keyManager.getKeyString(keyManager.KEY_NAMES.HE_PUBLIC);
      return { success: true, data: publicKey };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
