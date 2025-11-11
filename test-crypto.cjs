// Simple test script for crypto module (run with: node test-crypto.js)

const crypto = require('crypto');

console.log('Testing AES-256-GCM Encryption...\n');

// AES Test
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(data, key) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(data.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

  let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Test 1: Basic Encryption/Decryption
console.log('Test 1: Basic AES Encryption/Decryption');
const key = crypto.randomBytes(KEY_LENGTH);
const plaintext = 'Hello, World! This is a secret message.';

console.log('  Original:', plaintext);

const encrypted = encrypt(plaintext, key);
console.log('  Encrypted (hex):', encrypted.encrypted.substring(0, 40) + '...');
console.log('  IV (hex):', encrypted.iv);
console.log('  Auth Tag (hex):', encrypted.authTag);

const decrypted = decrypt(encrypted, key);
console.log('  Decrypted:', decrypted);
console.log('  Match:', plaintext === decrypted ? 'PASS' : 'FAIL');

// Test 2: Large Text
console.log('\nTest 2: Large Text Encryption');
const largeText = 'Lorem ipsum dolor sit amet, '.repeat(100);
console.log('  Text size:', largeText.length, 'characters');

const startTime = Date.now();
const encryptedLarge = encrypt(largeText, key);
const decryptedLarge = decrypt(encryptedLarge, key);
const endTime = Date.now();

console.log('  Time:', endTime - startTime, 'ms');
console.log('  Match:', largeText === decryptedLarge ? 'PASS' : 'FAIL');

// Test 3: Key Generation
console.log('\nTest 3: Key Generation');
for (let i = 0; i < 5; i++) {
  const testKey = crypto.randomBytes(KEY_LENGTH);
  console.log(`  Key ${i + 1} (hex):`, testKey.toString('hex').substring(0, 20) + '...');
}

console.log('\nAll AES encryption tests completed.');

console.log('\nNOTE: HE encryption tests require node-seal library.');
console.log('To test HE encryption, you need to run the Electron app and use the IPC handlers.');
