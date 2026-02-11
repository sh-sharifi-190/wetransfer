import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const s3Configs = [
  { category: 's3', name: 'enabled', value: 'false', type: 'boolean', order: 0 },
  { category: 's3', name: 'endpoint', value: '', type: 'string', order: 1 },
  { category: 's3', name: 'region', value: '', type: 'string', order: 2 },
  { category: 's3', name: 'bucket', value: '', type: 'string', order: 3 },
  { category: 's3', name: 'accessKey', value: '', type: 'string', secret: true, order: 4 },
  { category: 's3', name: 'secretKey', value: '', type: 'string', secret: true, order: 5 },
  // Important for R2/MinIO compatibility
  { category: 's3', name: 'useChecksum', value: 'false', type: 'boolean', order: 6 }, 
];

async function main() {
  console.log('🌱 Adding S3 settings to database...');

  for (const config of s3Configs) {
    await prisma.config.upsert({
      where: {
        name_category: {
          name: config.name,
          category: config.category,
        },
      },
      update: {}, // Don't overwrite if it already exists
      create: {
        name: config.name,
        category: config.category,
        value: config.value,
        type: config.type,
        secret: config.secret || false,
        locked: false,
        order: config.order,
      },
    });
    console.log(`✅ Ensure ${config.category}.${config.name} exists.`);
  }

  console.log('🎉 S3 settings added successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });