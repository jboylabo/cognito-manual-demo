import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'

export const SESSION_COOKIE = 'sid'

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
  path: '/',
} as const

export function readSessionCookie(c: Context): string | undefined {
  const value = getCookie(c, SESSION_COOKIE)
  return value || undefined
}

export function writeSessionCookie(c: Context, sessionId: string): void {
  setCookie(c, SESSION_COOKIE, sessionId, cookieOptions)
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, {
    path: '/',
    secure: true,
    sameSite: 'Lax',
  })
}
