# Authentication Fundamentals API

A small Express and Prisma API demonstrating safe registration and login. Prisma uses SQLite so local setup does not require a separate database server.

## Setup

Run these commands from this directory:

```bash
npm install
cp .env.example .env
npm run db:push
npm start
```

The API listens on `http://localhost:3000` by default. Set `PORT` to change the port. `DATABASE_URL` selects the SQLite file, and `BCRYPT_COST` controls the bcrypt work factor (an integer from 4 to 31; the default is 12). The example database is local and `.env` and `prisma/dev.db` are ignored by Git.

Run the automated HTTP and security checks with:

```bash
npm test
```

## Endpoints

### `POST /auth/register`

Request:

```json
{
  "name": "Sam",
  "email": "sam@example.com",
  "password": "correct horse battery staple"
}
```

A successful registration returns `201` with only the public identity fields:

```json
{ "id": 1, "name": "Sam", "email": "sam@example.com" }
```

Names are trimmed and emails are trimmed and lowercased. The password is hashed asynchronously with bcryptjs before persistence; only `passwordHash` is stored. A duplicate normalized email returns `409`.

### `POST /auth/login`

Request:

```json
{
  "email": "sam@example.com",
  "password": "correct horse battery staple"
}
```

Valid credentials return `200` with the same safe identity shape. Unknown emails and incorrect passwords return the exact same `401` response:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

An in-memory dummy bcrypt hash makes the unknown-email path perform comparable bcrypt work. Invalid input returns `400`; unexpected internal failures return a generic `500` without exposing database or bcrypt details. The repository isolates Prisma, the service owns authentication workflow, and responses use an explicit public-field allowlist. This API does not issue sessions or tokens.
