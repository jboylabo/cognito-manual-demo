import { createHmac } from 'node:crypto'
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RevokeTokenCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import {
  CognitoAuthError,
  type CognitoAuthPort,
  type InitiateAuthResult,
} from './cognito-port.js'

export type CognitoEnv = {
  region: string
  clientId: string
  clientSecret: string
}

function isAuthFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = 'name' in error ? String(error.name) : ''
  return (
    name === 'NotAuthorizedException' ||
    name === 'UserNotFoundException' ||
    name === 'InvalidParameterException' ||
    name === 'UserNotConfirmedException'
  )
}

export function createCognitoAuth(env: CognitoEnv): CognitoAuthPort {
  const client = new CognitoIdentityProviderClient({ region: env.region })

  function secretHash(email: string): string {
    return createHmac('sha256', env.clientSecret)
      .update(email + env.clientId)
      .digest('base64')
  }

  return {
    async initiateAuth(input): Promise<InitiateAuthResult> {
      try {
        if (input.authFlow === 'USER_PASSWORD_AUTH') {
          if (!input.password) {
            throw new CognitoAuthError('not_authorized', 'password required')
          }
          const out = await client.send(new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: env.clientId,
            AuthParameters: {
              USERNAME: input.email,
              PASSWORD: input.password,
              SECRET_HASH: secretHash(input.email),
            },
          }))
          if (out.ChallengeName) {
            return { challengeName: out.ChallengeName }
          }
          return {
            accessToken: out.AuthenticationResult?.AccessToken ?? '',
            refreshToken: out.AuthenticationResult?.RefreshToken ?? '',
            expiresIn: out.AuthenticationResult?.ExpiresIn ?? 0,
          }
        }

        if (!input.refreshToken) {
          throw new CognitoAuthError('not_authorized', 'refresh token required')
        }
        const out = await client.send(new InitiateAuthCommand({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: env.clientId,
          AuthParameters: {
            REFRESH_TOKEN: input.refreshToken,
            SECRET_HASH: secretHash(input.email),
          },
        }))
        if (out.ChallengeName) {
          return { challengeName: out.ChallengeName }
        }
        return {
          accessToken: out.AuthenticationResult?.AccessToken ?? '',
          refreshToken: out.AuthenticationResult?.RefreshToken ?? input.refreshToken,
          expiresIn: out.AuthenticationResult?.ExpiresIn ?? 0,
        }
      } catch (error) {
        if (error instanceof CognitoAuthError) throw error
        if (isAuthFailure(error)) {
          throw new CognitoAuthError('not_authorized', 'authentication failed')
        }
        throw new CognitoAuthError('unavailable', 'cognito unavailable')
      }
    },

    async revokeToken(refreshToken) {
      await client.send(new RevokeTokenCommand({
        ClientId: env.clientId,
        ClientSecret: env.clientSecret,
        Token: refreshToken,
      }))
    },
  }
}
