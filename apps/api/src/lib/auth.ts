import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthContext } from "../types/express";

export type AccessTokenPayload = AuthContext & {
  type: "access";
};

export async function comparePassword(plainText: string, passwordHash: string) {
  return bcrypt.compare(plainText, passwordHash);
}

export async function hashPassword(plainText: string) {
  return bcrypt.hash(plainText, 12);
}

export function signAccessToken(payload: AuthContext) {
  const options: SignOptions = {
    expiresIn: env.jwtAccessTtl as SignOptions["expiresIn"],
  };

  return jwt.sign(
    {
      ...payload,
      type: "access",
    } satisfies AccessTokenPayload,
    env.jwtSecret,
    options,
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
}
