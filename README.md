# cognito-manual-demo

Hono（Node.js）から Amazon Cognito ユーザープールの登録・確認・サインイン・ログアウト・パスワード変更を呼びます。トップページは Hono JSX の操作 UI です。

参考: [はじめてのCognitoとExpressで実装するユーザー認証](https://zenn.dev/miumi/articles/f9c8923ec4f3ab)

## セットアップ

```
pnpm install
cp .env.example .env
```

`.env` に次を設定します。

- `AWS_REGION`
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `COGNITO_CLIENT_SECRET`（アプリクライアントにシークレットがある場合のみ）

AWS への認証は `aws login` や `~/.aws` のデフォルト認証チェーンを使います。`.env` にアクセスキーは不要です。事前に `aws login` などでサインインしてください。

アプリクライアントでは `ALLOW_USER_PASSWORD_AUTH` を有効にしてください。

```
pnpm run dev
```

http://localhost:3000

## UI

ブラウザで開くと次の操作ができます。サインイン後のアクセストークンはブラウザの `localStorage` に保存されます。

- Sign Up / Confirm Sign Up
- Sign In / Sign Out
- Change Password（サインイン後。現行パスワードと新しいパスワード）

## エンドポイント

ユーザー登録

```
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username": "user@example.com", "password": "Password1!", "email": "user@example.com"}'
```

メールの確認コードでユーザー確認

```
curl -X POST http://localhost:3000/auth/confirm-signup \
  -H "Content-Type: application/json" \
  -d '{"username": "user@example.com", "code": "123456"}'
```

サインイン。レスポンスの `AuthenticationResult.AccessToken` を以降のリクエストに使います。

```
curl -X POST http://localhost:3000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username": "user@example.com", "password": "Password1!"}'
```

保護ルート

```
curl -X GET http://localhost:3000/auth/protected \
  -H "Authorization: Bearer <access token>"
```

パスワード変更（サインイン後）

```
curl -X POST http://localhost:3000/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access token>" \
  -d '{"previousPassword": "Password1!", "proposedPassword": "Password2!"}'
```

ログアウト

```
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <access token>"
```

ログアウト後に同じトークンで保護ルートを呼ぶと 401 になります。
