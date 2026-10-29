import { parseEncryptionKey } from './crypto.js'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`環境変数 ${name} が設定されていません`)
  }
  return value
}

export type AppEnv = {
  awsRegion: string
  cognitoUserPoolId: string
  cognitoClientId: string
  cognitoClientSecret: string
  databaseUrl: string
  sessionEncryptionKey: Buffer
  port: number
}

export function loadEnv(): AppEnv {
  return {
    awsRegion: required('AWS_REGION'),
    cognitoUserPoolId: required('COGNITO_USER_POOL_ID'),
    cognitoClientId: required('COGNITO_CLIENT_ID'),
    cognitoClientSecret: required('COGNITO_CLIENT_SECRET'),
    databaseUrl: required('DATABASE_URL'),
    sessionEncryptionKey: parseEncryptionKey(required('SESSION_ENCRYPTION_KEY')),
    port: Number(process.env.PORT ?? 3000),
  }
}
