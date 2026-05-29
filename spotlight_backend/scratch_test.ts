import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("--- Profiles ---");
  const profiles = await prisma.profile.findMany();
  console.log(JSON.stringify(profiles, null, 2));

  console.log("--- Clubs ---");
  const clubs = await prisma.club.findMany();
  console.log(JSON.stringify(clubs, null, 2));

  console.log("\n--- Events ---");
  const events = await prisma.event.findMany();
  console.log(JSON.stringify(events, null, 2));
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
