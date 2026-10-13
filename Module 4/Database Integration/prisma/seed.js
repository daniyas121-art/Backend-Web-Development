const prisma = require('../src/db/prisma');

async function main() {
  await prisma.user.upsert({
    where: { id: 1 },
    update: { name: 'Community member' },
    create: { id: 1, name: 'Community member' },
  });

  const posts = [
    { id: 1, title: 'First post', body: 'The contract survives storage changes.', authorId: 1 },
    { id: 2, title: 'Second post', body: 'Migrations record database design.', authorId: 1 },
  ];

  for (const post of posts) {
    await prisma.post.upsert({
      where: { id: post.id },
      update: { title: post.title, body: post.body, authorId: post.authorId },
      create: post,
    });
  }

  // Explicit seed IDs must not leave PostgreSQL's generated-ID sequence behind.
  await prisma.$queryRaw`
    SELECT setval(
      pg_get_serial_sequence('"Post"', 'id'),
      COALESCE((SELECT MAX("id") FROM "Post"), 1),
      EXISTS (SELECT 1 FROM "Post")
    )
  `;
  await prisma.$queryRaw`
    SELECT setval(
      pg_get_serial_sequence('"User"', 'id'),
      COALESCE((SELECT MAX("id") FROM "User"), 1),
      EXISTS (SELECT 1 FROM "User")
    )
  `;

  console.log('Seed complete; existing records were not removed.');
}

main()
  .catch((error) => {
    console.error('Seed failed. Check DATABASE_URL and migration status.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
