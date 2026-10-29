# cognito-manual-demo

Cognito でメール／パスワードを本人確認し、ログイン状態は PostgreSQL のサーバーセッションで持つ学習用アプリです。

- Hono + TypeScript
- Drizzle ORM + PostgreSQL
- Docker Compose（API + DB）

## セットアップ

```bash
cp .env.example .env
```

`.env` に次を設定します。

- `AWS_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `COGNITO_CLIENT_SECRET`
- `DATABASE_URL`（ホストから DB に繋ぐとき）
- `SESSION_ENCRYPTION_KEY`（32 byte の hex 64 桁。例: `openssl rand -hex 32`）

アプリクライアントでは `ALLOW_USER_PASSWORD_AUTH` を有効にし、クライアントシークレット付きである必要があります。

## Docker で起動

```bash
docker compose up --build
```

http://localhost:3000/login

Compose 内の API は `DATABASE_URL=postgres://cognito:cognito@db:5432/cognito` を使います。起動時に Drizzle マイグレーションが走ります。

## ホストで開発

```bash
docker compose up -d db
pnpm install
pnpm run dev
```

## Drizzle Studio

Postgres を起動したうえで:

```bash
docker compose up -d db
pnpm db:studio
```

ブラウザで Studio が開きます（通常は http://local.drizzle.studio ）。`.env` の `DATABASE_URL` を使います。

## テスト

Postgres を起動したうえで:

```bash
docker compose up -d db
pnpm test
```

Cognito は stub します。セッションは実 DB を使います。

## API

| Method | Path | 説明 |
|---|---|---|
| GET | `/login` | ログイン画面（Sign Out あり） |
| POST | `/auth/login` | `{ email, password }` → 204 + `sid` Cookie |
| POST | `/auth/logout` | セッション失効 + RefreshToken の RevokeToken |
| GET | `/me` | 要ログイン。アカウント画面（メール + Sign Out） |
| GET | `/api/me` | 要ログイン。`{ email }` JSON |

成功時レスポンスにアクセストークン／更新トークンは含まれません。
