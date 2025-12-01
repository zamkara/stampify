import { NextResponse } from "next/server";
import { readSession, sessionValid } from "@/lib/auth";

export const runtime = "edge";

export async function GET() {
    const session = await readSession();
    if (!sessionValid(session)) {
        return NextResponse.json(
            {
                success: false,
                message: "Unauthenticated",
                reason: session
                    ? "Session not active/expired/disabled"
                    : "No session",
                session,
            },
            { status: 401 },
        );
    }
    return NextResponse.json({ success: true, data: session });
}
