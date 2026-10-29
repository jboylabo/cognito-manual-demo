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

## GitHub Actions（actions.lock）

Workflow で使う Action のコミット SHA は [`.github/workflows/actions.lock`](.github/workflows/actions.lock) で固定しています。`@v4` のような浮動タグは使いません。

初回または更新時:

```bash
gh extension install github/gh-actions-lock
gh actions-lock
```

Workflow 内の Action バージョンを変えたあとは、必ず `gh actions-lock` を再実行して `actions.lock` もコミットしてください。lock が古いと CI が `Invalid lockfile` で失敗します。

参考: [GitHub Actions で checkout@v7 のようなバージョン指定を書くのはやめよう！ 時代は actions.lock！](https://zenn.dev/progate/articles/24b1140180300c)

## API

| Method | Path | 説明 |
|---|---|---|
| GET | `/login` | ログイン画面（Sign Out あり） |
| POST | `/auth/login` | `{ email, password }` → 204 + `sid` Cookie |
| POST | `/auth/logout` | セッション失効 + RefreshToken の RevokeToken |
| GET | `/me` | 要ログイン。アカウント画面（メール + Sign Out） |
| GET | `/api/me` | 要ログイン。`{ email }` JSON |

成功時レスポンスにアクセストークン／更新トークンは含まれません。

### AWS Cognitoリソースの削除

# クライアント一覧

```
aws cognito-idp list-user-pool-clients --user-pool-id 
```

# クライアント削除

```
aws cognito-idp delete-user-pool-client --user-pool-id  --client-id 
```

削除例

```
aws cognito-idp list-user-pool-clients 
  --user-pool-id ap-northeast-1_lScUgaqxP 
  --max-results 60
```

# ドメインがあれば削除

```
aws cognito-idp delete-user-pool-domain --domain  --user-pool-id 
```

# プール削除

```
aws cognito-idp delete-user-pool --user-pool-id 
```

順番は次です。クライアント → ドメイン → プール。先にプールを消そうとすると失敗することが多いです。

```
# ===== 0. 対象を変数に（.env の値） =====
POOL_ID=ap-northeast-1_lScUgaqxP
CLIENT_ID=42s1l47jhsbg84pnnntvqq1fou
# REGION は aws configure / AWS_REGION が ap-northeast-1 なら省略可
# export AWS_REGION=ap-northeast-1

# ===== 1. クライアント一覧（先に確認） =====
aws cognito-idp list-user-pool-clients \
  --user-pool-id "$POOL_ID" \
  --max-results 60

# ===== 2. クライアント削除（一覧の ClientId ごと。複数あれば繰り返す） =====
aws cognito-idp delete-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-id "$CLIENT_ID"

# ===== 3. ドメインがあるか確認 =====
aws cognito-idp describe-user-pool \
  --user-pool-id "$POOL_ID" \
  --query 'UserPool.Domain' \
  --output text

# 上でドメイン名（例: my-app）が出た場合だけ削除。
# None / null ならスキップ。
# aws cognito-idp delete-user-pool-domain \
#   --user-pool-id "$POOL_ID" \
#   --domain "ここにドメイン名"

# カスタムドメインの場合は別コマンド:
# aws cognito-idp delete-user-pool-domain \
#   --user-pool-id "$POOL_ID" \
#   --domain "auth.example.com"

# ===== 4. ユーザープール削除（最後） =====
aws cognito-idp delete-user-pool \
  --user-pool-id "$POOL_ID"

# ===== 5. 消えたか確認（ResourceNotFound なら成功） =====
aws cognito-idp describe-user-pool --user-pool-id "$POOL_ID"
```