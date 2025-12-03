import type { Metadata } from "next";
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
        <div className="min-h-screen bg-background text-foreground px-6 py-10 flex items-center justify-center">
            <div className="grid w-full max-w-5xl gap-10 sm:gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-center">
                <LoginForm className="order-1 w-full lg:order-2" />
                <div className="order-2 flex flex-col gap-4 text-center lg:order-1 lg:items-start lg:text-left">
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                        <Link
                            href="/"
                            className="group flex items-center gap-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                        >
                            <div className="flex h-22 w-22 items-center justify-start transition duration-300 group-hover:scale-105">
                                <Image
                                    src={logo}
                                    alt="Stampify logo"
                                    className="h-18 w-18"
                                    priority
                                />
                            </div>
                            <div className="flex-col flex">
                                <span className="text-2xl font-semibold">
                                    Stampify
                                </span>
                                <Link
                                    className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                                    href="https://stampsu.zamkara.workers.dev"
                                >
                                    By stampsu
                                </Link>
                            </div>
                        </Link>
                    </div>
                    <p className="mx-auto max-w-sm text-md text-muted-foreground lg:mx-0">
                        By signing in, you agree to Stampify terms of service
                        and privacy policy. Your credentials are encrypted and
                        only used to authorize access.
                    </p>
                </div>
            </div>
        </div>
    );
}
