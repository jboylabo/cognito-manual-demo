import type { FC } from 'hono/jsx'

type MeProps = {
  email: string
}

const clientScript = `
const statusEl = document.getElementById('status')
const logoutBtn = document.getElementById('logout-btn')

function setStatus(text, ok) {
  statusEl.textContent = text
  statusEl.dataset.ok = ok ? '1' : '0'
}

logoutBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/auth/logout', { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Logout failed')
    }
    location.assign('/login')
  } catch (err) {
    setStatus(err.message || 'Logout failed', false)
  }
})
`

export const Me: FC<MeProps> = ({ email }) => {
  return (
    <html lang="ja">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Account</title>
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
          .panel {
            display: grid;
            gap: 0.85rem;
            padding: 1.25rem;
            background: #fff;
            border: 1px solid var(--line);
          }
          .label {
            font-size: 0.85rem;
            color: var(--muted);
          }
          .value {
            font-size: 1.05rem;
            font-weight: 650;
            word-break: break-all;
          }
          .session {
            padding: 0.75rem 0.9rem;
            border: 1px solid #9fc5ad;
            background: #e5f2ea;
            color: var(--ok);
            font-weight: 650;
          }
          button, a.button {
            display: block;
            width: 100%;
            border: 1px solid #000;
            background: #000;
            color: #fff;
            font: inherit;
            font-weight: 600;
            padding: 0.75rem 1rem;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
          }
          #status {
            min-height: 1.25rem;
            margin-bottom: 1rem;
          }
          #status[data-ok="0"] { color: var(--danger); }
        `}</style>
      </head>
      <body>
        <main>
          <h1>Account</h1>
          <p class="lede">Server session is active. Cognito tokens stay encrypted in the database.</p>
          <p id="status" aria-live="polite"></p>
          <div class="panel">
            <div class="session" role="status">Signed in</div>
            <div>
              <div class="label">Email</div>
              <div class="value">{email}</div>
            </div>
            <button id="logout-btn" type="button">Sign Out</button>
            <a class="button" href="/login">Back to Login</a>
          </div>
        </main>
        <script dangerouslySetInnerHTML={{ __html: clientScript }} />
      </body>
    </html>
  )
}
