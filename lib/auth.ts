import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export type SessionStatus = "active" | "expired" | "disabled";
export type SessionPayload = {
  username: string;
  status: SessionStatus;
  expiresAt: string;
  remainingDays: number;
  disabled: boolean;
};

const sessionCookieName = "stampify_session";

function getSecret() {
  const secret = process.env.STAMPIFY_SESSION_SECRET;
  if (!secret) throw new Error("STAMPIFY_SESSION_SECRET belum diatur");
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(getSecret());

  cookies().set({
    name: sessionCookieName,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function clearSession() {
  cookies().set({
    name: sessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = cookies().get(sessionCookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function sessionValid(session: SessionPayload | null) {
  if (!session) return false;
  if (session.disabled) return false;
  if (session.status !== "active") return false;
  if (session.remainingDays <= 0) return false;
  return true;
}
