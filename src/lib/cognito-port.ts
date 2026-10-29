export type InitiateAuthInput = {
  authFlow: 'USER_PASSWORD_AUTH' | 'REFRESH_TOKEN_AUTH'
  email: string
  password?: string
  refreshToken?: string
}

export type InitiateAuthSuccess = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type InitiateAuthChallenge = {
  challengeName: string
}

export type InitiateAuthResult = InitiateAuthSuccess | InitiateAuthChallenge

export type CognitoAuthErrorCode = 'not_authorized' | 'unavailable'

export class CognitoAuthError extends Error {
  readonly code: CognitoAuthErrorCode

  constructor(code: CognitoAuthErrorCode, message: string) {
    super(message)
    this.name = 'CognitoAuthError'
    this.code = code
  }
}

export type CognitoAuthPort = {
  initiateAuth(input: InitiateAuthInput): Promise<InitiateAuthResult>
  revokeToken(refreshToken: string): Promise<void>
}
