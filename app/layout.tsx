import type React from "react";
import type { Metadata, Viewport } from "next";
/* Vercel Analytics import removed */
import "./globals.css";

export const runtime = "edge";

export const metadata: Metadata = {
    title: "SKU Image Processor",
    description:
        "Batch process catalog images from Google Drive with frame overlay",
    generator: "v0.app",
    icons: {
        icon: [
            {
                url: "/icon-light-32x32.png",
                media: "(prefers-color-scheme: light)",
            },
            {
                url: "/icon-dark-32x32.png",
                media: "(prefers-color-scheme: dark)",
            },
            {
                url: "/icon.svg",
                type: "image/svg+xml",
            },
        ],
        apple: "/apple-icon.png",
    },
};

export const viewport: Viewport = {
    themeColor: "#1a1a1a",
    width: "device-width",
    initialScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="font-sans max-w-4xl mx-auto antialiased">
                <div className="flex min-h-screen flex-col">
                    {children}
                    <footer className="ease-in-out duration-300 transition-all mx-auto items-center justify-center py-4 text-sm text-muted-foreground">
                        <a
                            href="https://github.com/zamkara"
                            className="hover:text-foreground"
                        >
                            © 2025 Almatera incubator
                        </a>
                    </footer>
                </div>
                {/* Vercel Analytics removed */}
            </body>
        </html>
    );
}
