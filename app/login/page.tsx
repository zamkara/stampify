import Link from "next/link";
import LoginForm from "@/components/login-form";

export const metadata = {
    title: "Login | Stampify",
};

export const runtime = "edge";

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center px-4">
            <div className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
                <div className="space-y-2 text-center">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/60">
                        Stampify Access
                    </p>
                    <h1 className="text-2xl font-semibold">Masuk</h1>
                    <p className="text-sm text-white/60">
                        Gunakan akun yang dikelola dari Stampsu untuk
                        melanjutkan.
                    </p>
                </div>
                <LoginForm />
                <p className="text-center text-xs text-white/50">
                    Manajemen user:{" "}
                    <Link
                        className="text-primary underline-offset-4 hover:underline"
                        href="https://stampsu.zamkara.workers.dev"
                    >
                        Stampsu
                    </Link>
                </p>
            </div>
        </main>
    );
}
