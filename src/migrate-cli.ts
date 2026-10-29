import { createDb } from './db/client.js'
import { loadEnv } from './lib/env.js'
import { migrate } from './migrate.js'

const env = loadEnv()
const { db, client } = createDb(env.databaseUrl)
await migrate(db)
await client.end()
console.log('migrations applied')
