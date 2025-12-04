import { type NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

const USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const DRIVE_API_KEY = process.env.GOOGLE_DRIVE_API_KEY;

function toBase64(buffer: ArrayBuffer): string {
    if (typeof Buffer !== "undefined") {
        return Buffer.from(buffer).toString("base64");
    }

    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    // btoa is not available in Node but is available on edge runtimes
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return btoa(binary);
}

function isGoogleDriveShareLink(url: string): boolean {
    return /drive\.google\.com\/(file\/d\/|open\?id=|uc\?)/i.test(url);
}

function isGoogleDriveFolderLink(url: string): boolean {
    return /drive\.google\.com\/(?:drive\/)?folders\/([^/?#]+)/i.test(url);
}

function extractDriveFolderId(url: string): string | null {
    const directMatch = url.match(
        /drive\.google\.com\/(?:drive\/)?folders\/([^/?#]+)/i,
    );
    if (directMatch?.[1]) return directMatch[1];

    const queryMatch = url.match(/[?&]id=([^&#]+)/i);
    if (queryMatch?.[1]) return queryMatch[1];

    return null;
}

function detectMimeFromBuffer(buffer: ArrayBuffer, fallback: string): string {
    const bytes = new Uint8Array(buffer.slice(0, 4));
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
    if (bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
    if (bytes[0] === 0x47 && bytes[1] === 0x49) return "image/gif";
    if (bytes[0] === 0x52 && bytes[1] === 0x49) return "image/webp";
    return fallback;
}

async function fetchDriveMetadata(fileId: string) {
    if (!DRIVE_API_KEY) return null;
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType&key=${DRIVE_API_KEY}`;
    const response = await fetch(url, {
        headers: {
            "User-Agent": USER_AGENT,
        },
    });
    if (!response.ok) return null;
    return (await response.json()) as {
        name?: string;
        mimeType?: string;
    } | null;
}

function filenameFromContentDisposition(
    header: string | null,
): string | undefined {
    if (!header) return undefined;

    const filenameStar = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (filenameStar?.[1]) {
        try {
            return decodeURIComponent(
                filenameStar[1].trim().replace(/(^"|"$)/g, ""),
            );
        } catch {
            // ignore
        }
    }

    const filenameMatch = header.match(/filename\s*=\s*([^;]+)/i);
    if (filenameMatch?.[1]) {
        const cleaned = filenameMatch[1].trim().replace(/(^"|"$)/g, "");
        if (cleaned) return cleaned;
    }
    return undefined;
}

type DriveListItem = {
    id: string;
    name: string;
    mimeType?: string;
    path: string;
};

async function listDriveFolderFiles(
    folderId: string,
    basePath = "",
): Promise<DriveListItem[]> {
    if (!DRIVE_API_KEY) return [];

    const query = encodeURIComponent(
        `'${folderId}' in parents and trashed=false`,
    );
    const fields = "files(id,name,mimeType,size),nextPageToken";
    const baseUrl = `https://www.googleapis.com/drive/v3/files`;
    const files: DriveListItem[] = [];
    let pageToken = "";

    while (true) {
        const url = `${baseUrl}?q=${query}&fields=${fields}&pageSize=200&includeItemsFromAllDrives=true&supportsAllDrives=true${pageToken ? `&pageToken=${pageToken}` : ""}&key=${DRIVE_API_KEY}`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": USER_AGENT,
            },
        });

        if (!response.ok) break;
        const data = await response.json();
        if (Array.isArray(data?.files)) {
            files.push(
                ...data.files.map(
                    (f: any) =>
                        ({
                            id: f.id,
                            name: f.name,
                            mimeType: f.mimeType,
                            path: basePath,
                        }) as DriveListItem,
                ),
            );
        }
        if (!data?.nextPageToken) break;
        pageToken = data.nextPageToken;
    }

    return files;
}

async function downloadDriveFile(fileId: string) {
    if (!DRIVE_API_KEY) return null;

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true&acknowledgeAbuse=true&key=${DRIVE_API_KEY}`;
    const response = await fetch(url, {
        headers: {
            "User-Agent": USER_AGENT,
            Accept: "image/*,*/*;q=0.8",
        },
    });

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const contentType =
        response.headers.get("content-type") || "application/octet-stream";

    if (!buffer || buffer.byteLength === 0) return null;

    const finalContentType = detectMimeFromBuffer(buffer, contentType);
    const filename = filenameFromContentDisposition(
        response.headers.get("content-disposition"),
    );

    return {
        data: `data:${finalContentType};base64,${toBase64(buffer)}`,
        contentType: finalContentType,
        filename,
    };
}

async function downloadDriveFileWithFallback(
    fileId: string,
    preferredName?: string,
) {
    // 1) Try Drive API (if key exists)
    const apiResult = await downloadDriveFile(fileId);
    if (apiResult?.data) {
        return {
            data: apiResult.data,
            filename: apiResult.filename || preferredName,
        };
    }

    // 2) Fallback public URLs similar to share link flow
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
            if (setCookie) cookies = setCookie;

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
                        confirmResponse.headers.get("content-type") || "";
                    if (
                        !confirmContentType.includes("text/html") &&
                        confirmResponse.ok
                    ) {
                        const buffer = await confirmResponse.arrayBuffer();
                        const finalType = detectMimeFromBuffer(
                            buffer,
                            confirmContentType || "image/jpeg",
                        );
                        const name =
                            filenameFromContentDisposition(
                                confirmResponse.headers.get(
                                    "content-disposition",
                                ),
                            ) || preferredName;
                        return {
                            data: `data:${finalType};base64,${toBase64(buffer)}`,
                            filename: name,
                        };
                    }
                }

                const downloadLinkMatch = html.match(
                    /href="(\/uc\?export=download[^"]+)"/,
                );
                if (downloadLinkMatch) {
                    const extractedUrl = `https://drive.google.com${downloadLinkMatch[1].replace(/&amp;/g, "&")}`;

                    const extractedResponse = await fetch(extractedUrl, {
                        headers: {
                            "User-Agent": USER_AGENT,
                            ...(cookies ? { Cookie: cookies } : {}),
                        },
                        redirect: "follow",
                    });

                    if (extractedResponse.ok) {
                        const extractedContentType =
                            extractedResponse.headers.get("content-type") || "";
                        if (!extractedContentType.includes("text/html")) {
                            const buffer =
                                await extractedResponse.arrayBuffer();
                            const finalType = detectMimeFromBuffer(
                                buffer,
                                extractedContentType || "image/jpeg",
                            );
                            const name =
                                filenameFromContentDisposition(
                                    extractedResponse.headers.get(
                                        "content-disposition",
                                    ),
                                ) || preferredName;
                            return {
                                data: `data:${finalType};base64,${toBase64(buffer)}`,
                                filename: name,
                            };
                        }
                    }
                }
                continue;
            }

            if (
                response.ok &&
                (responseContentType.includes("image/") ||
                    responseContentType.includes("application/octet-stream"))
            ) {
                const buffer = await response.arrayBuffer();
                const finalType = detectMimeFromBuffer(
                    buffer,
                    responseContentType || "image/jpeg",
                );
                const name =
                    filenameFromContentDisposition(
                        response.headers.get("content-disposition"),
                    ) || preferredName;
                return {
                    data: `data:${finalType};base64,${toBase64(buffer)}`,
                    filename: name,
                };
            }
        } catch {
            continue;
        }
    }

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
        if (finalResponse.ok && !finalContentType.includes("text/html")) {
            const buffer = await finalResponse.arrayBuffer();
            const finalType = detectMimeFromBuffer(
                buffer,
                finalContentType || "image/jpeg",
            );
            const name =
                filenameFromContentDisposition(
                    finalResponse.headers.get("content-disposition"),
                ) || preferredName;
            return {
                data: `data:${finalType};base64,${toBase64(buffer)}`,
                filename: name,
            };
        }
    } catch {
        // ignore
    }

    return null;
}

function extractFilenameFromUrl(url: string): string | undefined {
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        const last = parts[parts.length - 1];
        if (!last) return undefined;
        const decoded = decodeURIComponent(last);
        return decoded.includes(".") ? decoded : undefined;
    } catch {
        return undefined;
    }
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
        let filename: string | undefined;

        if (isGoogleDriveFolderLink(url)) {
            if (!DRIVE_API_KEY) {
                return NextResponse.json(
                    {
                        error: "Google Drive API key is not configured for folder downloads.",
                    },
                    { status: 500 },
                );
            }

            const folderId = extractDriveFolderId(url);
            if (!folderId) {
                return NextResponse.json(
                    { error: "Invalid Google Drive folder URL" },
                    { status: 400 },
                );
            }

            const stack: { id: string; path: string }[] = [
                { id: folderId, path: "" },
            ];
            const collected: DriveListItem[] = [];

            while (stack.length) {
                const current = stack.pop();
                if (!current) break;
                const entries = await listDriveFolderFiles(
                    current.id,
                    current.path,
                );
                for (const entry of entries) {
                    if (
                        entry.mimeType === "application/vnd.google-apps.folder"
                    ) {
                        stack.push({
                            id: entry.id,
                            path: `${entry.path}${entry.name}/`,
                        });
                    } else if (
                        !entry.mimeType?.startsWith(
                            "application/vnd.google-apps",
                        )
                    ) {
                        collected.push({
                            ...entry,
                            path: `${entry.path}${entry.name}`,
                        });
                    }
                }
            }

            const validFiles = collected;

            if (!validFiles.length) {
                return NextResponse.json(
                    {
                        error: "Folder is empty or contains no downloadable images.",
                    },
                    { status: 404 },
                );
            }

            const downloads: { data: string; filename: string }[] = [];

            for (const file of validFiles) {
                const downloaded = await downloadDriveFileWithFallback(
                    file.id,
                    file.path || file.name,
                );
                if (downloaded?.data) {
                    downloads.push({
                        data: downloaded.data,
                        filename: file.path || file.name || "image",
                    });
                }
            }

            if (!downloads.length) {
                return NextResponse.json(
                    {
                        error: "Could not download any files from the folder. Ensure items are publicly accessible.",
                    },
                    { status: 500 },
                );
            }

            return NextResponse.json({ images: downloads });
        } else if (isGoogleDriveShareLink(url)) {
            const fileIdMatch =
                url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
            const fileId = fileIdMatch?.[1];
            if (!fileId) {
                return NextResponse.json(
                    { error: "Invalid Google Drive URL" },
                    { status: 400 },
                );
            }

            if (DRIVE_API_KEY) {
                const meta = await fetchDriveMetadata(fileId);
                if (meta?.name) {
                    filename = meta.name;
                }
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
                                filename =
                                    filename ||
                                    filenameFromContentDisposition(
                                        confirmResponse.headers.get(
                                            "content-disposition",
                                        ),
                                    );
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
                                    filename =
                                        filename ||
                                        filenameFromContentDisposition(
                                            extractedResponse.headers.get(
                                                "content-disposition",
                                            ),
                                        );
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
                        filename =
                            filename ||
                            filenameFromContentDisposition(
                                response.headers.get("content-disposition"),
                            );
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
                        filename =
                            filename ||
                            filenameFromContentDisposition(
                                finalResponse.headers.get(
                                    "content-disposition",
                                ),
                            );
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
                    filename =
                        filename ||
                        filenameFromContentDisposition(
                            directResponse.headers.get("content-disposition"),
                        ) ||
                        extractFilenameFromUrl(url);
                }
            } catch {
                // Direct fetch failed
            }
        }

        if (!imageBuffer || imageBuffer.byteLength === 0) {
            return NextResponse.json(
                {
                    error: "Could not download file. Ensure the link is publicly accessible.",
                },
                { status: 500 },
            );
        }

        const finalContentType = detectMimeFromBuffer(imageBuffer, contentType);
        const base64 = toBase64(imageBuffer);
        const dataUrl = `data:${finalContentType};base64,${base64}`;

        return NextResponse.json({
            imageData: dataUrl,
            images: [{ data: dataUrl, filename }],
        });
    } catch (error) {
        console.error("Download error:", error);
        return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }
}
