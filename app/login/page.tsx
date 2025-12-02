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
                <LoginForm />

                <Link
                    href="#"
                    className="flex group items-center justify-center gap-4 self-center font-medium text-foreground"
                >
                    <div className="group-hover:scale-110 w-fit ease-in-out duration-300 text-secondary-foreground flex items-center justify-center">
                        <Image
                            src={logo}
                            alt="Stampify"
                            className="w-10 h-10"
                        />
                    </div>
                    <div className="">
                        Stampify
                        <p className="text-center text-xs text-muted-foreground">
                            By{" "}
                            <Link
                                className="text-foreground underline-offset-4 hover:underline"
                                href="https://stampsu.zamkara.workers.dev"
                            >
                                stampsu
                            </Link>
                        </p>
                    </div>
                    <p className="text-start max-w-60 text-sm text-muted-foreground">
                        By signing in, you agree to Stampify terms of service
                        and privacy policy.
                    </p>
                </Link>
            </div>
        </div>
    );
}
