import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as os from 'node:os';
import type { KeystoreData, KeystoreEntry } from './types.js';

const KEYSTORE_DIR = path.join(os.homedir(), '.pal');
const KEYSTORE_FILE = path.join(KEYSTORE_DIR, 'keystore.json');
const SERVICE_NAME = 'pal-mcp';
const ACCOUNT_NAME = 'master-key';

let keytar: typeof import('keytar') | null = null;

async function loadKeytar(): Promise<typeof import('keytar') | null> {
  if (keytar !== null) return keytar;
  try {
    keytar = await import('keytar');
    return keytar;
  } catch {
    return null;
  }
}

function ensureKeystoreDir(): void {
  if (!fs.existsSync(KEYSTORE_DIR)) {
    fs.mkdirSync(KEYSTORE_DIR, { recursive: true, mode: 0o700 });
  }
}

function loadKeystoreData(): KeystoreData {
  ensureKeystoreDir();
  if (!fs.existsSync(KEYSTORE_FILE)) {
    return {
      version: 1,
      masterKeyInKeychain: false,
      secrets: {},
    };
  }
  const raw = fs.readFileSync(KEYSTORE_FILE, 'utf-8');
  return JSON.parse(raw) as KeystoreData;
}

function saveKeystoreData(data: KeystoreData): void {
  ensureKeystoreDir();
  fs.writeFileSync(KEYSTORE_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

async function getMasterKey(): Promise<Buffer> {
  const kt = await loadKeytar();
  const data = loadKeystoreData();

  if (kt && data.masterKeyInKeychain) {
    const stored = await kt.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    if (stored) {
      return Buffer.from(stored, 'hex');
    }
  }

  // Generate new master key
  const newKey = crypto.randomBytes(32);

  if (kt) {
    try {
      await kt.setPassword(SERVICE_NAME, ACCOUNT_NAME, newKey.toString('hex'));
      data.masterKeyInKeychain = true;
      saveKeystoreData(data);
      return newKey;
    } catch {
      // Fall through to file-based storage
    }
  }

  // Fallback: store key in file (less secure but functional)
  const keyFile = path.join(KEYSTORE_DIR, '.master');
  if (fs.existsSync(keyFile)) {
    return Buffer.from(fs.readFileSync(keyFile, 'utf-8'), 'hex');
  }

  fs.writeFileSync(keyFile, newKey.toString('hex'), { mode: 0o600 });
  data.masterKeyInKeychain = false;
  saveKeystoreData(data);
  return newKey;
}

function encrypt(plaintext: string, key: Buffer): KeystoreEntry {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(plaintext, 'utf-8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext,
  };
}

function decrypt(entry: KeystoreEntry, key: Buffer): string {
  const iv = Buffer.from(entry.iv, 'hex');
  const authTag = Buffer.from(entry.authTag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(entry.ciphertext, 'hex', 'utf-8');
  plaintext += decipher.final('utf-8');

  return plaintext;
}

export async function storeSecret(key: string, value: string): Promise<void> {
  const masterKey = await getMasterKey();
  const data = loadKeystoreData();

  data.secrets[key] = encrypt(value, masterKey);
  saveKeystoreData(data);
}

export async function getSecret(key: string): Promise<string | null> {
  const data = loadKeystoreData();
  const entry = data.secrets[key];

  if (!entry) return null;

  const masterKey = await getMasterKey();
  try {
    return decrypt(entry, masterKey);
  } catch {
    return null;
  }
}

export async function deleteSecret(key: string): Promise<boolean> {
  const data = loadKeystoreData();

  if (!data.secrets[key]) return false;

  delete data.secrets[key];
  saveKeystoreData(data);
  return true;
}

export async function listSecretKeys(): Promise<string[]> {
  const data = loadKeystoreData();
  return Object.keys(data.secrets);
}

export async function hasSecret(key: string): Promise<boolean> {
  const data = loadKeystoreData();
  return key in data.secrets;
}

export function getKeystoreInfo(): { path: string; usingKeychain: boolean } {
  const data = loadKeystoreData();
  return {
    path: KEYSTORE_FILE,
    usingKeychain: data.masterKeyInKeychain,
  };
}
