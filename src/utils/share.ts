import CryptoJS from 'crypto-js';

export interface SharePayload {
  name: string;
  content: string;
  theme: string;
  color: string;
}

// 将简历正文与主题配置加密后生成只读分享链接，密钥仅存在于链接中
export function createShareLink(payload: SharePayload): string {
  const key = CryptoJS.lib.WordArray.random(16).toString();
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), key).toString();
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/share?data=${encodeURIComponent(encrypted)}&key=${encodeURIComponent(key)}`;
}

export function parseShareLink(search: string): SharePayload | null {
  try {
    const params = new URLSearchParams(search);
    const data = params.get('data');
    const key = params.get('key');
    if (!data || !key) {
      return null;
    }
    const bytes = CryptoJS.AES.decrypt(data, key);
    const text = bytes.toString(CryptoJS.enc.Utf8);
    if (!text) {
      return null;
    }
    const payload = JSON.parse(text);
    if (!payload || typeof payload.content !== 'string') {
      return null;
    }
    return {
      name: payload.name || '简历分享',
      content: payload.content,
      theme: payload.theme || 'default',
      color: payload.color || '#39393a',
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}
