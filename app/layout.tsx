import type React from "react";
import type { Metadata, Viewport } from "next";
/* Vercel Analytics import removed */
import "./globals.css";

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
            <body className="font-sans antialiased">
                {children}
                {/* Vercel Analytics removed */}
            </body>
        </html>
    );
}
