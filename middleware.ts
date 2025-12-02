import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

// Cloudflare Pages needs edge runtime; use experimental-edge per Next.js warning.
export const runtime = "experimental-edge";

const sessionCookieName = "stampify_session";
const publicPaths = [
    "/login",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/me",
];

function isPublic(pathname: string) {
    return (
        publicPaths.some((p) => pathname.startsWith(p)) ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/static")
    );
}

function extractToken(req: NextRequest) {
    const header = req.headers.get("cookie");
    if (header) {
        const parts = header.split(";").map((p) => p.trim());
        const found = parts.find((p) => p.startsWith(`${sessionCookieName}=`));
        if (found) {
            return decodeURIComponent(found.split("=", 2)[1] || "");
        }
    }
    return req.cookies.get(sessionCookieName)?.value;
}

async function verify(token: string | undefined) {
    if (!token) return null;
    const secret = process.env.STAMPIFY_SESSION_SECRET;
    if (!secret) return null;
    try {
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(secret),
        );
        const { status, disabled, remainingDays } = payload as any;
        if (disabled || status !== "active" || (remainingDays ?? 0) <= 0)
            return null;
        return payload;
    } catch {
        return null;
    }
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    if (isPublic(pathname)) {
        return NextResponse.next();
    }

    const token = extractToken(req);
    const session = await verify(token);

    if (!session) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Pass through session to downstream via header (helps diagnose)
    const res = NextResponse.next();
    res.headers.set("x-session-user", (session as any)?.username || "");
    return res;
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
