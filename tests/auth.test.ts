import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createDb } from '../src/db/client.js'
import type {
  CognitoAuthPort,
  InitiateAuthInput,
  InitiateAuthResult,
} from '../src/lib/cognito-port.js'
import { CognitoAuthError } from '../src/lib/cognito-port.js'
import { hashSessionId } from '../src/lib/crypto.js'
import { createSessionStore } from '../src/lib/session-store.js'
import { migrate } from '../src/migrate.js'

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://cognito:cognito@127.0.0.1:5432/cognito'
const ENCRYPTION_KEY = Buffer.from(
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  'hex',
)

function assertNoSecrets(body: string) {
  expect(body).not.toMatch(/access[_-]?token/i)
  expect(body).not.toMatch(/refresh[_-]?token/i)
  expect(body).not.toContain('eyJ')
  expect(body).not.toContain('super-secret-password')
  expect(body).not.toContain('access-token-value')
  expect(body).not.toContain('refresh-token-value')
}

function createStubCognito(handlers: {
  initiateAuth?: (input: InitiateAuthInput) => Promise<InitiateAuthResult>
  revokeToken?: (refreshToken: string) => Promise<void>
}): CognitoAuthPort & { revoked: string[] } {
  const revoked: string[] = []
  return {
    revoked,
    async initiateAuth(input) {
      if (!handlers.initiateAuth) {
        throw new Error('initiateAuth stub not configured')
      }
      return handlers.initiateAuth(input)
    },
    async revokeToken(refreshToken) {
      revoked.push(refreshToken)
      if (handlers.revokeToken) {
        await handlers.revokeToken(refreshToken)
      }
    },
  }
}

describe('auth', () => {
  const { db, client } = createDb(DATABASE_URL)
  const sessions = createSessionStore(db, ENCRYPTION_KEY)

  beforeAll(async () => {
    await migrate(db)
  })

  beforeEach(async () => {
    await sessions.clearAll()
  })

  afterAll(async () => {
    await client.end()
  })

  it('logs in successfully with Set-Cookie and no tokens in body', async () => {
    const cognito = createStubCognito({
      async initiateAuth() {
        return {
          accessToken: 'access-token-value',
          refreshToken: 'refresh-token-value',
          expiresIn: 3600,
        }
      },
    })
    const app = createApp({ cognito, sessions })

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'super-secret-password',
      }),
    })

    expect(res.status).toBe(204)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/sid=/)
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/Secure/i)
    expect(setCookie).toMatch(/SameSite=Lax/i)
    const body = await res.text()
    expect(body).toBe('')
    assertNoSecrets(body)
    assertNoSecrets(setCookie.replace(/sid=[^;]+/, 'sid=redacted'))
  })

  it('returns the same 401 for authentication failures without leaking secrets', async () => {
    const cognito = createStubCognito({
      async initiateAuth() {
        throw new CognitoAuthError('not_authorized', 'NotAuthorizedException')
      },
    })
    const app = createApp({ cognito, sessions })

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'missing@example.com',
        password: 'super-secret-password',
      }),
    })

    expect(res.status).toBe(401)
    const body = await res.text()
    assertNoSecrets(body)
    expect(body).not.toMatch(/not found|does not exist|user/i)
  })

  it('returns 401 when access or refresh token is missing', async () => {
    const cognito = createStubCognito({
      async initiateAuth() {
        return {
          accessToken: 'access-token-value',
          refreshToken: '',
          expiresIn: 3600,
        }
      },
    })
    const app = createApp({ cognito, sessions })

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'super-secret-password',
      }),
    })

    expect(res.status).toBe(401)
    assertNoSecrets(await res.text())
  })

  it('returns 401 for NEW_PASSWORD_REQUIRED without completing the challenge', async () => {
    const cognito = createStubCognito({
      async initiateAuth() {
        return { challengeName: 'NEW_PASSWORD_REQUIRED' }
      },
    })
    const app = createApp({ cognito, sessions })

    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'super-secret-password',
      }),
    })

    expect(res.status).toBe(401)
    assertNoSecrets(await res.text())
  })

  it('revokes the refresh token on logout after invalidating the DB session', async () => {
    const cognito = createStubCognito({
      async initiateAuth() {
        return {
          accessToken: 'access-token-value',
          refreshToken: 'refresh-token-value',
          expiresIn: 3600,
        }
      },
    })
    const app = createApp({ cognito, sessions })

    const loginRes = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'super-secret-password',
      }),
    })
    expect(loginRes.status).toBe(204)
    const setCookie = loginRes.headers.get('set-cookie') ?? ''
    const sidMatch = setCookie.match(/sid=([^;]+)/)
    expect(sidMatch).not.toBeNull()
    const sid = decodeURIComponent(sidMatch![1])

    const logoutRes = await app.request('/auth/logout', {
      method: 'POST',
      headers: { Cookie: `sid=${sid}` },
    })
    expect(logoutRes.status).toBe(204)
    expect(cognito.revoked).toEqual(['refresh-token-value'])

    const row = await sessions.findByHash(hashSessionId(sid))
    expect(row).not.toBeNull()
    expect(row!.revokedAt).not.toBeNull()

    assertNoSecrets(await logoutRes.text())
  })
})
