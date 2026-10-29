import { and, eq, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { sessions } from '../db/schema.js'
import * as schema from '../db/schema.js'
import { decryptAesGcm, encryptAesGcm } from './crypto.js'

export type SessionRecord = {
  id: string
  sessionIdHash: string
  email: string
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: Date
  revokedAt: Date | null
}

export type AppDb = PostgresJsDatabase<typeof schema>

export type SessionStore = {
  create(input: {
    sessionIdHash: string
    email: string
    accessToken: string
    refreshToken: string
    accessTokenExpiresAt: Date
  }): Promise<void>
  findByHash(sessionIdHash: string): Promise<SessionRecord | null>
  findActiveByHash(sessionIdHash: string): Promise<SessionRecord | null>
  revokeByHash(sessionIdHash: string): Promise<SessionRecord | null>
  updateTokens(
    sessionIdHash: string,
    input: {
      accessToken: string
      refreshToken: string
      accessTokenExpiresAt: Date
    },
  ): Promise<void>
  clearAll(): Promise<void>
}

export function createSessionStore(db: AppDb, encryptionKey: Buffer): SessionStore {
  function decode(row: typeof sessions.$inferSelect): SessionRecord {
    return {
      id: row.id,
      sessionIdHash: row.sessionIdHash,
      email: row.email,
      accessToken: decryptAesGcm(encryptionKey, row.accessTokenCiphertext),
      refreshToken: decryptAesGcm(encryptionKey, row.refreshTokenCiphertext),
      accessTokenExpiresAt: row.accessTokenExpiresAt,
      revokedAt: row.revokedAt,
    }
  }

  return {
    async create(input) {
      await db.insert(sessions).values({
        sessionIdHash: input.sessionIdHash,
        email: input.email,
        accessTokenCiphertext: encryptAesGcm(encryptionKey, input.accessToken),
        refreshTokenCiphertext: encryptAesGcm(encryptionKey, input.refreshToken),
        accessTokenExpiresAt: input.accessTokenExpiresAt,
      })
    },

    async findByHash(sessionIdHash) {
      const rows = await db.select().from(sessions).where(eq(sessions.sessionIdHash, sessionIdHash)).limit(1)
      const row = rows[0]
      return row ? decode(row) : null
    },

    async findActiveByHash(sessionIdHash) {
      const rows = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.sessionIdHash, sessionIdHash), isNull(sessions.revokedAt)))
        .limit(1)
      const row = rows[0]
      return row ? decode(row) : null
    },

    async revokeByHash(sessionIdHash) {
      const rows = await db
        .update(sessions)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(sessions.sessionIdHash, sessionIdHash), isNull(sessions.revokedAt)))
        .returning()
      const row = rows[0]
      return row ? decode(row) : null
    },

    async updateTokens(sessionIdHash, input) {
      await db
        .update(sessions)
        .set({
          accessTokenCiphertext: encryptAesGcm(encryptionKey, input.accessToken),
          refreshTokenCiphertext: encryptAesGcm(encryptionKey, input.refreshToken),
          accessTokenExpiresAt: input.accessTokenExpiresAt,
          updatedAt: new Date(),
        })
        .where(and(eq(sessions.sessionIdHash, sessionIdHash), isNull(sessions.revokedAt)))
    },

    async clearAll() {
      await db.delete(sessions)
    },
  }
}
