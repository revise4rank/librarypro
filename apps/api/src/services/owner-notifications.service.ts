import { requireDb } from "../lib/db";
import { AppError } from "../lib/errors";
import { deliverLibraryNotificationCampaign } from "../lib/notification-channels";
import { OwnerOperationsRepository } from "../repositories/owner-operations.repository";

function repository() {
  return new OwnerOperationsRepository(requireDb());
}

export async function createOwnerNotificationCampaign(input: {
  libraryId: string;
  actorUserId: string;
  title: string;
  type: "PAYMENT_REMINDER" | "EXPIRY_ALERT" | "GENERAL";
  audience: "ALL_STUDENTS" | "DUE_STUDENTS" | "EXPIRING_STUDENTS";
  message: string;
}) {
  const db = requireDb();
  const repo = repository();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const recipientIds = await repo.findRecipientIds(client, {
      libraryId: input.libraryId,
      audience: input.audience,
    });
    if (recipientIds.length === 0) {
      throw new AppError(404, "No recipients found for selected audience", "RECIPIENTS_NOT_FOUND");
    }

    await repo.insertNotifications(client, {
      libraryId: input.libraryId,
      senderUserId: input.actorUserId,
      recipientIds,
      type: input.type,
      title: input.title,
      message: input.message,
    });

    await client.query("COMMIT");

    const delivery = await deliverLibraryNotificationCampaign({
      libraryId: input.libraryId,
      title: input.title,
      type: input.type,
      audience: input.audience,
      message: input.message,
      recipientCount: recipientIds.length,
      metadata: {
        campaignKind: "OWNER_BROADCAST",
      },
    });

    return {
      recipientCount: recipientIds.length,
      channels: delivery.channels,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
