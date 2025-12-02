import { GalleryVerticalEnd } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export const metadata = {
    title: "Login | Stampify",
};

export const runtime = "edge";

export default function LoginPage() {
    return (
        <div className="min-h-svh flex flex-col items-center justify-center gap-6 p-6 md:p-10 bg-background text-foreground">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Link
                    href="#"
                    className="flex items-center gap-2 self-center font-medium text-foreground"
                >
                    <div className="bg-secondary text-secondary-foreground flex size-8 items-center justify-center rounded-xl shadow-sm">
                        <GalleryVerticalEnd className="size-4" />
                    </div>
                    Stampify
                </Link>
                <LoginForm />
                <p className="text-center text-xs text-muted-foreground">
                    Manage users at{" "}
                    <Link
                        className="text-foreground underline-offset-4 hover:underline"
                        href="https://stampsu.zamkara.workers.dev"
                    >
                        Stampsu
                    </Link>
                </p>
            </div>
        </div>
    );
}
