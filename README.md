# TTPx

_This is an experiment in creating something useful with AI coding agents. It is a personal hobby project, with no commitments and no promises._

TTPx is a platform for internal Red Teams to plan and analyze their operations. The features and functionality are designed with their specific needs in mind, such as:

- Integrating the concept of threat actors and crown jewels into all operations - who is being emulated, what is being targeted, and how is that trending over time?
- Producing visually appealing artifacts from individual operations, such as attack heatmaps and interactive flow charts that allow the operator to design meaningful attack narratives.
- Tracking defensive outcomes in the context of full-scale Red Team operations - not just detection and prevention but also attribution, including log sources and timing.
- Deep integration into MITRE ATT&CK and STIX 2.1 standards - including importing attack campaigns and threat actor profiles directly from MITRE or from other STIX-based threat intelligence sources.
- RBAC with group restrictions, allowing teams to work on operation planning in stealth before providing visibility to other platform users.

## Contributing

See `AGENTS.md` for engineering standards.

Docs
- UI Style Guide: `docs/dev/STYLE.md`
- Design Overview: `docs/dev/DESIGN.md`

Not currently accepting pull requests - still just an experiment.

## Tech Stack

Initially based on the T3 Stack - Next.js, tRPC, Prisma, TypeScript. Type-safe APIs, server-side rendering, and component-driven design.

Local development uses sqlite and the node server. "Production" installation uses docker-compose, postgres, and BYO-reverse-proxy.

## Getting Started

### Local Development (Non-Docker)

Local development uses sqlite and the node dev server.

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

### Production (Docker)

The provided `docker-compose.yml` file does not include a reverse proxy as you'd likely want to configure your own with TLS.

```sh
cd deploy/docker

# Copy example env file and replace secrets
cp .env.example .env

docker compose up -d

# Destroy all data and start from scratch - WARNING YOU WILL LOSE YOUR DB
docker compose down
docker system prune -a --volumes
```

Notes:

- First login forces a password change.

### Logging

- Server logs are emitted to stdout/stderr (structured JSON in production, pretty in dev). Rely on Docker and the host OS for collection and rotation.
- Log level defaults: `debug` in development, `info` in production. Override with `LOG_LEVEL`.

### Single Sign-On (SSO)

SSO is available via environment variable configuration. Users must be provisioned first - they will NOT be auto-created when an SSO login occurs.

For a pure-SSO environment, the INITIAL_ADMIN_EMAIL can be set to something from the SSO provider, and password authentication can be disabled completely.

Environment variables:

```
# Toggle credentials provider (default: enabled)
AUTH_CREDENTIALS_ENABLED=true

# Register Google provider when present (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

For Google, set the following:

- Authorized JavaScript origins: Should match `AUTH_URL` from .env
- Authorized redirect URIs: `AUTH_URL` + `/api/auth/callback/google`
