import { SkuProcessor } from "@/components/sku-processor";

export const runtime = "edge";

// Middleware sudah memaksa autentikasi; halaman tidak perlu cek ulang.
export default function Home() {
    return (
        <main className="min-h-screen bg-background">
            <SkuProcessor />
        </main>
    );
}
