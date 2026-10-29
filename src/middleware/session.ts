import type { MiddlewareHandler } from 'hono'
import type { CognitoAuthPort } from '../lib/cognito-port.js'
import { CognitoAuthError } from '../lib/cognito-port.js'
import { readSessionCookie } from '../lib/cookies.js'
import { hashSessionId } from '../lib/crypto.js'
import type { SessionRecord, SessionStore } from '../lib/session-store.js'

export type SessionEnv = {
  Variables: {
    session: SessionRecord
  }
}

const REFRESH_SKEW_MS = 60_000

function isChallenge(result: object): boolean {
  return 'challengeName' in result && typeof result.challengeName === 'string' && result.challengeName.length > 0
}

export function createSessionMiddleware(
  cognito: CognitoAuthPort,
  sessions: SessionStore,
): MiddlewareHandler<SessionEnv> {
  return async (c, next) => {
    const sid = readSessionCookie(c)
    if (!sid) {
      return c.json({ message: 'Authentication failed' }, 401)
    }

    const hash = hashSessionId(sid)
    let session = await sessions.findActiveByHash(hash)
    if (!session) {
      return c.json({ message: 'Authentication failed' }, 401)
    }

    const refreshAt = session.accessTokenExpiresAt.getTime() - REFRESH_SKEW_MS
    if (Date.now() >= refreshAt) {
      try {
        const refreshed = await cognito.initiateAuth({
          authFlow: 'REFRESH_TOKEN_AUTH',
          email: session.email,
          refreshToken: session.refreshToken,
        })
        if (isChallenge(refreshed) || !('accessToken' in refreshed) || !refreshed.accessToken) {
          await sessions.revokeByHash(hash)
          return c.json({ message: 'Authentication failed' }, 401)
        }
        const refreshToken = refreshed.refreshToken || session.refreshToken
        if (!refreshToken) {
          await sessions.revokeByHash(hash)
          return c.json({ message: 'Authentication failed' }, 401)
        }
        const accessTokenExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000)
        await sessions.updateTokens(hash, {
          accessToken: refreshed.accessToken,
          refreshToken,
          accessTokenExpiresAt,
        })
        session = {
          ...session,
          accessToken: refreshed.accessToken,
          refreshToken,
          accessTokenExpiresAt,
        }
      } catch (error) {
        await sessions.revokeByHash(hash)
        if (error instanceof CognitoAuthError && error.code === 'unavailable') {
          return c.json({ message: 'Authentication service unavailable' }, 500)
        }
        return c.json({ message: 'Authentication failed' }, 401)
      }
    }

    c.set('session', session)
    await next()
  }
}
