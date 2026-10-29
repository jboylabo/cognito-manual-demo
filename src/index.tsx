import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { createDb } from './db/client.js'
import { createCognitoAuth } from './lib/cognito.js'
import { loadEnv } from './lib/env.js'
import { createSessionStore } from './lib/session-store.js'
import { migrate } from './migrate.js'

const env = loadEnv()
const { db, client } = createDb(env.databaseUrl)
await migrate(db)

const app = createApp({
  cognito: createCognitoAuth({
    region: env.awsRegion,
    clientId: env.cognitoClientId,
    clientSecret: env.cognitoClientSecret,
  }),
  sessions: createSessionStore(db, env.sessionEncryptionKey),
})

serve({
  fetch: app.fetch,
  port: env.port,
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})

process.on('SIGINT', async () => {
  await client.end()
  process.exit(0)
})
