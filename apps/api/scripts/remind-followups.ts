import { runOverdueFollowUpReminders } from "../src/services/productivity.service";

async function main() {
  const result = await runOverdueFollowUpReminders();
  console.log(
    JSON.stringify(
      {
        ok: true,
        reminderCount: result.reminderCount,
        librariesTouched: result.librariesTouched,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
