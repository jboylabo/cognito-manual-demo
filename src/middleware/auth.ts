import type { GetUserCommandOutput } from '@aws-sdk/client-cognito-identity-provider'
import { GetUserCommand } from '@aws-sdk/client-cognito-identity-provider'
import type { MiddlewareHandler } from 'hono'
import { cognito } from '../lib/cognito.js'

export type AuthEnv = {
  Variables: {
    user: GetUserCommandOutput
  }
}

export function accessTokenFromHeader(authorization: string | undefined): string | undefined {
  const token = authorization?.split(' ')[1]
  if (!token) return undefined
  return token
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return '不明なエラー'
}

export const verifyToken: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const token = accessTokenFromHeader(c.req.header('Authorization'))
  if (!token) {
    return c.json({ message: 'トークンが提供されていません' }, 401)
  }

  try {
    const data = await cognito.send(new GetUserCommand({ AccessToken: token }))
    c.set('user', data)
    await next()
  } catch (error) {
    return c.json({ message: 'トークンが無効です', error: errorMessage(error) }, 401)
  }
}
