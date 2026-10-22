# Session Authentication API

An Express and Prisma API that authenticates with a signed, opaque `sid` cookie backed by a server-side session record.

## Requirements

- Node.js 18 or later
- npm

## Setup and run

```bash
cp .env.example .env
# Generate a signing secret, then place the output in .env as COOKIE_SECRET:
openssl rand -hex 32
npm install
npm run setup
npm run dev
```

The setup command generates the Prisma client, creates the local SQLite database, and seeds the demo account: `sam@example.com` / `SessionDemo!48`. The `.env` file is ignored by Git. Never commit a real `COOKIE_SECRET` or `.env` file.

For local HTTP, keep `COOKIE_SECURE=false`. In production, set `NODE_ENV=production` and serve the API over HTTPS; the application always sets `Secure` in production. `SESSION_TTL_MS` sets the shared browser-cookie and server-session lifetime in milliseconds (one hour by default).

## Endpoints

- `POST /auth/login` — validates credentials, verifies the password with asynchronous bcrypt, creates an opaque server-side session, and returns safe user fields with a signed `sid` cookie.
- `GET /auth/me` — resolves the signed cookie through the live session store and returns safe identity fields.
- `POST /auth/logout` — revokes the server-side session and clears the cookie. Repeated logout requests are safe and return `204`.

Invalid credentials use the same generic `401` response whether the email is unknown or the password is incorrect. Missing, invalid, expired, and orphaned sessions share a generic `401 AUTH_REQUIRED` response. The cookie contains only the random session identifier and its signature—never identity or credential data.

## Verify with curl

Start the API, then use a cookie jar to retain the signed cookie:

```bash
curl -i -c cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"email":"sam@example.com","password":"SessionDemo!48"}' \
  http://localhost:3000/auth/login

curl -i -b cookies.txt http://localhost:3000/auth/me

curl -i -X POST -b cookies.txt -c cookies.txt \
  http://localhost:3000/auth/logout

# The old cookie has been revoked; this returns 401.
curl -i -b cookies.txt http://localhost:3000/auth/me
rm -f cookies.txt
```

The login response's `Set-Cookie` header should include `sid`, `HttpOnly`, and `SameSite=Lax`; local HTTP omits `Secure`. With `NODE_ENV=production`, `Secure` is included, and clients must connect over HTTPS to send the cookie.

After setup, run the endpoint tests with:

```bash
npm test
```

## Session storage note

The included session store is an in-memory `Map` for learning and local execution only. It is cleared when the process restarts and is not shared between multiple server instances. Production deployments should use a shared expiring store such as Redis while preserving the same create, resolve, expiry, and revoke contract.
