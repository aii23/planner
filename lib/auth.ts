import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string {
  const secret = process.env.AUTH_GATE_PASSWORD;
  if (!secret) throw new Error("AUTH_GATE_PASSWORD env var is required");
  return secret;
}

export function signToken(payload: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(payload);
  return `${payload}.${hmac.digest("hex")}`;
}

export function verifyToken(token: string): boolean {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;

  const payload = token.slice(0, lastDot);
  const expected = signToken(payload);

  if (expected.length !== token.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}
