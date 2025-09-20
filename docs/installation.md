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

# Optionally - seed demo taxonomy/operation data
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

# Optionally - seed demo taxonomy/operation data
docker exec ttpx-web npx tsx scripts/demo-data.ts

# Destroy all data and start from scratch - WARNING YOU WILL LOSE YOUR DB
docker compose down
docker system prune -a --volumes
```

Notes:

- First login forces a password change.

## Logging

- Server logs emit to stdout/stderr (structured JSON in production, pretty in development). Rely on Docker and the host OS for collection and rotation.
- Log level defaults: `debug` in development, `info` in production. Override with `LOG_LEVEL`.

## Single Sign-On (SSO)

SSO is enabled through environment variables. Users must be provisioned ahead of time; they are **not** auto-created on first SSO login.

For a pure-SSO setup, set `INITIAL_ADMIN_EMAIL` to a value from the SSO provider and disable password authentication if desired.

Environment variables:

```
# Toggle credentials provider (default: enabled)
AUTH_CREDENTIALS_ENABLED=true

# Register Google provider when present (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

For Google, configure the following in the Google Cloud console:

- Authorized JavaScript origins: matches `AUTH_URL` from `.env`.
- Authorized redirect URIs: `AUTH_URL` + `/api/auth/callback/google`.
