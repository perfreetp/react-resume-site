import CryptoJS from 'crypto-js';

const SHARE_KEY = 'muji-resume-share-key';

export interface SharePayload {
  name: string;
  md: string;
  theme: string;
  color: string;
}

function toUrlSafe(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafe(token: string): string {
  let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64;
}

export function encryptShare(payload: SharePayload): string {
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), SHARE_KEY).toString();
  return toUrlSafe(encrypted);
}

export function decryptShare(token: string): SharePayload | null {
  try {
    const bytes = CryptoJS.AES.decrypt(fromUrlSafe(token), SHARE_KEY);
    const json = bytes.toString(CryptoJS.enc.Utf8);
    if (!json) {
      return null;
    }
    const payload = JSON.parse(json);
    if (typeof payload.md !== 'string') {
      return null;
    }
    return payload;
  } catch (e) {
    return null;
  }
}

export function buildShareLink(payload: SharePayload): string {
  return `${window.location.origin}${window.location.pathname}#/share?data=${encryptShare(payload)}`;
}
