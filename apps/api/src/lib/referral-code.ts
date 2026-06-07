import crypto from "node:crypto";
import type { PoolClient } from "pg";

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function buildReferralCode() {
  let code = "BL";
  for (let index = 0; index < 6; index += 1) {
    code += REFERRAL_ALPHABET[crypto.randomInt(0, REFERRAL_ALPHABET.length)];
  }
  return code;
}

async function referralCodeExists(client: PoolClient, code: string) {
  const result = await client.query<{ exists: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1 FROM libraries WHERE referral_code = $1
      UNION ALL
      SELECT 1 FROM users WHERE referral_code = $1
    ) AS exists
    `,
    [code],
  );
  return result.rows[0]?.exists ?? false;
}

export async function generateUniqueReferralCode(client: PoolClient) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = buildReferralCode();
    if (!(await referralCodeExists(client, code))) {
      return code;
    }
  }
  throw new Error("Unable to generate unique referral code");
}

export async function ensureUserReferralCode(client: PoolClient, userId: string) {
  const existing = await client.query<{ referral_code: string | null }>(
    `SELECT referral_code FROM users WHERE id = $1 LIMIT 1`,
    [userId],
  );
  if (existing.rows[0]?.referral_code) {
    return existing.rows[0].referral_code;
  }
  const code = await generateUniqueReferralCode(client);
  await client.query(`UPDATE users SET referral_code = $2, updated_at = NOW() WHERE id = $1`, [userId, code]);
  return code;
}

export async function ensureLibraryReferralCode(client: PoolClient, libraryId: string) {
  const existing = await client.query<{ referral_code: string | null }>(
    `SELECT referral_code FROM libraries WHERE id = $1 LIMIT 1`,
    [libraryId],
  );
  if (existing.rows[0]?.referral_code) {
    return existing.rows[0].referral_code;
  }
  const code = await generateUniqueReferralCode(client);
  await client.query(`UPDATE libraries SET referral_code = $2, updated_at = NOW() WHERE id = $1`, [libraryId, code]);
  return code;
}
