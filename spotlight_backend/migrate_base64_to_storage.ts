import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import { uploadBase64Image } from './utils/storage';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting migration of base64 images in database to Supabase Storage...");

  const clubs = await prisma.club.findMany();
  for (const club of clubs) {
    let updated = false;
    let newLogoUrl = club.logoUrl;
    let newQrUrl = club.qrUrl;

    if (club.logoUrl && club.logoUrl.startsWith('data:')) {
      console.log(`Uploading logo for club: ${club.name}...`);
      newLogoUrl = await uploadBase64Image(club.logoUrl, 'clubs/logos');
      updated = true;
    }
    if (club.qrUrl && club.qrUrl.startsWith('data:')) {
      console.log(`Uploading QR for club: ${club.name}...`);
      newQrUrl = await uploadBase64Image(club.qrUrl, 'clubs/qrs');
      updated = true;
    }

    if (updated) {
      await prisma.club.update({
        where: { id: club.id },
        data: { logoUrl: newLogoUrl, qrUrl: newQrUrl },
      });
      console.log(`Updated club: ${club.name}`);
    }
  }

  const events = await prisma.event.findMany();
  for (const event of events) {
    let updated = false;
    let newBannerUrl = event.bannerUrl;
    let newQrUrl = event.qrUrl;

    if (event.bannerUrl && event.bannerUrl.startsWith('data:')) {
      console.log(`Uploading banner for event: ${event.name}...`);
      newBannerUrl = await uploadBase64Image(event.bannerUrl, 'events/banners');
      updated = true;
    }
    if (event.qrUrl && event.qrUrl.startsWith('data:')) {
      console.log(`Uploading QR for event: ${event.name}...`);
      newQrUrl = await uploadBase64Image(event.qrUrl, 'events/qrs');
      updated = true;
    }

    if (updated) {
      await prisma.event.update({
        where: { id: event.id },
        data: { bannerUrl: newBannerUrl, qrUrl: newQrUrl },
      });
      console.log(`Updated event: ${event.name}`);
    }
  }

  const registrations = await prisma.registration.findMany({
    where: {
      paymentProofUrl: {
        startsWith: 'data:'
      }
    }
  });
  for (const reg of registrations) {
    if (reg.paymentProofUrl) {
      console.log(`Uploading payment proof for registration: ${reg.id}...`);
      const newProofUrl = await uploadBase64Image(reg.paymentProofUrl, 'payments/proofs');
      await prisma.registration.update({
        where: { id: reg.id },
        data: { paymentProofUrl: newProofUrl },
      });
      console.log(`Updated registration: ${reg.id}`);
    }
  }

  console.log("Migration completed successfully!");
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
