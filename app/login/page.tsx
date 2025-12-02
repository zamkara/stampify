import type { Metadata } from "next";
import { GalleryVerticalEnd } from "lucide-react";
import Link from "next/link";
import logo from "@/public/icon.svg";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
    title: "Login | Stampify",
};

export const runtime = "edge";

export default function LoginPage() {
    return (
        <div className="min-h-svh flex flex-col items-center justify-center gap-6 p-6 md:p-10 bg-background text-foreground">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Link
                    href="#"
                    className="flex group items-center gap-2 self-center font-medium text-foreground"
                >
                    <div className="bg-secondary text-secondary-foreground flex ease-in-out duration-300 size-0 group-hover:size-8 items-center justify-center rounded-xl shadow-sm">
                        {/*<GalleryVerticalEnd className="size-4" />*/}
                        <Image src={logo} alt="Stampify" className="w-8 h-8" />
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
                        stampsu
                    </Link>
                </p>
            </div>
        </div>
    );
}
