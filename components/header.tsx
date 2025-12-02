"use client";

import { useEffect, useState } from "react";
import logo from "@/public/icon.svg";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export function Header() {
    const [session, setSession] = useState<{
        username: string;
        remainingDays: number;
    } | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => (r.ok ? r.json() : null))
            .then((body) => {
                if (body?.success) {
                    setSession(body.data);
                }
            })
            .catch(() => {});
    }, []);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } finally {
            window.location.href = "/login";
        }
    };

    return (
        <header className="border-transparent hover:border-border border-b group bg-transparent hover:bg-card/50 ease-in-out duration-300 backdrop-blur-sm sticky top-0 py-4 z-50">
            <div className="container max-w-6xl mx-auto px-4 h-14 -translate-x-4 ease-in-out duration-300 group-hover:translate-x-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Image
                        src={logo}
                        alt="Stampify"
                        className="w-0 ease-in-out duration-300 group-hover:w-8 h-8"
                    />
                    <div>
                        <h1 className="font-semibold text-foreground leading-none">
                            Stampify
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            sales assistant
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {session && (
                        <>
                            <span className="text-foreground font-semibold">
                                {session.username}
                            </span>
                            <span className="text-white/60">
                                {session.remainingDays} days left
                            </span>
                            <button
                                onClick={handleLogout}
                                className="rounded-full border border-white/10 px-3 py-1 hover:bg-white/10 inline-flex items-center gap-1 disabled:opacity-60"
                                disabled={loggingOut}
                            >
                                {loggingOut ? (
                                    <Spinner className="h-3 w-3" />
                                ) : (
                                    <LogOut className="h-3 w-3" />
                                )}
                                {loggingOut ? "Keluar..." : "Keluar"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
