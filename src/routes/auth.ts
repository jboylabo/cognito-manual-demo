import { Hono } from 'hono'
import type { CognitoAuthPort } from '../lib/cognito-port.js'
import { CognitoAuthError } from '../lib/cognito-port.js'
import {
  clearSessionCookie,
  readSessionCookie,
  writeSessionCookie,
} from '../lib/cookies.js'
import { createSessionId, hashSessionId } from '../lib/crypto.js'
import type { SessionStore } from '../lib/session-store.js'

const AUTH_FAILED = { message: 'Authentication failed' }
const AUTH_UNAVAILABLE = { message: 'Authentication service unavailable' }

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isChallenge(result: object): boolean {
  return 'challengeName' in result && typeof result.challengeName === 'string' && result.challengeName.length > 0
}

export function createAuthRoutes(cognito: CognitoAuthPort, sessions: SessionStore) {
  const auth = new Hono()

  auth.post('/login', async (c) => {
    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json(AUTH_FAILED, 401)
    }

    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return c.json(AUTH_FAILED, 401)
    }

    const email = (body as Record<string, unknown>).email
    const password = (body as Record<string, unknown>).password
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return c.json(AUTH_FAILED, 401)
    }

    try {
      const result = await cognito.initiateAuth({
        authFlow: 'USER_PASSWORD_AUTH',
        email,
        password,
      })

      if (isChallenge(result)) {
        return c.json(AUTH_FAILED, 401)
      }
      if (!('accessToken' in result) || !result.accessToken || !result.refreshToken) {
        return c.json(AUTH_FAILED, 401)
      }

      const sessionId = createSessionId()
      await sessions.create({
        sessionIdHash: hashSessionId(sessionId),
        email,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        accessTokenExpiresAt: new Date(Date.now() + result.expiresIn * 1000),
      })
      writeSessionCookie(c, sessionId)
      return c.body(null, 204)
    } catch (error) {
      if (error instanceof CognitoAuthError) {
        if (error.code === 'unavailable') {
          return c.json(AUTH_UNAVAILABLE, 500)
        }
        return c.json(AUTH_FAILED, 401)
      }
      return c.json(AUTH_UNAVAILABLE, 500)
    }
  })

  auth.post('/logout', async (c) => {
    const sid = readSessionCookie(c)
    clearSessionCookie(c)
    if (!sid) {
      return c.body(null, 204)
    }

    const revoked = await sessions.revokeByHash(hashSessionId(sid))
    if (revoked?.refreshToken) {
      try {
        await cognito.revokeToken(revoked.refreshToken)
      } catch {
        // DB 失効は戻さない。トークンはログに出さない。
      }
    }
    return c.body(null, 204)
  })

  return auth
}
