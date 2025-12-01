"use client";

import { useState, useCallback } from "react";
import JSZip from "jszip";
import { FileUploadZone } from "./file-upload-zone";
import { CatalogPreview } from "./catalog-preview";
import { ProcessingStatus } from "./processing-status";
import { Header } from "./header";
import { parseSKUFile, type Catalog } from "@/lib/sku-parser";
import { Button } from "@/components/ui/button";
import { Download, Play, Trash2, RotateCcw } from "lucide-react";

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
  const [processedImages, setProcessedImages] = useState<
    { catalog: string; images: string[] }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [failedDownloads, setFailedDownloads] = useState<
    { catalog: string; url: string }[]
  >([]);

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
      setError(err instanceof Error ? err.message : "Failed to parse SKU file");
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
        console.log("[v0] Frame image loaded:", img.width, "x", img.height);
      };
      img.onerror = () => {
        console.error("[v0] Failed to load frame image");
        setFrameImage(null);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  const downloadImage = async (url: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.imageData) {
          return data.imageData;
        }
      }
      return null;
    } catch {
      return null;
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

          console.log("[v0] Canvas size:", canvas.width, "x", canvas.height);

          ctx.drawImage(baseImg, 0, 0);

          ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);

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
    setProcessedImages([]);
    setFailedDownloads([]);
    setError(null);

    const totalUrls = catalogs.reduce((acc, cat) => acc + cat.urls.length, 0);
    let processedCount = 0;
    const failed: { catalog: string; url: string }[] = [];

    try {
      const results: { catalog: string; images: string[] }[] = [];

      for (const catalog of catalogs) {
        const catalogImages: string[] = [];

        for (const url of catalog.urls) {
          processedCount++;
          setProgress({
            current: processedCount,
            total: totalUrls,
            message: `Downloading: ${catalog.name} (${processedCount}/${totalUrls})`,
          });

          const imageData = await downloadImage(url);

          if (imageData) {
            if (frameImage) {
              setProcessingState("processing");
              setProgress({
                current: processedCount,
                total: totalUrls,
                message: `Applying frame: ${catalog.name}`,
              });
              const processed = await applyFrameWithCanvas(imageData);
              catalogImages.push(processed);
              setProcessingState("downloading");
            } else {
              catalogImages.push(imageData);
            }
          } else {
            failed.push({ catalog: catalog.name, url });
          }
        }

        if (catalogImages.length > 0) {
          results.push({ catalog: catalog.name, images: catalogImages });
        }
      }

      setProcessedImages(results);
      setFailedDownloads(failed);
      setProcessingState("complete");

      const successCount = results.reduce(
        (acc, cat) => acc + cat.images.length,
        0,
      );
      if (successCount === 0) {
        setError(
          `All ${totalUrls} downloads failed. This usually means the files require Google account access or are not publicly shared with "Anyone with the link".`,
        );
      } else if (failed.length > 0) {
        setError(`${failed.length} of ${totalUrls} files failed to download.`);
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

    const totalRetries = failedDownloads.length;
    let retryCount = 0;
    const stillFailed: { catalog: string; url: string }[] = [];
    const newResults = [...processedImages];

    for (const { catalog, url } of failedDownloads) {
      retryCount++;
      setProgress({
        current: retryCount,
        total: totalRetries,
        message: `Retrying: ${catalog} (${retryCount}/${totalRetries})`,
      });

      const imageData = await downloadImage(url);

      if (imageData) {
        const processed = frameImage
          ? await applyFrameWithCanvas(imageData)
          : imageData;
        const existingCatalog = newResults.find((r) => r.catalog === catalog);
        if (existingCatalog) {
          existingCatalog.images.push(processed);
        } else {
          newResults.push({ catalog, images: [processed] });
        }
      } else {
        stillFailed.push({ catalog, url });
      }
    }

    setProcessedImages(newResults);
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

  const handleDownloadZip = async () => {
    if (!processedImages.length) return;
    setProcessingState("zipping");
    setProgress({ current: 0, total: 100, message: "Creating ZIP..." });

    try {
      const zip = new JSZip();

      for (const cat of processedImages) {
        const folder = zip.folder(cat.catalog)!;
        cat.images.forEach((img, idx) => {
          const base64 = img.split(",")[1] || "";
          folder.file(`${cat.catalog}-${idx + 1}.png`, base64, {
            base64: true,
          });
        });
      }

      const blob = await zip.generateAsync({ type: "blob" }, (metadata) => {
        setProgress({
          current: Math.round(metadata.percent),
          total: 100,
          message: "Creating ZIP...",
        });
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "catalogs.zip";
      a.click();
      URL.revokeObjectURL(url);

      setProcessingState("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ZIP");
      setProcessingState("error");
    }
  };

  const handleDownloadSingle = (
    imageData: string,
    catalogName: string,
    index: number,
  ) => {
    const a = document.createElement("a");
    a.href = imageData;
    a.download = `${catalogName}-${index + 1}.png`;
    a.click();
  };

  const handleReset = () => {
    setSkuFile(null);
    setFrameFile(null);
    setFrameImage(null);
    setCatalogs([]);
    setProcessingState("idle");
    setProgress({ current: 0, total: 0, message: "" });
    setProcessedImages([]);
    setFailedDownloads([]);
    setError(null);
  };

  const totalUrls = catalogs.reduce((acc, cat) => acc + cat.urls.length, 0);
  const canProcess = catalogs.length > 0 && processingState === "idle";
  const isProcessing =
    processingState === "downloading" ||
    processingState === "processing" ||
    processingState === "zipping";
  const isComplete = processingState === "complete";
  const hasImages =
    processedImages.length > 0 &&
    processedImages.some((cat) => cat.images.length > 0);
  const totalProcessed = processedImages.reduce(
    (acc, cat) => acc + cat.images.length,
    0,
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <div className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <section className="grid md:grid-cols-2 gap-6">
            <FileUploadZone
              title="Upload SKU File"
              description="Tab-separated file with catalog names and Google Drive URLs"
              accept=".txt,.tsv,.csv"
              onUpload={handleSkuUpload}
              file={skuFile}
              icon="file"
            />
            <FileUploadZone
              title="Upload Frame"
              description="PNG image to overlay on all downloaded images"
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
                    {catalogs.length} catalog(s), {totalUrls} total image(s)
                    {frameImage && " • Frame will be applied"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    disabled={isProcessing}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleProcess}
                    disabled={!canProcess || isProcessing}
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isProcessing ? "Processing..." : "Process Images"}
                  </Button>
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
            <section className="space-y-4 p-6 bg-card border border-border rounded-lg">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {hasImages ? "Processing Complete" : "Processing Finished"}
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
                    <Button variant="outline" onClick={handleRetryFailed}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retry Failed ({failedDownloads.length})
                    </Button>
                  )}
                  {hasImages && (
                    <Button onClick={handleDownloadZip}>
                      <Download className="w-4 h-4 mr-2" />
                      Download All (ZIP)
                    </Button>
                  )}
                </div>
              </div>

              {hasImages && (
                <div className="space-y-6 mt-4">
                  {processedImages.map((cat, idx) => (
                    <div key={`${cat.catalog}-${idx}`} className="space-y-3">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {cat.catalog} ({cat.images.length} images)
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {cat.images.map((img, idx) => (
                          <div
                            key={`${cat.catalog}-${idx}`}
                            className="group relative aspect-square rounded-lg overflow-hidden bg-muted border border-border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            onClick={() =>
                              handleDownloadSingle(img, cat.catalog, idx)
                            }
                          >
                            <img
                              src={img || "/placeholder.svg"}
                              alt={`${cat.catalog} ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Download className="w-6 h-6 text-white" />
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
                    Make sure the Google Drive files are shared with "Anyone
                    with the link" permission.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
