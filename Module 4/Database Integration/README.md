# Database Integration Assignment

This project replaces in-memory post storage with PostgreSQL through Prisma while preserving the existing `/posts` API contract. Prisma is limited to the database module, migration/seed tooling, and repositories; services and controllers continue using application-level repository methods.

## Requirements

- Node.js 20.6 or newer
- PostgreSQL

## Configure and run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set `DATABASE_URL` to a PostgreSQL database you control. Do not commit `.env` or real credentials.

3. Apply the committed migration and generate the Prisma Client:

   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

4. Load the repeatable sample records and start the API:

   ```bash
   npm run db:seed
   npm start
   ```

The seed uses upserts for the author and two starter posts. It does not delete user data and can be run again safely. The API listens on `PORT` (default `3000`).

## Schema and behavior

The schema models users, posts, comments, votes, follows, tags, and the explicit post-tag join table. Foreign-key deletion behavior is explicit, relationship duplicates are blocked by composite primary keys, tag names are unique, and indexes cover the demonstrated author, post, comment, and relationship lookup paths.

The post repository keeps the original methods and output fields: `findAll` returns an ID-ordered array, `findById` returns a record or `null`, `create` returns the created record, `update` returns the updated record or `null`, and `remove` returns a boolean. Timestamps and relation objects are kept out of the pre-existing post response shape. Constraint errors are translated to safe client messages; raw Prisma/database details are not returned.

## Commands

```bash
npm run prisma:format
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run db:seed
npm test
```

`npm run prisma:migrate` creates/applies the named `core_relational_models` migration in development. `prisma migrate reset` is destructive: only use it against a disposable local development database after confirming its contents may be erased.
