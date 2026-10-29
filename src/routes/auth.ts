import {
  ConfirmSignUpCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { Hono } from 'hono'
import { cognito, cognitoClientId, secretHash } from '../lib/cognito.js'
import { type AuthEnv, accessTokenFromHeader, verifyToken } from '../middleware/auth.js'

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return '不明なエラー'
}

function withoutMetadata<T extends { $metadata?: unknown }>(output: T): Omit<T, '$metadata'> {
  const { $metadata: metadata, ...data } = output
  void metadata
  return data
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

async function readBody(c: { req: { json: () => Promise<unknown> } }): Promise<Record<string, unknown> | undefined> {
  try {
    const body: unknown = await c.req.json()
    if (body === null || typeof body !== 'object' || Array.isArray(body)) return undefined
    return body as Record<string, unknown>
  } catch {
    return undefined
  }
}

export const auth = new Hono<AuthEnv>()

auth.post('/signup', async (c) => {
  const body = await readBody(c)
  const username = body?.username
  const password = body?.password
  const email = body?.email

  if (!isNonEmptyString(username) || !isNonEmptyString(password) || !isNonEmptyString(email)) {
    return c.json(
      { message: 'ユーザー登録に失敗しました', error: 'username, password, email は必須です' },
      400,
    )
  }

  const hash = secretHash(username)

  try {
    const data = await cognito.send(new SignUpCommand({
      ClientId: cognitoClientId,
      Username: username,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: email }],
      ...(hash ? { SecretHash: hash } : {}),
    }))
    return c.json({ message: 'ユーザー登録が成功しました', data: withoutMetadata(data) })
  } catch (error) {
    return c.json({ message: 'ユーザー登録に失敗しました', error: errorMessage(error) }, 400)
  }
})

auth.post('/confirm-signup', async (c) => {
  const body = await readBody(c)
  const username = body?.username
  const code = body?.code

  if (!isNonEmptyString(username) || !isNonEmptyString(code)) {
    return c.json(
      { message: 'ユーザー確認に失敗しました', error: 'username, code は必須です' },
      400,
    )
  }

  const hash = secretHash(username)

  try {
    const data = await cognito.send(new ConfirmSignUpCommand({
      ClientId: cognitoClientId,
      Username: username,
      ConfirmationCode: code,
      ...(hash ? { SecretHash: hash } : {}),
    }))
    return c.json({ message: 'ユーザー確認が成功しました', data: withoutMetadata(data) })
  } catch (error) {
    return c.json({ message: 'ユーザー確認に失敗しました', error: errorMessage(error) }, 400)
  }
})

auth.post('/signin', async (c) => {
  const body = await readBody(c)
  const username = body?.username
  const password = body?.password

  if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
    return c.json(
      { message: 'サインインに失敗しました', error: 'username, password は必須です' },
      400,
    )
  }

  const hash = secretHash(username)

  try {
    const data = await cognito.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: cognitoClientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        ...(hash ? { SECRET_HASH: hash } : {}),
      },
    }))
    return c.json({ message: 'サインインが成功しました', data: withoutMetadata(data) })
  } catch (error) {
    return c.json({ message: 'サインインに失敗しました', error: errorMessage(error) }, 400)
  }
})

auth.post('/logout', async (c) => {
  const token = accessTokenFromHeader(c.req.header('Authorization'))
  if (!token) {
    return c.json({ message: 'トークンが提供されていません' }, 401)
  }

  try {
    await cognito.send(new GlobalSignOutCommand({ AccessToken: token }))
    return c.json({ message: 'ログアウトが成功しました' })
  } catch (error) {
    return c.json({ message: 'ログアウトに失敗しました', error: errorMessage(error) }, 400)
  }
})

auth.get('/protected', verifyToken, (c) => {
  return c.json({
    message: '保護されたルートにアクセスできました',
    user: withoutMetadata(c.get('user')),
  })
})
