import { prisma } from './config/db';
import { uploadBase64Image } from './utils/storage';

async function migrate() {
  console.log("Checking for any base64 logos or banners in GoDaddy database...");

  const clubs = await prisma.club.findMany();
  for (const club of clubs) {
    let updated = false;
    let newLogoUrl = club.logoUrl;
    let newQrUrl = club.qrUrl;

    if (club.logoUrl && club.logoUrl.startsWith('data:')) {
      console.log(`Migrating base64 logo for club: "${club.name}" to GoDaddy uploads...`);
      newLogoUrl = await uploadBase64Image(club.logoUrl, 'clubs/logos');
      updated = true;
    }
    if (club.qrUrl && club.qrUrl.startsWith('data:')) {
      console.log(`Migrating base64 QR for club: "${club.name}" to GoDaddy uploads...`);
      newQrUrl = await uploadBase64Image(club.qrUrl, 'clubs/qrs');
      updated = true;
    }

    if (updated) {
      await prisma.club.update({
        where: { id: club.id },
        data: { logoUrl: newLogoUrl, qrUrl: newQrUrl },
      });
      console.log(`✔ Updated club "${club.name}": new logo -> ${newLogoUrl}`);
    }
  }

  const events = await prisma.event.findMany();
  for (const event of events) {
    let updated = false;
    let newBanner = event.bannerUrl;
    let newQr = event.qrUrl;

    if (event.bannerUrl && event.bannerUrl.startsWith('data:')) {
      console.log(`Migrating base64 banner for event: "${event.name}"...`);
      newBanner = await uploadBase64Image(event.bannerUrl, 'events/banners');
      updated = true;
    }
    if (event.qrUrl && event.qrUrl.startsWith('data:')) {
      console.log(`Migrating base64 QR for event: "${event.name}"...`);
      newQr = await uploadBase64Image(event.qrUrl, 'events/qrs');
      updated = true;
    }

    if (updated) {
      await prisma.event.update({
        where: { id: event.id },
        data: { bannerUrl: newBanner, qrUrl: newQr },
      });
      console.log(`✔ Updated event "${event.name}" banner -> ${newBanner}`);
    }
  }

  console.log("\nMigration complete! All base64 images converted to GoDaddy web files.");
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
