import { createHmac } from 'node:crypto'
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`環境変数 ${name} が設定されていません`)
  }
  return value
}

const awsRegion = requiredEnv('AWS_REGION')
requiredEnv('COGNITO_USER_POOL_ID')

export const cognitoClientId = requiredEnv('COGNITO_CLIENT_ID')

const cognitoClientSecret = process.env.COGNITO_CLIENT_SECRET

export const cognito = new CognitoIdentityProviderClient({
  region: awsRegion,
})

export function secretHash(username: string): string | undefined {
  if (!cognitoClientSecret) return undefined
  return createHmac('sha256', cognitoClientSecret)
    .update(username + cognitoClientId)
    .digest('base64')
}
