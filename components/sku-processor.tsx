"use client";

import {
    useState,
    useCallback,
    useEffect,
    useRef,
    type RefObject,
    useMemo,
} from "react";
import JSZip from "jszip";
import { FileUploadZone } from "./file-upload-zone";
import { CatalogPreview } from "./catalog-preview";
import { ProcessingStatus } from "./processing-status";
import { Header } from "./header";
import { parseSKUFile, type Catalog } from "@/lib/sku-parser";
import { OrangeButton } from "@/components/ui/actbutton";
import {
    Download,
    Play,
    Trash2,
    RotateCcw,
    ClipboardPaste,
    Square,
    X,
    Eye,
    ArrowLeft,
    ArrowRight,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";

type DownloadedImage = { data: string; filename?: string };

const getBase64Size = (dataUrl: string) => {
    const base64 = dataUrl.split(",")[1] || "";
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    return Math.max(0, base64.length * 0.75 - padding);
};

const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(
        units.length - 1,
        Math.floor(Math.log(bytes) / Math.log(1024)),
    );
    const value = bytes / 1024 ** i;
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export type ProcessingState =
    | "idle"
    | "parsing"
    | "downloading"
    | "processing"
    | "zipping"
    | "complete"
    | "error";

export function SkuProcessor() {
    const [skuFile, setSkuFile] = useState<File | null>(null);
    const [skuText, setSkuText] = useState("");
    const [frameFile, setFrameFile] = useState<File | null>(null);
    const [frameImage, setFrameImage] = useState<HTMLImageElement | null>(null);
    const [catalogs, setCatalogs] = useState<Catalog[]>([]);
    const [processingState, setProcessingState] =
        useState<ProcessingState>("idle");
    const [progress, setProgress] = useState({
        current: 0,
        total: 0,
        message: "",
    });
    const [processedFiles, setProcessedFiles] = useState<
        { path: string; files: { filename: string; data: string }[] }[]
    >([]);
    const [error, setError] = useState<string | null>(null);
    const [failedDownloads, setFailedDownloads] = useState<
        { path: string; url: string; filename: string }[]
    >([]);
    const [parsingPaste, setParsingPaste] = useState(false);
    const [previewIndex, setPreviewIndex] = useState<number | null>(null);
    const [previewMeta, setPreviewMeta] = useState<{
        width?: number;
        height?: number;
        sizeLabel?: string;
    } | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const downloadSoundRef = useRef<HTMLAudioElement | null>(null);
    const completeSoundRef = useRef<HTMLAudioElement | null>(null);
    const hasPlayedCompleteSoundRef = useRef(false);
    const cancelRequestedRef = useRef(false);

    useEffect(() => {
        downloadSoundRef.current = new Audio(
            "https://cdn.freesound.org/previews/256/256760_876304-lq.ogg",
        );
        completeSoundRef.current = new Audio(
            "https://cdn.freesound.org/previews/51/51169_179538-lq.ogg",
        );
    }, []);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((res) => (res.ok ? res.json() : null))
            .then((body) => {
                if (body?.success && body.data?.username) {
                    setUsername(body.data.username);
                }
            })
            .catch(() => null);
    }, []);

    const playSound = useCallback(
        (audioRef: RefObject<HTMLAudioElement | null>) => {
            const audio = audioRef.current;
            if (audio) {
                audio.currentTime = 0;
                audio.play().catch(() => null);
            }
        },
        [],
    );

    useEffect(() => {
        if (
            processingState === "complete" &&
            processedFiles.some((cat) => cat.files.length > 0) &&
            !hasPlayedCompleteSoundRef.current
        ) {
            hasPlayedCompleteSoundRef.current = true;
            playSound(completeSoundRef);
        }
    }, [processingState, processedFiles, playSound]);

    const flattenedImages = useMemo(
        () =>
            processedFiles.flatMap((cat) =>
                cat.files.map((file) => ({
                    ...file,
                    path: cat.path,
                })),
            ),
        [processedFiles],
    );

    useEffect(() => {
        if (previewIndex !== null && previewIndex >= flattenedImages.length) {
            setPreviewIndex(flattenedImages.length ? 0 : null);
        }
    }, [previewIndex, flattenedImages.length]);

    useEffect(() => {
        if (previewIndex === null) {
            setPreviewMeta(null);
            return;
        }
        const current = flattenedImages[previewIndex];
        if (!current) {
            setPreviewMeta(null);
            return;
        }
        const sizeBytes = getBase64Size(current.data);
        setPreviewMeta({ sizeLabel: formatBytes(sizeBytes) });

        const img = new Image();
        img.onload = () =>
            setPreviewMeta((prev) => ({
                ...prev,
                width: img.width,
                height: img.height,
            }));
        img.src = current.data;

        return () => {
            img.onload = null;
        };
    }, [previewIndex, flattenedImages]);

    const navigatePreview = useCallback(
        (direction: 1 | -1) => {
            setPreviewIndex((current) => {
                if (current === null || flattenedImages.length === 0) {
                    return current;
                }
                const next =
                    (current + direction + flattenedImages.length) %
                    flattenedImages.length;
                return next;
            });
        },
        [flattenedImages.length],
    );

    const closePreview = useCallback(() => {
        setPreviewIndex(null);
        setPreviewMeta(null);
    }, []);

    useEffect(() => {
        if (previewIndex === null) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowRight") {
                e.preventDefault();
                navigatePreview(1);
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                navigatePreview(-1);
            } else if (e.key === "Escape") {
                e.preventDefault();
                closePreview();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [previewIndex, navigatePreview, closePreview]);

    const handleSkuUpload = useCallback(async (file: File) => {
        setSkuFile(file);
        setProcessingState("parsing");
        setError(null);

        try {
            const text = await file.text();
            const parsed = parseSKUFile(text);
            setCatalogs(parsed);
            setProcessingState("idle");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to parse SKU file",
            );
            setProcessingState("error");
        }
    }, []);

    const handleFrameUpload = useCallback((file: File) => {
        setFrameFile(file);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                setFrameImage(img);
                console.log(
                    "[v0] Frame image loaded:",
                    img.width,
                    "x",
                    img.height,
                );
            };
            img.onerror = () => {
                console.error("[v0] Failed to load frame image");
                setFrameImage(null);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    }, []);

    const downloadImage = async (
        url: string,
    ): Promise<DownloadedImage[] | null> => {
        try {
            const response = await fetch("/api/download", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.images)) {
                    return data.images
                        .map((img: any) => {
                            const base =
                                typeof img?.data === "string" ? img.data : null;
                            const filename =
                                typeof img?.filename === "string"
                                    ? img.filename
                                    : undefined;
                            return base ? { data: base, filename } : null;
                        })
                        .filter(
                            (
                                img: DownloadedImage | null,
                            ): img is DownloadedImage => Boolean(img),
                        );
                }
                if (data.imageData) {
                    return [{ data: data.imageData }];
                }
            }
            return null;
        } catch {
            return null;
        }
    };

    const handlePasteParse = async () => {
        if (!skuText.trim()) return;
        setParsingPaste(true);
        setError(null);
        try {
            const parsed = parseSKUFile(skuText);
            setCatalogs(parsed);
            setSkuFile(null);
            setProcessingState("idle");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to parse text",
            );
            setProcessingState("error");
        } finally {
            setParsingPaste(false);
        }
    };

    const applyFrameWithCanvas = (imageData: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            if (!frameImage) {
                resolve(imageData);
                return;
            }

            const baseImg = new Image();
            baseImg.crossOrigin = "anonymous";

            baseImg.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");

                    if (!ctx) {
                        console.error("[v0] Failed to get canvas context");
                        resolve(imageData);
                        return;
                    }

                    canvas.width = baseImg.width;
                    canvas.height = baseImg.height;

                    console.log(
                        "[v0] Canvas size:",
                        canvas.width,
                        "x",
                        canvas.height,
                    );

                    ctx.drawImage(baseImg, 0, 0);

                    ctx.drawImage(
                        frameImage,
                        0,
                        0,
                        canvas.width,
                        canvas.height,
                    );

                    console.log("[v0] Frame overlay applied successfully");

                    const result = canvas.toDataURL("image/png", 1.0);
                    resolve(result);
                } catch (err) {
                    console.error("[v0] Canvas processing error:", err);
                    resolve(imageData);
                }
            };

            baseImg.onerror = () => {
                console.error("[v0] Failed to load base image for canvas");
                resolve(imageData);
            };

            baseImg.src = imageData;
        });
    };

    const handleProcess = async () => {
        if (catalogs.length === 0) return;

        setProcessingState("downloading");
        setProcessedFiles([]);
        setFailedDownloads([]);
        setError(null);
        hasPlayedCompleteSoundRef.current = false;
        cancelRequestedRef.current = false;
        setPreviewIndex(null);
        setPreviewMeta(null);

        const totalUrls = catalogs.reduce(
            (acc, cat) => acc + cat.files.length,
            0,
        );
        let processedCount = 0;
        let totalExpected = totalUrls;
        const failed: { path: string; url: string; filename: string }[] = [];
        let cancelled = false;

        try {
            const results: {
                path: string;
                files: { filename: string; data: string }[];
            }[] = [];

            for (const catalog of catalogs) {
                if (cancelRequestedRef.current) {
                    cancelled = true;
                    break;
                }

                const catalogFiles: { filename: string; data: string }[] = [];

                for (const file of catalog.files) {
                    if (cancelRequestedRef.current) {
                        cancelled = true;
                        break;
                    }

                    const images = await downloadImage(file.url);

                    if (images && images.length > 0) {
                        if (images.length > 1) {
                            totalExpected += images.length - 1;
                        }

                        for (const img of images) {
                            if (cancelRequestedRef.current) {
                                cancelled = true;
                                break;
                            }

                            processedCount++;
                            setProgress({
                                current: processedCount,
                                total: totalExpected,
                                message: `Downloading: ${catalog.path} (${processedCount}/${totalExpected})`,
                            });

                            if (frameImage) {
                                setProcessingState("processing");
                                setProgress({
                                    current: processedCount,
                                    total: totalExpected,
                                    message: `Applying frame: ${catalog.path}`,
                                });
                            }

                            const processed = frameImage
                                ? await applyFrameWithCanvas(img.data)
                                : img.data;

                            if (cancelRequestedRef.current) {
                                cancelled = true;
                                break;
                            }

                            const finalName = img.filename || file.filename;
                            catalogFiles.push({
                                filename: finalName,
                                data: processed,
                            });
                            playSound(downloadSoundRef);
                            if (frameImage) {
                                setProcessingState("downloading");
                            }
                        }
                    } else {
                        failed.push({
                            path: catalog.path,
                            url: file.url,
                            filename: file.filename,
                        });
                    }
                }

                if (cancelled) {
                    break;
                }

                if (catalogFiles.length > 0) {
                    results.push({
                        path: catalog.path,
                        files: catalogFiles,
                    });
                }
            }

            setProcessedFiles(results);
            setFailedDownloads(failed);
            if (cancelled) {
                setProcessingState("idle");
                setProgress({
                    current: 0,
                    total: 0,
                    message: "Process cancelled",
                });
                return;
            }
            setProcessingState("complete");

            const successCount = results.reduce(
                (acc, cat) => acc + cat.files.length,
                0,
            );
            if (successCount === 0) {
                setError(
                    `All ${totalExpected} downloads failed. This usually means the files require Google account access or are not publicly shared with "Anyone with the link".`,
                );
            } else if (failed.length > 0) {
                setError(
                    `${failed.length} of ${totalExpected} files failed to download.`,
                );
            }
        } catch (err) {
            console.error("Processing error:", err);
            setError(err instanceof Error ? err.message : "Processing failed");
            setProcessingState("error");
        }
    };

    const handleRetryFailed = async () => {
        if (failedDownloads.length === 0) return;

        setProcessingState("downloading");
        setError(null);
        hasPlayedCompleteSoundRef.current = false;
        cancelRequestedRef.current = false;
        setPreviewIndex(null);
        setPreviewMeta(null);

        let retryCount = 0;
        const stillFailed: { path: string; url: string; filename: string }[] =
            [];
        const newResults = [...processedFiles];
        let cancelled = false;
        let totalExpected = failedDownloads.length;

        for (const { path, url, filename } of failedDownloads) {
            if (cancelRequestedRef.current) {
                cancelled = true;
                break;
            }

            const images = await downloadImage(url);

            if (images && images.length > 1) {
                totalExpected += images.length - 1;
            }

            if (images && images.length) {
                for (const img of images) {
                    retryCount++;
                    setProgress({
                        current: retryCount,
                        total: totalExpected,
                        message: `Retrying: ${path} (${retryCount}/${totalExpected})`,
                    });

                    if (cancelRequestedRef.current) {
                        cancelled = true;
                        break;
                    }

                    if (frameImage) {
                        setProcessingState("processing");
                        setProgress({
                            current: retryCount,
                            total: totalExpected,
                            message: `Applying frame: ${path}`,
                        });
                    }

                    const processed = frameImage
                        ? await applyFrameWithCanvas(img.data)
                        : img.data;
                    if (cancelRequestedRef.current) {
                        cancelled = true;
                        break;
                    }
                    const existingCatalog = newResults.find(
                        (r) => r.path === path,
                    );
                    const finalName = img.filename || filename;
                    if (existingCatalog) {
                        existingCatalog.files.push({
                            filename: finalName,
                            data: processed,
                        });
                    } else {
                        newResults.push({
                            path,
                            files: [{ filename: finalName, data: processed }],
                        });
                    }
                    playSound(downloadSoundRef);
                    if (frameImage) {
                        setProcessingState("downloading");
                    }
                }
            } else {
                retryCount++;
                setProgress({
                    current: retryCount,
                    total: totalExpected,
                    message: `Retrying: ${path} (${retryCount}/${totalExpected})`,
                });
                stillFailed.push({ path, url, filename });
            }
        }

        if (cancelled) {
            setProcessingState("idle");
            setProgress({
                current: 0,
                total: 0,
                message: "Process cancelled",
            });
            return;
        }

        setProcessedFiles(newResults);
        setFailedDownloads(stillFailed);
        setProcessingState("complete");

        if (stillFailed.length > 0) {
            setError(
                `${stillFailed.length} files still failed. They may require Google account access.`,
            );
        } else {
            setError(null);
        }
    };

    const buildZipFilename = useCallback(() => {
        const now = new Date();
        const pad = (value: number, length = 2) =>
            String(value).padStart(length, "0");
        const timestamp = `${pad(now.getDate())}${pad(
            now.getMonth() + 1,
        )}${now.getFullYear()}${pad(now.getHours())}${pad(
            now.getMinutes(),
        )}${pad(now.getSeconds())}${pad(now.getMilliseconds(), 3)}`;
        const user = username?.trim() || "user";
        return `${user}-${timestamp}.zip`;
    }, [username]);

    const handleDownloadZip = async () => {
        if (!processedFiles.length) return;
        setProcessingState("zipping");
        setProgress({ current: 0, total: 100, message: "Creating ZIP..." });

        try {
            const zip = new JSZip();

            for (const cat of processedFiles) {
                const folderPath = cat.path || "katalog";
                const folder = zip.folder(folderPath)!;
                cat.files.forEach((file) => {
                    const base64 = file.data.split(",")[1] || "";
                    folder.file(file.filename, base64, {
                        base64: true,
                    });
                });
            }

            const blob = await zip.generateAsync(
                { type: "blob" },
                (metadata) => {
                    setProgress({
                        current: Math.round(metadata.percent),
                        total: 100,
                        message: "Creating ZIP...",
                    });
                },
            );

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = buildZipFilename();
            a.click();
            URL.revokeObjectURL(url);

            setProcessingState("complete");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to create ZIP",
            );
            setProcessingState("error");
        }
    };

    const handleStopProcess = () => {
        cancelRequestedRef.current = true;
        setProgress((prev) => ({
            ...prev,
            message: "Stopping process...",
        }));
    };

    const openPreview = (path: string, filename: string) => {
        const idx = flattenedImages.findIndex(
            (item) => item.path === path && item.filename === filename,
        );
        if (idx !== -1) {
            setPreviewIndex(idx);
        }
    };

    const handleDownloadSingle = (
        imageData: string,
        path: string,
        filename: string,
    ) => {
        const a = document.createElement("a");
        a.href = imageData;
        a.download = path
            ? `${path.replace(/\//g, "-")}-${filename}`
            : filename;
        a.click();
    };

    const handleReset = () => {
        setSkuFile(null);
        setFrameFile(null);
        setFrameImage(null);
        setCatalogs([]);
        setProcessingState("idle");
        setProgress({ current: 0, total: 0, message: "" });
        setProcessedFiles([]);
        setFailedDownloads([]);
        setError(null);
        cancelRequestedRef.current = false;
        setPreviewIndex(null);
        setPreviewMeta(null);
    };

    const totalUrls = catalogs.reduce((acc, cat) => acc + cat.files.length, 0);
    const canProcess = catalogs.length > 0 && processingState === "idle";
    const isProcessing =
        processingState === "downloading" ||
        processingState === "processing" ||
        processingState === "zipping";
    const isComplete = processingState === "complete";
    const hasImages =
        processedFiles.length > 0 &&
        processedFiles.some((cat) => cat.files.length > 0);
    const totalProcessed = processedFiles.reduce(
        (acc, cat) => acc + cat.files.length,
        0,
    );
    const currentPreview =
        previewIndex !== null ? flattenedImages[previewIndex] : null;

    return (
        <div className="flex flex-col min-h-screen">
            <Header />

            <div className="flex-1 container max-w-6xl mx-auto px-4 py-8">
                <div className="space-y-8">
                    <section className="grid md:grid-cols-2 gap-6">
                        <Tabs defaultValue="upload" className="space-y-4">
                            <TabsList className="grid grid-cols-2 w-full">
                                <TabsTrigger value="upload">
                                    Upload SKU file
                                </TabsTrigger>
                                <TabsTrigger value="paste">
                                    Paste links
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="upload">
                                <FileUploadZone
                                    title="Upload SKU File"
                                    description="Text/TSV file containing folder paths with Google Drive or direct image links"
                                    accept=".txt,.tsv,.csv"
                                    className="-mb-4"
                                    onUpload={handleSkuUpload}
                                    file={skuFile}
                                    icon="file"
                                    subtitle="Recommended"
                                />
                            </TabsContent>
                            <TabsContent value="paste">
                                <div className="rounded-xl border bg-card p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <ClipboardPaste className="w-4 h-4" />
                                        Paste list of links
                                    </div>
                                    <Textarea
                                        className="min-h-[180px]"
                                        placeholder="Example:&#10;katalog/katalog-produk-1/raw    https://drive.google.com/file/d/.../view&#10;katalog/katalog-produk-2/final/image-1.png    https://cdn.domain.com/path/to/file.png"
                                        value={skuText}
                                        onChange={(e) =>
                                            setSkuText(e.target.value)
                                        }
                                    />
                                    <div className="flex justify-end">
                                        <OrangeButton
                                            onClick={handlePasteParse}
                                            disabled={parsingPaste}
                                        >
                                            {parsingPaste && (
                                                <Spinner className="mr-2" />
                                            )}
                                            {parsingPaste
                                                ? "Processing..."
                                                : "Parse text"}
                                        </OrangeButton>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                        <FileUploadZone
                            title="Upload Frame"
                            description="PNG image to overlay all downloaded images"
                            accept="image/png"
                            onUpload={handleFrameUpload}
                            file={frameFile}
                            icon="image"
                            subtitle={
                                frameImage
                                    ? `Frame loaded: ${frameImage.width}x${frameImage.height}px`
                                    : undefined
                            }
                        />
                    </section>

                    {catalogs.length > 0 && (
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">
                                        Detected Catalogs
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {catalogs.length} catalog(s),{" "}
                                        {totalUrls} total image(s)
                                        {frameImage &&
                                            " • Frame will be applied"}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <OrangeButton
                                        onClick={handleReset}
                                        disabled={isProcessing}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Reset
                                    </OrangeButton>
                                    <OrangeButton
                                        onClick={
                                            isProcessing
                                                ? handleStopProcess
                                                : handleProcess
                                        }
                                        disabled={!canProcess && !isProcessing}
                                    >
                                        {isProcessing ? (
                                            <Square className="w-4 h-4 mr-2" />
                                        ) : (
                                            <Play className="w-4 h-4 mr-2" />
                                        )}
                                        {isProcessing
                                            ? "Stop Process"
                                            : "Process Images"}
                                    </OrangeButton>
                                </div>
                            </div>
                            <CatalogPreview catalogs={catalogs} />
                        </section>
                    )}

                    {(isProcessing || error) && (
                        <ProcessingStatus
                            state={processingState}
                            progress={progress}
                            error={error}
                        />
                    )}

                    {isComplete && (
                        <section className="space-y-4 p-6 bg-card border border-border rounded-xl">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">
                                        {hasImages
                                            ? "Processing Complete"
                                            : "Processing Finished"}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        {hasImages
                                            ? `${totalProcessed} image(s) downloaded successfully`
                                            : "No images were successfully downloaded"}
                                        {failedDownloads.length > 0 &&
                                            ` • ${failedDownloads.length} failed`}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    {failedDownloads.length > 0 && (
                                        <OrangeButton
                                            onClick={handleRetryFailed}
                                        >
                                            <RotateCcw className="w-4 h-4 mr-2" />
                                            Retry Failed (
                                            {failedDownloads.length})
                                        </OrangeButton>
                                    )}
                                    {hasImages && (
                                        <OrangeButton
                                            onClick={handleDownloadZip}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Download All
                                        </OrangeButton>
                                    )}
                                </div>
                            </div>

                            {hasImages && (
                                <div className="space-y-6 mt-4">
                                    {processedFiles.map((cat, idx) => (
                                        <div
                                            key={`${cat.path}-${idx}`}
                                            className="space-y-3"
                                        >
                                            <h3 className="text-sm font-medium text-muted-foreground">
                                                {cat.path} ({cat.files.length}{" "}
                                                files)
                                            </h3>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                                {cat.files.map((file, idx) => (
                                                    <div
                                                        key={`${cat.path}-${idx}`}
                                                        className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                                        onClick={() =>
                                                            openPreview(
                                                                cat.path,
                                                                file.filename,
                                                            )
                                                        }
                                                    >
                                                        <img
                                                            src={
                                                                file.data ||
                                                                "/placeholder.svg"
                                                            }
                                                            alt={`${cat.path} ${file.filename}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Eye className="w-6 h-6 text-white" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!hasImages && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No images could be downloaded.</p>
                                    <p className="text-sm mt-2">
                                        Make sure Google Drive files are shared
                                        with "Anyone with the link" permission
                                        and direct links are accessible without
                                        authentication.
                                    </p>
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
            {currentPreview && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="relative w-full max-w-5xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
                        <div className="absolute top-3 right-3">
                            <button
                                onClick={closePreview}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors"
                                aria-label="Close preview"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex flex-col md:flex-row gap-6 p-2 pe-6">
                            <div className="flex-1 `min-h-80 bg-muted rounded-md overflow-hidden flex items-center justify-center border border-border">
                                <img
                                    src={currentPreview.data}
                                    alt={`${currentPreview.path} ${currentPreview.filename}`}
                                    className="max-h-[70vh] max-w-full object-contain"
                                />
                            </div>
                            <div className="w-full md:w-72 space-y-4 my-2 me-2">
                                <div>
                                    <p className="text-xs text-muted-foreground">
                                        Filename
                                    </p>
                                    <p className="text-sm font-medium break-all">
                                        {currentPreview.filename}
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Path
                                    </p>
                                    <p className="text-sm font-medium `wrap-break-word">
                                        {currentPreview.path || "-"}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">
                                            Dimensions
                                        </p>
                                        <p className="font-medium">
                                            {previewMeta?.width &&
                                            previewMeta?.height
                                                ? `${previewMeta.width} x ${previewMeta.height}px`
                                                : "Loading..."}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">
                                            Size
                                        </p>
                                        <p className="font-medium">
                                            {previewMeta?.sizeLabel || "—"}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <OrangeButton
                                        onClick={() =>
                                            handleDownloadSingle(
                                                currentPreview.data,
                                                currentPreview.path,
                                                currentPreview.filename,
                                            )
                                        }
                                        className="mt-8 justify-center"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </OrangeButton>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-4 right-4 flex gap-2">
                            <button
                                onClick={() => navigatePreview(-1)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors border border-border"
                                aria-label="Previous image"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => navigatePreview(1)}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground hover:bg-muted/80 transition-colors border border-border"
                                aria-label="Next image"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
