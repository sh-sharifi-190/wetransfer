import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const configs = [
  // General
  { category: 'general', name: 'appName', value: 'WeTransfer', type: 'string' },
  { category: 'general', name: 'appUrl', value: 'http://localhost:3000', type: 'string' },
  { category: 'general', name: 'showHomePage', value: 'true', type: 'boolean' },
  { category: 'general', name: 'sessionDuration', value: '7 days', type: 'timespan' },
  { category: 'general', name: 'secureCookies', value: 'false', type: 'boolean' },

  // Share Settings
  { category: 'share', name: 'allowRegistration', value: 'true', type: 'boolean' },
  { category: 'share', name: 'allowUnauthenticatedShares', value: 'true', type: 'boolean' },
  { category: 'share', name: 'maxExpiration', value: '0', type: 'number' }, // 0 = Unlimited
  { category: 'share', name: 'maxSize', value: '10000000000', type: 'filesize' }, // 10 GB
  { category: 'share', name: 'chunkSize', value: '10000000', type: 'filesize' },
  { category: 'share', name: 'zipCompressionLevel', value: '0', type: 'number' },
  { category: 'share', name: 'autoOpenShareModal', value: 'false', type: 'boolean' },
  { category: 'share', name: 'shareIdLength', value: '8', type: 'number' },

  // Security & Internal
  { category: 'internal', name: 'jwtSecret', value: 'change-me-in-prod', type: 'string', secret: true },
  
  // Cache (Disable Redis)
  { category: 'cache', name: 'redis-enabled', value: 'false', type: 'boolean' },
  
  // OAuth (Disable all)
  { category: 'oauth', name: 'disablePassword', value: 'false', type: 'boolean' },
  { category: 'oauth', name: 'github-enabled', value: 'false', type: 'boolean' },
  { category: 'oauth', name: 'google-enabled', value: 'false', type: 'boolean' },
  { category: 'oauth', name: 'microsoft-enabled', value: 'false', type: 'boolean' },
  { category: 'oauth', name: 'discord-enabled', value: 'false', type: 'boolean' },
  { category: 'oauth', name: 'oidc-enabled', value: 'false', type: 'boolean' },

  // Email & SMTP (Disable)
  { category: 'email', name: 'enableShareEmailRecipients', value: 'false', type: 'boolean' },
  { category: 'smtp', name: 'enabled', value: 'false', type: 'boolean' },
  
  // Legal
  { category: 'legal', name: 'enabled', value: 'false', type: 'boolean' },
];

async function main() {
  console.log('🌱 Starting to fill the database...');

  for (const config of configs) {
    await prisma.config.upsert({
      where: {
        name_category: {
          name: config.name,
          category: config.category,
        },
      },
      update: {
        value: config.value,
      },
      create: {
        name: config.name,
        category: config.category,
        value: config.value,
        type: config.type,
        // Description field removed to fix error
        secret: config.secret || false,
        locked: false,
        order: 0,
      },
    });
    console.log(`✅ Set ${config.category}.${config.name} = ${config.value}`);
  }

  console.log('🎉 Database filled successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });