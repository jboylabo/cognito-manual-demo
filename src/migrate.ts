import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate as drizzleMigrate } from 'drizzle-orm/postgres-js/migrator'
import type { AppDb } from './lib/session-store.js'

const here = path.dirname(fileURLToPath(import.meta.url))

export async function migrate(db: AppDb): Promise<void> {
  const migrationsFolder = path.resolve(here, '../drizzle')
  await drizzleMigrate(db, { migrationsFolder })
}
