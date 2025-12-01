import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export const runtime = "edge";

export async function POST() {
    clearSession();
    return NextResponse.json({ success: true });
}
