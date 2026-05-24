import { requireDb } from "../src/lib/db";

async function main() {
  const db = requireDb();
  await db.query("REFRESH MATERIALIZED VIEW marketplace_search_index");
  console.log("Marketplace search index refreshed.");
}

main()
  .catch((error) => {
    console.error("Failed to refresh marketplace search index", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await requireDb().end();
    } catch {
      // noop
    }
  });
