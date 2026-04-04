import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

type SqlMigration = {
  id: string;
  sql: string;
  source: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(apiDir, "../..");

function loadLocalEnvFile() {
  const candidates = [
    path.resolve(repoRoot, ".env"),
    path.resolve(apiDir, ".env"),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }

    break;
  }
}

function getLegacyBaselineMigration() {
  const sqlPath = path.resolve(repoRoot, "docs/schema.sql");
  return {
    id: "0001_legacy_schema",
    sql: fs.readFileSync(sqlPath, "utf8"),
    source: sqlPath,
  } satisfies SqlMigration;
}

function getFileMigrations() {
  const migrationsDir = path.resolve(apiDir, "migrations");
  if (!fs.existsSync(migrationsDir)) {
    return [] as SqlMigration[];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => {
      const fullPath = path.join(migrationsDir, fileName);
      return {
        id: fileName.replace(/\.sql$/i, ""),
        sql: fs.readFileSync(fullPath, "utf8"),
        source: fullPath,
      } satisfies SqlMigration;
    });
}

async function main() {
  loadLocalEnvFile();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        source TEXT NOT NULL
      )
    `);

    const appliedResult = await pool.query<{ id: string }>("SELECT id FROM schema_migrations");
    const applied = new Set(appliedResult.rows.map((row) => row.id));

    const migrations = [getLegacyBaselineMigration(), ...getFileMigrations()];
    for (const migration of migrations) {
      if (applied.has(migration.id)) {
        continue;
      }

      await pool.query("BEGIN");
      try {
        await pool.query(migration.sql);
        await pool.query(
          "INSERT INTO schema_migrations (id, source) VALUES ($1, $2)",
          [migration.id, migration.source],
        );
        await pool.query("COMMIT");
        console.info(`Migration applied: ${migration.id}`);
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
