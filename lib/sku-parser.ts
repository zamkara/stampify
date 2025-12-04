const DEFAULT_ROOT = "katalog";
const URL_REGEX = /(https?:\/\/[^\s]+)/i;
const PARENTHETICAL_REGEX = /\(([^()]+)\)\s*$/;

export interface CatalogFile {
    url: string;
    filename: string;
}

export interface Catalog {
    name: string;
    path: string;
    files: CatalogFile[];
}

export function parseSKUFile(content: string): Catalog[] {
    const lines = content.split(/\r?\n/);
    const catalogs = new Map<string, Catalog>();
    const counters = new Map<string, number>();
    let currentFolder = DEFAULT_ROOT;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const columns = line
            .split("\t")
            .map((col) => col.trim())
            .filter(Boolean);

        // Skip known headers
        if (
            columns.some(
                (col) =>
                    /^SKU$/i.test(col) ||
                    /Packshot/i.test(col) ||
                    /Etalase/i.test(col),
            )
        ) {
            continue;
        }

        // Find URL anywhere in the line so we can support both Drive and CDN/direct links
        const urlFromColumns = columns.find(isLikelyUrl);
        const urlFromLine = line.match(URL_REGEX)?.[0];
        const url = urlFromColumns || urlFromLine;

        if (!url) {
            // Treat as a folder marker to preserve tree structure for subsequent rows
            const folderPath = sanitizeFolderPath(line);
            if (folderPath) {
                currentFolder = folderPath;
            }
            continue;
        }

        // Use any non-url column as a folder/file hint; otherwise fallback to the last seen folder
        const pathHint =
            columns.find((col) => col !== url) ||
            line.replace(url, "").trim() ||
            currentFolder;
        const parentheticalName = extractParentheticalName(line, url);
        const { folderPath, explicitFilename } = splitPath(
            pathHint || DEFAULT_ROOT,
        );
        currentFolder = folderPath;

        const catalog = ensureCatalog(folderPath, catalogs);
        const count = counters.get(folderPath) ?? 0;
        const inferredExtension = guessExtensionFromUrl(url) || ".png";
        const explicitFromParentheses = sanitizeFilename(parentheticalName);
        const filename =
            sanitizeFilename(explicitFilename) ||
            explicitFromParentheses ||
            `image-${count + 1}${inferredExtension}`;

        counters.set(folderPath, count + 1);
        catalog.files.push({
            url: normalizeDriveUrl(url),
            filename,
        });
    }

    return Array.from(catalogs.values());
}

function ensureCatalog(
    path: string,
    catalogMap: Map<string, Catalog>,
): Catalog {
    const existing = catalogMap.get(path);
    if (existing) return existing;

    const name = path.split("/").filter(Boolean).pop() || path || DEFAULT_ROOT;
    const catalog: Catalog = { name, path, files: [] };
    catalogMap.set(path, catalog);
    return catalog;
}

function splitPath(input: string): {
    folderPath: string;
    explicitFilename: string;
} {
    const cleaned = sanitizeFolderPath(input);
    const parts = cleaned.split("/").filter(Boolean);

    if (parts.length === 0) {
        return { folderPath: DEFAULT_ROOT, explicitFilename: "" };
    }

    const maybeFile = parts[parts.length - 1];
    if (/\.[a-z0-9]{2,4}$/i.test(maybeFile)) {
        parts.pop();
        return {
            folderPath: parts.join("/") || DEFAULT_ROOT,
            explicitFilename: sanitizeFilename(maybeFile),
        };
    }

    return { folderPath: cleaned || DEFAULT_ROOT, explicitFilename: "" };
}

function sanitizeFolderPath(path: string): string {
    return path
        .replace(/\\/g, "/")
        .replace(/^\.*\//, "")
        .replace(/\.\./g, "")
        .replace(/\/+/g, "/")
        .replace(/[?%*:|"<>]/g, "")
        .trim();
}

function sanitizeFilename(name: string): string {
    return name
        .replace(/[\\/?%*:|"<>]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function isLikelyUrl(value: string): boolean {
    return /^https?:\/\//i.test(value) || /drive\.google\.com/i.test(value);
}

function guessExtensionFromUrl(url: string): string {
    try {
        const parsed = new URL(url);
        const match = parsed.pathname.match(/\.(jpe?g|png|gif|webp)$/i);
        return match ? match[0].toLowerCase() : "";
    } catch {
        return "";
    }
}

function normalizeDriveUrl(url: string): string {
    const fileId = extractGoogleDriveId(url);
    if (!fileId) return url.trim();
    return `https://drive.google.com/uc?id=${fileId}`;
}

function extractGoogleDriveId(url: string): string | null {
    let match = url.match(/file\/d\/([^/]+)/);
    if (match) return match[1];

    match = url.match(/id=([^&]+)/);
    if (match) return match[1];

    if (/folders\//.test(url)) return null;

    return null;
}

function extractParentheticalName(line: string, url: string): string {
    const withoutUrl = line.replace(url, "").trim();
    const match = withoutUrl.match(PARENTHETICAL_REGEX);
    return match?.[1]?.trim() || "";
}
