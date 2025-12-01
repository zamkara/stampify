import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
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
const cookieBase = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: true, // always secure because served via HTTPS on Pages
};

function getSecretBuffer() {
    const secret = process.env.STAMPIFY_SESSION_SECRET;
    if (!secret) return null;
    return new TextEncoder().encode(secret);
}

function ensureSecretBuffer() {
    const buf = getSecretBuffer();
    if (!buf) {
        throw new Error("STAMPIFY_SESSION_SECRET belum diatur");
    }
    return buf;
}

export async function createSessionResponse<T>(
    payload: SessionPayload,
    body: T,
    status = 200,
) {
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("12h")
        .sign(ensureSecretBuffer());

    const res = NextResponse.json(body, { status });
    res.cookies.set({
        name: sessionCookieName,
        value: token,
        ...cookieBase,
        maxAge: 60 * 60 * 12,
    });
    return res;
}

export function clearSessionResponse<T>(body: T, status = 200) {
    const res = NextResponse.json(body, { status });
    res.cookies.set({
        name: sessionCookieName,
        value: "",
        ...cookieBase,
        maxAge: 0,
    });
    return res;
}

function extractTokenFromHeader(req?: Request | NextRequest) {
    const cookieHeader = req?.headers.get("cookie");
    if (!cookieHeader) return null;
    const parts = cookieHeader.split(";").map((p) => p.trim());
    const tokenPart = parts.find((p) => p.startsWith(`${sessionCookieName}=`));
    if (!tokenPart) return null;
    return decodeURIComponent(tokenPart.split("=", 2)[1] || "");
}

export async function readSession(
    req?: Request | NextRequest,
): Promise<SessionPayload | null> {
    let token: string | undefined | null = extractTokenFromHeader(req);

    if (!token) {
        try {
            // Fallback for server components / environments where cookies() works
            token = cookies().get(sessionCookieName)?.value;
        } catch {
            token = null;
        }
    }

    if (!token) return null;
    const secret = getSecretBuffer();
    if (!secret) return null;
    try {
        const { payload } = await jwtVerify(token, secret);
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
