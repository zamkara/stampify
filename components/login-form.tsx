"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
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
                throw new Error(body?.message || "Login failed");
            }
            window.location.href = "/";
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="border-border bg-card">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl text-foreground">
                        Welcome back
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Use your Stampsu account to access Stampify
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="space-y-4" onSubmit={onSubmit}>
                        <div className="space-y-2">
                            <Label
                                className="text-sm text-foreground"
                                htmlFor="username"
                            >
                                Username
                            </Label>
                            <Input
                                id="username"
                                name="username"
                                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label
                                className="text-sm text-foreground"
                                htmlFor="password"
                            >
                                Password
                            </Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
                        >
                            {loading && <Spinner className="mr-2" />}
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                        {error && (
                            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-900">
                                {error}
                            </div>
                        )}
                    </form>
                </CardContent>
            </Card>
            <p className="text-center text-sm text-muted-foreground px-6">
                By signing in, you agree to Stampify terms of service and
                privacy policy.
            </p>
        </div>
    );
}
