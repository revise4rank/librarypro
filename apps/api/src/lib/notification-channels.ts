type DeliveryChannel = "IN_APP" | "WEBHOOK";

export async function deliverLibraryNotificationCampaign(input: {
  libraryId: string;
  title: string;
  type: "PAYMENT_REMINDER" | "EXPIRY_ALERT" | "GENERAL";
  audience: "ALL_STUDENTS" | "DUE_STUDENTS" | "EXPIRING_STUDENTS";
  message: string;
  recipientCount: number;
  metadata?: Record<string, unknown>;
}) {
  const channels: DeliveryChannel[] = ["IN_APP"];
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL?.trim();

  if (webhookUrl) {
    channels.push("WEBHOOK");
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "librarypro",
        libraryId: input.libraryId,
        title: input.title,
        type: input.type,
        audience: input.audience,
        message: input.message,
        recipientCount: input.recipientCount,
        metadata: input.metadata ?? {},
        ts: new Date().toISOString(),
      }),
    }).catch(() => undefined);
  }

  return { channels };
}

export async function deliverOwnerFollowUpReminder(input: {
  libraryId: string;
  title: string;
  message: string;
  recipientCount: number;
  metadata?: Record<string, unknown>;
}) {
  const channels: DeliveryChannel[] = ["IN_APP"];
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL?.trim();

  if (webhookUrl) {
    channels.push("WEBHOOK");
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "librarypro",
        audience: "LIBRARY_OWNERS",
        category: "FOLLOW_UP_REMINDER",
        libraryId: input.libraryId,
        title: input.title,
        message: input.message,
        recipientCount: input.recipientCount,
        metadata: input.metadata ?? {},
        ts: new Date().toISOString(),
      }),
    }).catch(() => undefined);
  }

  return { channels };
}
