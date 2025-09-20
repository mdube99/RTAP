# Installation

Follow these instructions to set up TTPx in local development or production environments.

## Local Development (Non-Docker)

Local development uses SQLite and the Node.js dev server.

```sh
# Copy example env file and replace secrets
cp .env.example .env

# Install dependencies
npm install

# Initialize schema and seed first-run admin + MITRE
npm run init

# If not using SSO, generate 1-time login URL to set up your first passkey
npm run generate-admin-login

# Optionally - seed demo taxonomy/operation data FOR DEMO PURPOSES ONLY)
npx tsx scripts/demo-data.ts

# Start development server (or use one-liner: `npm run dev:with-init`)
npm run dev --turbo
```

## Production (Docker)

The provided `deploy/docker/docker-compose.yml` file does not include a reverse proxy; configure your own with TLS.

```sh
cd deploy/docker

# Copy example env file and replace secrets
cp .env.example .env

docker compose up -d

# Optionally - seed demo taxonomy/operation data (FOR DEMO PURPOSES ONLY)
docker exec ttpx-web npx tsx scripts/demo-data.ts

# If not using SSO, generate 1-time login URL to set up your first passkey
docker exec ttpx-web npm run generate-admin-login

# Destroy all data and start from scratch - WARNING YOU WILL LOSE YOUR DB
docker compose down
docker system prune -a --volumes
```

## Authentication

There is no support for traditional passwords. If you are using SSO, the `INITIAL_ADMIN_EMAIL` is created as a local account at initialization and should be accessible to login via your SSO provider.

If not using SSO, you need to generate a 1-time-login link for that same `INITIAL_ADMIN_EMAIL` user. This will allow you to login so you can add a passkey to your account. From there, continue logging in with your passkey. The `npm run generate-admin-login` command can be re-run in emergencies where you lost your admin passkey.

When creating new users in the UI, you will be presented with a similar 1-time-login link for them. They will need to register a passkey when they first login.

## Logging

- Server logs emit to stdout/stderr (structured JSON in production, pretty in development). Rely on Docker and the host OS for collection and rotation.
- Log level defaults: `debug` in development, `info` in production. Override with `LOG_LEVEL`.

## Single Sign-On (SSO)

SSO is enabled through environment variables. Users must be provisioned ahead of time; they are **not** auto-created on first SSO login.

For a pure-SSO setup, set `INITIAL_ADMIN_EMAIL` to a value from the SSO provider. Passkeys can be enabled alongside SSO when desired.

Environment variables:

```
# Toggle passkey provider (default: disabled)
AUTH_PASSKEYS_ENABLED=true

# Register Google provider when present (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

For Google, configure the following in the Google Cloud console:

- Authorized JavaScript origins: matches `AUTH_URL` from `.env`.
- Authorized redirect URIs: `AUTH_URL` + `/api/auth/callback/google`.
