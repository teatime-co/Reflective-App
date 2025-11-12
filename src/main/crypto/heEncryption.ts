import SEAL from 'node-seal';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { HEContext, HEKeys, EncryptedMetric } from './types';
import { saveKey, getKeyString, KEY_NAMES } from './keyManager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let sealInstance: any = null;
let context: any = null;
let encoder: any = null;
let encryptor: any = null;
let decryptor: any = null;
let publicKey: any = null;
let secretKey: any = null;

export async function initializeSEAL(): Promise<void> {
  if (sealInstance) return;

  console.log('[HE] Initializing SEAL...');
  console.log('[HE] __dirname:', __dirname);
  console.log('[HE] process.cwd():', process.cwd());

  sealInstance = await SEAL({
    locateFile: (file: string) => {
      const possiblePaths = [
        path.join(__dirname, file),
        path.join(process.cwd(), 'out', 'main', file),
        path.join(process.cwd(), 'node_modules', 'node-seal', file),
      ];

      console.log('[HE] Searching for WASM file:', file);

      for (const wasmPath of possiblePaths) {
        console.log('[HE] Checking path:', wasmPath);
        if (fs.existsSync(wasmPath)) {
          console.log('[HE] Found WASM file at:', wasmPath);
          return wasmPath;
        }
      }

      console.error('[HE] WASM file not found in any of these locations:');
      possiblePaths.forEach(p => console.error('[HE]   -', p));
      throw new Error(`WASM file not found: ${file}`);
    }
  });

  console.log('[HE] SEAL initialized successfully');
}

export async function fetchHEContext(backendUrl: string = 'http://localhost:8000'): Promise<HEContext> {
  const url = `${backendUrl}/api/encryption/context`;
  console.log('[HE] Fetching context from:', url);

  try {
    const response = await axios.get(url, {
      timeout: 10000
    });
    console.log('[HE] Context response status:', response.status);
    console.log('[HE] Context data:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('[HE] Failed to fetch context from backend');

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Backend not reachable at ${backendUrl}. Is the server running?`);
      }
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`Backend request timed out at ${backendUrl}`);
      }
      if (error.response) {
        throw new Error(`Backend error: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }

    throw error;
  }
}

export async function initializeContext(heContext: HEContext): Promise<void> {
  await initializeSEAL();

  const schemeType = sealInstance.SchemeType.ckks;
  const securityLevel = sealInstance.SecurityLevel.tc128;

  const parms = sealInstance.EncryptionParameters(schemeType);
  parms.setPolyModulusDegree(heContext.context_params.poly_modulus_degree);
  parms.setCoeffModulus(
    sealInstance.CoeffModulus.Create(
      heContext.context_params.poly_modulus_degree,
      Int32Array.from(heContext.context_params.coeff_mod_bit_sizes)
    )
  );

  context = sealInstance.Context(parms, true, securityLevel);

  if (!context.parametersSet()) {
    throw new Error('SEAL context parameters not valid');
  }

  encoder = sealInstance.CKKSEncoder(context);
}

export async function generateHEKeys(): Promise<HEKeys> {
  if (!context) {
    throw new Error('Context not initialized. Call initializeContext first.');
  }

  const keyGenerator = sealInstance.KeyGenerator(context);

  secretKey = keyGenerator.secretKey();
  publicKey = keyGenerator.createPublicKey();

  const publicKeyBase64 = publicKey.save();
  const secretKeyBase64 = secretKey.save();

  await saveKey(KEY_NAMES.HE_PUBLIC, publicKeyBase64);
  await saveKey(KEY_NAMES.HE_PRIVATE, secretKeyBase64);

  encryptor = sealInstance.Encryptor(context, publicKey);
  decryptor = sealInstance.Decryptor(context, secretKey);

  return {
    publicKey: publicKeyBase64,
    privateKey: secretKeyBase64
  };
}

export async function loadHEKeys(): Promise<boolean> {
  if (!context) {
    throw new Error('Context not initialized. Call initializeContext first.');
  }

  const publicKeyStr = await getKeyString(KEY_NAMES.HE_PUBLIC);
  const secretKeyStr = await getKeyString(KEY_NAMES.HE_PRIVATE);

  if (!publicKeyStr || !secretKeyStr) {
    return false;
  }

  publicKey = sealInstance.PublicKey();
  publicKey.load(context, publicKeyStr);

  secretKey = sealInstance.SecretKey();
  secretKey.load(context, secretKeyStr);

  encryptor = sealInstance.Encryptor(context, publicKey);
  decryptor = sealInstance.Decryptor(context, secretKey);

  return true;
}

export async function encryptMetric(value: number, scale: number = Math.pow(2, 40)): Promise<Uint8Array> {
  if (!encryptor || !encoder) {
    throw new Error('Encryptor not initialized. Generate or load keys first.');
  }

  const plainText = encoder.encode(Float64Array.from([value]), scale);
  const cipherText = encryptor.encrypt(plainText);

  const serialized = cipherText.save();
  return Buffer.from(serialized, 'base64');
}

export async function decryptMetric(ciphertext: Uint8Array): Promise<number> {
  if (!decryptor || !encoder) {
    throw new Error('Decryptor not initialized. Generate or load keys first.');
  }

  const cipherText = sealInstance.CipherText();
  cipherText.load(context, Buffer.from(ciphertext).toString('base64'));

  const plainText = decryptor.decrypt(cipherText);
  const decoded = encoder.decode(plainText);

  return decoded[0];
}

export async function createEncryptedMetric(
  metricType: string,
  value: number
): Promise<EncryptedMetric> {
  const encryptedValue = await encryptMetric(value);

  return {
    metric_type: metricType,
    encrypted_value: encryptedValue,
    timestamp: new Date()
  };
}

export function cleanup(): void {
  if (encoder) encoder.delete();
  if (encryptor) encryptor.delete();
  if (decryptor) decryptor.delete();
  if (publicKey) publicKey.delete();
  if (secretKey) secretKey.delete();
  if (context) context.delete();

  encoder = null;
  encryptor = null;
  decryptor = null;
  publicKey = null;
  secretKey = null;
  context = null;
}
