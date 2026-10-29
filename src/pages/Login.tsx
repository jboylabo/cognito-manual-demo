import type { FC } from 'hono/jsx'

const clientScript = `
const statusEl = document.getElementById('status')
const sessionEl = document.getElementById('session')
const form = document.getElementById('login-form')
const logoutBtn = document.getElementById('logout-btn')

function setStatus(text, ok) {
  statusEl.textContent = text
  statusEl.dataset.ok = ok ? '1' : '0'
}

async function refreshSession() {
  try {
    const res = await fetch('/api/me')
    if (!res.ok) {
      sessionEl.dataset.state = 'out'
      sessionEl.textContent = 'Signed out'
      logoutBtn.disabled = true
      return
    }
    const data = await res.json()
    sessionEl.dataset.state = 'in'
    sessionEl.textContent = 'Signed in as ' + data.email
    logoutBtn.disabled = false
  } catch (_) {
    sessionEl.dataset.state = 'out'
    sessionEl.textContent = 'Signed out'
    logoutBtn.disabled = true
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const fd = new FormData(e.target)
  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: fd.get('email'),
        password: fd.get('password'),
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Authentication failed')
    }
    location.assign('/me')
  } catch (err) {
    setStatus(err.message || 'Authentication failed', false)
  }
})

logoutBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/auth/logout', { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Logout failed')
    }
    setStatus('Signed out', true)
    form.reset()
    await refreshSession()
  } catch (err) {
    setStatus(err.message || 'Logout failed', false)
  }
})

refreshSession()
`

export const Login: FC = () => {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Login</title>
        <style>{`
          :root {
            --ink: #111;
            --muted: #5c5c5c;
            --line: #d8d8d8;
            --bg: #f3f1ec;
            --danger: #8b1e1e;
            --ok: #1d5c34;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(160deg, #ebe7df 0%, var(--bg) 50%, #ddd7cc 100%);
            color: var(--ink);
          }
          main {
            max-width: 24rem;
            margin: 0 auto;
            padding: 3rem 1.25rem;
          }
          h1 {
            margin: 0 0 0.5rem;
            font-family: 'IBM Plex Serif', Georgia, serif;
            font-size: 2rem;
          }
          .lede {
            margin: 0 0 1.5rem;
            color: var(--muted);
          }
          #session {
            margin: 0 0 0.75rem;
            padding: 0.75rem 0.9rem;
            border: 1px solid var(--line);
            font-weight: 650;
          }
          #session[data-state="out"] {
            background: #eceae4;
            color: #4a4a4a;
          }
          #session[data-state="in"] {
            background: #e5f2ea;
            border-color: #9fc5ad;
            color: var(--ok);
          }
          form {
            display: grid;
            gap: 0.75rem;
            padding: 1.25rem;
            background: #fff;
            border: 1px solid var(--line);
          }
          label {
            display: grid;
            gap: 0.3rem;
            font-size: 0.85rem;
            color: var(--muted);
          }
          input {
            width: 100%;
            padding: 0.65rem 0.7rem;
            border: 1px solid var(--line);
            background: #fafaf8;
            font: inherit;
          }
          button {
            border: 1px solid #000;
            background: #000;
            color: #fff;
            font: inherit;
            font-weight: 600;
            padding: 0.75rem 1rem;
            cursor: pointer;
          }
          button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
          .actions {
            display: grid;
            gap: 0.6rem;
          }
          #status {
            min-height: 1.25rem;
            margin-bottom: 1rem;
          }
          #status[data-ok="1"] { color: var(--ok); }
          #status[data-ok="0"] { color: var(--danger); }
        `}</style>
      </head>
      <body>
        <main>
          <h1>Login</h1>
          <p class="lede">Sign in with email and password. Session is stored on the server.</p>
          <p id="session" data-state="out" role="status">Signed out</p>
          <p id="status" aria-live="polite"></p>
          <form id="login-form">
            <label>
              Email
              <input name="email" type="email" autocomplete="username" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autocomplete="current-password" required />
            </label>
            <div class="actions">
              <button type="submit">Sign In</button>
              <button id="logout-btn" type="button" disabled>
                Sign Out
              </button>
            </div>
          </form>
        </main>
        <script dangerouslySetInnerHTML={{ __html: clientScript }} />
      </body>
    </html>
  )
}
