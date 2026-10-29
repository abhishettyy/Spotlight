import { Prisma } from '@prisma/client';

/** The key was claimed by another sign-up between checking it and using it. */
export class KeyAlreadyUsed extends Error {}

/**
 * Marks a registration key used, inside the sign-up transaction. The update only matches while the
 * key is still unused, so two sign-ups racing on one key can't both succeed: the second one throws
 * and its transaction (club and profile included) is rolled back.
 */
export async function claimRegistrationKey(tx: Prisma.TransactionClient, keyId: string): Promise<void> {
  const claimed = await tx.registrationKey.updateMany({
    where: { id: keyId, isUsed: false },
    data: { isUsed: true, usedAt: new Date() },
  });
  if (claimed.count !== 1) throw new KeyAlreadyUsed();
}
