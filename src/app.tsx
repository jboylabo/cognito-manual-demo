import { Hono } from 'hono'
import type { CognitoAuthPort } from './lib/cognito-port.js'
import type { SessionStore } from './lib/session-store.js'
import { createSessionMiddleware } from './middleware/session.js'
import { Login } from './pages/Login.js'
import { Me } from './pages/Me.js'
import { createAuthRoutes } from './routes/auth.js'

export type AppDeps = {
  cognito: CognitoAuthPort
  sessions: SessionStore
}

export function createApp(deps: AppDeps) {
  const app = new Hono()
  const requireSession = createSessionMiddleware(deps.cognito, deps.sessions)

  app.get('/', (c) => c.redirect('/login'))
  app.get('/login', (c) => c.html(<Login />))
  app.route('/auth', createAuthRoutes(deps.cognito, deps.sessions))

  app.get('/api/me', requireSession, (c) => {
    const session = c.get('session')
    return c.json({ email: session.email })
  })

  app.get('/me', requireSession, (c) => {
    const session = c.get('session')
    return c.html(<Me email={session.email} />)
  })

  return app
}
