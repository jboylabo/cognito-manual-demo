import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { Home } from './pages/Home.js'
import { auth } from './routes/auth.js'

const app = new Hono()

app.get('/', (c) => {
  return c.html(<Home />)
})

app.route('/auth', auth)

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
