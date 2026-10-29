import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

export function createSessionId(): string {
  return randomBytes(32).toString('base64url')
}

export function hashSessionId(sessionId: string): string {
  return createHash('sha256').update(sessionId).digest('hex')
}

export function parseEncryptionKey(hex: string): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('SESSION_ENCRYPTION_KEY は 64 桁の hex（32 byte）である必要があります')
  }
  return Buffer.from(hex, 'hex')
}

export function encryptAesGcm(key: Buffer, plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64url')
}

export function decryptAesGcm(key: Buffer, payload: string): string {
  const buf = Buffer.from(payload, 'base64url')
  if (buf.length < 28) {
    throw new Error('暗号文が不正です')
  }
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
