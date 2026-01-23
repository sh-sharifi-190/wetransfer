// backend/promote-admin.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// REPLACE THIS WITH YOUR EMAIL
const TARGET_EMAIL = 'shayansharifi@gmail.com'; 

async function main() {
  console.log(`🔍 Searching for user: ${TARGET_EMAIL}...`);

  const user = await prisma.user.findFirst({
    where: { email: TARGET_EMAIL },
  });

  if (!user) {
    console.error(`❌ User not found! Please sign up first.`);
    return;
  }

  console.log(`✅ User found: ${user.username}`);
  console.log(`🚀 Promoting to Admin...`);

  await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
  });

  console.log(`🎉 SUCCESS! ${TARGET_EMAIL} is now an Admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });