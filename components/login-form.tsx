"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function LoginForm() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const body = await res.json();
            if (!res.ok || !body?.success) {
                throw new Error(body?.message || "Login gagal");
            }
            window.location.href = "/";
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login gagal");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
                <Label className="text-sm text-white/80" htmlFor="username">
                    Username
                </Label>
                <Input
                    id="username"
                    name="username"
                    className={cn(
                        "bg-white/5 border-white/10 text-white placeholder:text-white/40",
                        "focus-visible:ring-primary",
                    )}
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                />
            </div>
            <div className="space-y-2">
                <Label className="text-sm text-white/80" htmlFor="password">
                    Password
                </Label>
                <Input
                    id="password"
                    name="password"
                    type="password"
                    className={cn(
                        "bg-white/5 border-white/10 text-white placeholder:text-white/40",
                        "focus-visible:ring-primary",
                    )}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                />
            </div>
            <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-slate-900 hover:opacity-90 disabled:opacity-60"
            >
                {loading ? "Masuk..." : "Masuk"}
            </Button>
            {error && (
                <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                    {error}
                </div>
            )}
        </form>
    );
}
