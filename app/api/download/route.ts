import { type NextRequest, NextResponse } from "next/server";
export const runtime = "edge";

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function toBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function isGoogleDriveShareLink(url: string): boolean {
    return /drive\.google\.com\/(file\/d\/|open\?id=|uc\?)/i.test(url);
}

function detectMimeFromBuffer(buffer: ArrayBuffer, fallback: string): string {
    const bytes = new Uint8Array(buffer.slice(0, 4));
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
    if (bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
    if (bytes[0] === 0x52 && bytes[1] === 0x49) return "image/webp";
    return fallback;
}

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();

        if (!url || typeof url !== "string") {
            return NextResponse.json(
                { error: "URL is required" },
                { status: 400 },
            );
        }

        if (!/^https?:\/\//i.test(url)) {
            return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
        }

        let imageBuffer: ArrayBuffer | null = null;
        let contentType = "image/jpeg";

        if (isGoogleDriveShareLink(url)) {
            const fileIdMatch =
                url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
            const fileId = fileIdMatch?.[1];
            if (!fileId) {
                return NextResponse.json(
                    { error: "Invalid Google Drive URL" },
                    { status: 400 },
                );
            }

            const downloadStrategies = [
                `https://lh3.googleusercontent.com/d/${fileId}`,
                `https://drive.google.com/uc?export=download&id=${fileId}`,
                `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`,
                `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
            ];

            let cookies = "";

            for (const downloadUrl of downloadStrategies) {
                try {
                    const response = await fetch(downloadUrl, {
                        headers: {
                            "User-Agent": USER_AGENT,
                            Accept: "image/*,*/*;q=0.8",
                            "Accept-Language": "en-US,en;q=0.9",
                            ...(cookies ? { Cookie: cookies } : {}),
                        },
                        redirect: "follow",
                    });

                    const setCookie = response.headers.get("set-cookie");
                    if (setCookie) {
                        cookies = setCookie;
                    }

                    const responseContentType =
                        response.headers.get("content-type") || "";

                    if (responseContentType.includes("text/html")) {
                        const html = await response.text();

                        const confirmMatch =
                            html.match(/confirm=([^&"]+)/) ||
                            html.match(/confirm=([a-zA-Z0-9_-]+)/);
                        if (confirmMatch) {
                            const confirmToken = confirmMatch[1];
                            const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`;

                            const confirmResponse = await fetch(confirmUrl, {
                                headers: {
                                    "User-Agent": USER_AGENT,
                                    Accept: "image/*,*/*;q=0.8",
                                    ...(cookies ? { Cookie: cookies } : {}),
                                },
                                redirect: "follow",
                            });

                            const confirmContentType =
                                confirmResponse.headers.get("content-type") ||
                                "";
                            if (
                                !confirmContentType.includes("text/html") &&
                                confirmResponse.ok
                            ) {
                                imageBuffer =
                                    await confirmResponse.arrayBuffer();
                                contentType =
                                    confirmContentType || "image/jpeg";
                                break;
                            }
                        }

                        const downloadLinkMatch = html.match(
                            /href="(\/uc\?export=download[^"]+)"/,
                        );
                        if (downloadLinkMatch) {
                            const extractedUrl = `https://drive.google.com${downloadLinkMatch[1].replace(/&amp;/g, "&")}`;

                            const extractedResponse = await fetch(
                                extractedUrl,
                                {
                                    headers: {
                                        "User-Agent": USER_AGENT,
                                        ...(cookies ? { Cookie: cookies } : {}),
                                    },
                                    redirect: "follow",
                                },
                            );

                            if (extractedResponse.ok) {
                                const extractedContentType =
                                    extractedResponse.headers.get(
                                        "content-type",
                                    ) || "";
                                if (
                                    !extractedContentType.includes("text/html")
                                ) {
                                    imageBuffer =
                                        await extractedResponse.arrayBuffer();
                                    contentType =
                                        extractedContentType || "image/jpeg";
                                    break;
                                }
                            }
                        }

                        continue;
                    }

                    if (
                        response.ok &&
                        (responseContentType.includes("image/") ||
                            responseContentType.includes(
                                "application/octet-stream",
                            ))
                    ) {
                        imageBuffer = await response.arrayBuffer();
                        contentType = responseContentType.includes("image/")
                            ? responseContentType
                            : "image/jpeg";
                        break;
                    }
                } catch {
                    continue;
                }
            }

            if (!imageBuffer) {
                const fallbackUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=t`;

                try {
                    const finalResponse = await fetch(fallbackUrl, {
                        headers: {
                            "User-Agent": USER_AGENT,
                            Accept: "image/*,*/*;q=0.8",
                        },
                        redirect: "follow",
                    });

                    const finalContentType =
                        finalResponse.headers.get("content-type") || "";
                    if (
                        finalResponse.ok &&
                        !finalContentType.includes("text/html")
                    ) {
                        imageBuffer = await finalResponse.arrayBuffer();
                        contentType = finalContentType.includes("image/")
                            ? finalContentType
                            : "image/jpeg";
                    }
                } catch {
                    // Final fallback failed
                }
            }
        } else {
            try {
                const directResponse = await fetch(url, {
                    headers: {
                        "User-Agent": USER_AGENT,
                        Accept: "image/*,*/*;q=0.8",
                    },
                    redirect: "follow",
                });

                const directContentType =
                    directResponse.headers.get("content-type") || "";
                if (
                    directResponse.ok &&
                    !directContentType.includes("text/html")
                ) {
                    imageBuffer = await directResponse.arrayBuffer();
                    contentType = directContentType || "image/jpeg";
                }
            } catch {
                // Direct fetch failed
            }
        }

        if (!imageBuffer || imageBuffer.byteLength < 500) {
            return NextResponse.json(
                {
                    error: "Could not download file. Ensure the link is publicly accessible.",
                },
                { status: 500 },
            );
        }

        const finalContentType = detectMimeFromBuffer(imageBuffer, contentType);
        const base64 = toBase64(imageBuffer);

        return NextResponse.json({
            imageData: `data:${finalContentType};base64,${base64}`,
        });
    } catch (error) {
        console.error("Download error:", error);
        return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }
}
