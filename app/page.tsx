import { SkuProcessor } from "@/components/sku-processor";
import { redirect } from "next/navigation";
import { sessionValid, readSession } from "@/lib/auth";

export default async function Home() {
    const session = await readSession();
    if (!sessionValid(session)) {
        redirect("/login?redirect=/");
    }
    return (
        <main className="min-h-screen bg-background">
            <SkuProcessor />
        </main>
    );
}
