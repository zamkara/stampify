import { clearSessionResponse } from "@/lib/auth";

export const runtime = "edge";

export async function POST() {
    return clearSessionResponse({ success: true });
}
