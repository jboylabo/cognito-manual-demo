import type { FC } from 'hono/jsx'

const clientScript = `
const TOKEN_KEY = 'cognito_access_token'
const FLASH_KEY = 'cognito_flash'

const statusEl = document.getElementById('status')
const sessionEl = document.getElementById('session')

function setStatus(text, ok) {
  statusEl.textContent = text
  statusEl.dataset.ok = ok ? '1' : '0'
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
  refreshSession()
}

function refreshSession() {
  const token = getToken()
  const signedIn = Boolean(token)
  sessionEl.dataset.state = signedIn ? 'in' : 'out'
  sessionEl.textContent = signedIn
    ? 'Signed in — access token saved'
    : 'Signed out'
  document.querySelectorAll('[data-needs-auth]').forEach((el) => {
    el.disabled = !signedIn
  })
}

function consumeFlash() {
  const raw = sessionStorage.getItem(FLASH_KEY)
  if (!raw) return
  sessionStorage.removeItem(FLASH_KEY)
  try {
    const flash = JSON.parse(raw)
    setStatus(flash.text || '', Boolean(flash.ok))
  } catch (_) {}
}

function reloadWithFlash(text, ok) {
  sessionStorage.setItem(FLASH_KEY, JSON.stringify({ text, ok: Boolean(ok) }))
  location.assign('/')
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const res = await fetch(path, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = data.error ? data.message + ': ' + data.error : (data.message || res.statusText)
    throw new Error(detail)
  }
  return data
}

document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const fd = new FormData(e.target)
  try {
    const data = await api('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        username: fd.get('username'),
        email: fd.get('email'),
        password: fd.get('password'),
      }),
    })
    setStatus(data.message, true)
  } catch (err) {
    setStatus(err.message, false)
  }
})

document.getElementById('confirm-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const fd = new FormData(e.target)
  try {
    const data = await api('/auth/confirm-signup', {
      method: 'POST',
      body: JSON.stringify({
        username: fd.get('username'),
        code: fd.get('code'),
      }),
    })
    setStatus(data.message, true)
  } catch (err) {
    setStatus(err.message, false)
  }
})

document.getElementById('signin-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const fd = new FormData(e.target)
  try {
    const data = await api('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        username: fd.get('username'),
        password: fd.get('password'),
      }),
    })
    const token = data.data && data.data.AuthenticationResult && data.data.AuthenticationResult.AccessToken
    if (!token) throw new Error('AccessToken がレスポンスにありません')
    setToken(token)
    setStatus(data.message, true)
  } catch (err) {
    setStatus(err.message, false)
  }
})

document.getElementById('signout-btn').addEventListener('click', async () => {
  try {
    const data = await api('/auth/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + getToken() },
    })
    localStorage.removeItem(TOKEN_KEY)
    reloadWithFlash(data.message, true)
  } catch (err) {
    setStatus(err.message, false)
  }
})

document.getElementById('change-password-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  const fd = new FormData(e.target)
  try {
    const data = await api('/auth/change-password', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + getToken() },
      body: JSON.stringify({
        previousPassword: fd.get('previousPassword'),
        proposedPassword: fd.get('proposedPassword'),
      }),
    })
    setStatus(data.message, true)
    e.target.reset()
  } catch (err) {
    setStatus(err.message, false)
  }
})

refreshSession()
consumeFlash()
`

export const Home: FC = () => {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Cognito Manual Demo</title>
        <style>{`
          :root {
            color-scheme: light;
            --ink: #111;
            --muted: #5c5c5c;
            --line: #d8d8d8;
            --bg: #f3f1ec;
            --panel: #fff;
            --danger: #8b1e1e;
            --ok: #1d5c34;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: 'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif;
            background:
              radial-gradient(circle at top left, #ffffff 0, transparent 42%),
              linear-gradient(160deg, #ebe7df 0%, var(--bg) 45%, #ddd7cc 100%);
            color: var(--ink);
          }
          main {
            max-width: 42rem;
            margin: 0 auto;
            padding: 2.5rem 1.25rem 4rem;
          }
          h1 {
            margin: 0 0 0.35rem;
            font-family: 'IBM Plex Serif', Georgia, serif;
            font-size: clamp(1.8rem, 4vw, 2.4rem);
            letter-spacing: -0.02em;
          }
          .lede {
            margin: 0 0 1.5rem;
            color: var(--muted);
            line-height: 1.5;
          }
          #session {
            margin: 0 0 0.75rem;
            padding: 0.85rem 1rem;
            border: 1px solid var(--line);
            font-size: 0.95rem;
            font-weight: 650;
            letter-spacing: 0.01em;
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
          #status {
            margin-bottom: 1.5rem;
            min-height: 1.4rem;
            font-size: 0.95rem;
            line-height: 1.4;
          }
          #status[data-ok="1"] { color: var(--ok); }
          #status[data-ok="0"] { color: var(--danger); }
          section {
            margin-bottom: 1.25rem;
            padding: 1.1rem 1.15rem 1.2rem;
            background: var(--panel);
            border: 1px solid var(--line);
          }
          section h2 {
            margin: 0 0 0.85rem;
            font-size: 1rem;
            font-weight: 650;
            letter-spacing: 0.02em;
            text-transform: uppercase;
          }
          form {
            display: grid;
            gap: 0.65rem;
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
            border-radius: 0;
            background: #fafaf8;
            font: inherit;
            color: var(--ink);
          }
          input:focus {
            outline: 2px solid #111;
            outline-offset: 1px;
          }
          button {
            appearance: none;
            border: 1px solid #000;
            background: #000;
            color: #fff;
            font: inherit;
            font-weight: 600;
            letter-spacing: 0.02em;
            padding: 0.7rem 1rem;
            cursor: pointer;
          }
          button:hover:not(:disabled) {
            background: #222;
          }
          button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
          .row {
            display: flex;
            gap: 0.6rem;
            flex-wrap: wrap;
          }
          .row button { flex: 1 1 8rem; }
        `}</style>
      </head>
      <body>
        <main>
          <h1>Cognito Manual Demo</h1>
          <p class="lede">Sign up, confirm, sign in, change password, and sign out against Amazon Cognito.</p>
          <p id="session" data-state="out" role="status">Signed out</p>
          <p id="status" aria-live="polite"></p>

          <section>
            <h2>Sign Up</h2>
            <form id="signup-form">
              <label>
                Username
                <input name="username" type="text" autocomplete="username" required />
              </label>
              <label>
                Email
                <input name="email" type="email" autocomplete="email" required />
              </label>
              <label>
                Password
                <input name="password" type="password" autocomplete="new-password" required />
              </label>
              <button type="submit">Sign Up</button>
            </form>
          </section>

          <section>
            <h2>Confirm Sign Up</h2>
            <form id="confirm-form">
              <label>
                Username
                <input name="username" type="text" autocomplete="username" required />
              </label>
              <label>
                Confirmation code
                <input name="code" type="text" inputmode="numeric" required />
              </label>
              <button type="submit">Confirm</button>
            </form>
          </section>

          <section>
            <h2>Sign In</h2>
            <form id="signin-form">
              <label>
                Username
                <input name="username" type="text" autocomplete="username" required />
              </label>
              <label>
                Password
                <input name="password" type="password" autocomplete="current-password" required />
              </label>
              <div class="row">
                <button type="submit">Sign In</button>
                <button id="signout-btn" type="button" data-needs-auth disabled>
                  Sign Out
                </button>
              </div>
            </form>
          </section>

          <section>
            <h2>Change Password</h2>
            <form id="change-password-form">
              <label>
                Current password
                <input
                  name="previousPassword"
                  type="password"
                  autocomplete="current-password"
                  required
                  data-needs-auth
                  disabled
                />
              </label>
              <label>
                New password
                <input
                  name="proposedPassword"
                  type="password"
                  autocomplete="new-password"
                  required
                  data-needs-auth
                  disabled
                />
              </label>
              <button type="submit" data-needs-auth disabled>
                Change Password
              </button>
            </form>
          </section>
        </main>
        <script dangerouslySetInnerHTML={{ __html: clientScript }} />
      </body>
    </html>
  )
}
