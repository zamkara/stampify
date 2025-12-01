import { NextResponse } from "next/server";
import { createSessionResponse } from "@/lib/auth";

const STAMPSU_BASE =
    process.env.STAMPSU_BASE_URL || "https://stampsu.zamkara.workers.dev";
const STAMPIFY_API_KEY =
    process.env.STAMPIFY_API_KEY || process.env.STAMPSU_API_KEY;

export const runtime = "edge";

export async function POST(req: Request) {
    if (!STAMPIFY_API_KEY) {
        return NextResponse.json(
            { success: false, message: "STAMPIFY_API_KEY belum diatur" },
            { status: 500 },
        );
    }

    const { username, password } = await req.json();
    if (!username || !password) {
        return NextResponse.json(
            { success: false, message: "Username dan password wajib diisi" },
            { status: 400 },
        );
    }

    try {
        const res = await fetch(`${STAMPSU_BASE}/api/client/verify`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-api-key": STAMPIFY_API_KEY,
            },
            body: JSON.stringify({ username, password }),
        });

        const body = await res.json();
        if (!res.ok || !body?.success) {
            return NextResponse.json(
                { success: false, message: body?.message || "Login gagal" },
                { status: res.status || 401 },
            );
        }

        const data = body.data as {
            status: "active" | "expired" | "disabled";
            expiresAt: string;
            remainingDays: number;
            disabled: boolean;
            username: string;
        };

        return await createSessionResponse(
            {
                username: data.username,
                status: data.status,
                expiresAt: data.expiresAt,
                remainingDays: data.remainingDays,
                disabled: data.disabled,
            },
            { success: true, data },
        );
    } catch (err) {
        return NextResponse.json(
            {
                success: false,
                message: err instanceof Error ? err.message : "Login gagal",
            },
            { status: 500 },
        );
    }
}
