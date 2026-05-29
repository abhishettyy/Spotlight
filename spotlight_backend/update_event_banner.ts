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
  const eventId = "1f028586-15fb-447c-b27c-982075b144d9"; // asdv event ID
  
  // Update the event with a stunning high-definition abstract tech banner!
  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      bannerUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop",
    },
  });
  
  console.log("Successfully updated event banner in database:", JSON.stringify(updatedEvent, null, 2));

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
