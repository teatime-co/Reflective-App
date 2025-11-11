import SEAL from 'node-seal';
import axios from 'axios';
import { HEContext, HEKeys, EncryptedMetric } from './types';
import { saveKey, getKeyString, KEY_NAMES } from './keyManager';

let sealInstance: any = null;
let context: any = null;
let encoder: any = null;
let encryptor: any = null;
let decryptor: any = null;
let publicKey: any = null;
let secretKey: any = null;

export async function initializeSEAL(): Promise<void> {
  if (sealInstance) return;

  sealInstance = await SEAL();
}

export async function fetchHEContext(backendUrl: string = 'http://localhost:8000'): Promise<HEContext> {
  const response = await axios.get(`${backendUrl}/api/encryption/context`);
  return response.data;
}

export async function initializeContext(heContext: HEContext): Promise<void> {
  await initializeSEAL();

  const schemeType = sealInstance.SchemeType.ckks;
  const securityLevel = sealInstance.SecurityLevel.tc128;

  const parms = sealInstance.EncryptionParameters(schemeType);
  parms.setPolyModulusDegree(heContext.poly_modulus_degree);
  parms.setCoeffModulus(
    sealInstance.CoeffModulus.Create(
      heContext.poly_modulus_degree,
      Int32Array.from(heContext.coeff_mod_bit_sizes)
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
