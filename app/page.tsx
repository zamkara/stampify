import { SkuProcessor } from "@/components/sku-processor";
import { redirect } from "next/navigation";
import { sessionValid, readSession } from "@/lib/auth";

export const runtime = "edge";

export default async function Home() {
    let session = null;
    try {
        session = await readSession();
    } catch (err) {
        console.error("readSession failed", err);
    }

    if (!sessionValid(session)) {
        redirect("/login?redirect=/");
    }
    return (
        <main className="min-h-screen bg-background">
            <SkuProcessor />
        </main>
    );
}
