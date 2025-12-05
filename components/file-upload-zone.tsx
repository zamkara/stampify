"use client";

import { useCallback, useState, type ClipboardEvent } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, ImageIcon, Upload, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
    title: string;
    description: string;
    accept: string;
    onUpload: (file: File) => void;
    file: File | null;
    icon: "file" | "image";
    subtitle?: string;
    className?: string;
    onPasteText?: (text: string) => void;
}

export function FileUploadZone({
    title,
    description,
    accept,
    onUpload,
    file,
    icon,
    subtitle,
    className,
    onPasteText,
}: FileUploadZoneProps) {
    const [isDragActive, setIsDragActive] = useState(false);

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length > 0) {
                onUpload(acceptedFiles[0]);
            }
        },
        [onUpload],
    );

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        accept: accept.includes("image")
            ? { "image/png": [".png"] }
            : { "text/plain": [".txt", ".tsv", ".csv"] },
        maxFiles: 1,
        onDragEnter: () => setIsDragActive(true),
        onDragLeave: () => setIsDragActive(false),
    });

    const handlePaste = useCallback(
        (event: ClipboardEvent<HTMLDivElement>) => {
            if (!onPasteText) return;
            const text = event.clipboardData.getData("text");
            if (text.trim()) {
                event.preventDefault();
                onPasteText(text);
            }
        },
        [onPasteText],
    );

    const rootProps = getRootProps({ onPaste: handlePaste });
    const IconComponent = icon === "file" ? FileText : ImageIcon;
    const helperText = onPasteText
        ? "Place the text file here"
        : "Drop or browse";

    return (
        <div
            {...rootProps}
            className={cn(
                "relative rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer",
                "flex flex-col items-center justify-center text-center",
                "hover:border-muted-foreground/50 hover:bg-card/50",
                isDragActive && "border-foreground bg-card",
                file ? "border-orange-200/10" : "border-border",
                className,
            )}
        >
            <input {...getInputProps()} />

            <div className="flex flex-col items-center text-center gap-4">
                <div
                    className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        file ? "bg-orange-200/10" : "bg-muted",
                    )}
                >
                    {file ? (
                        <CheckCircle2 className="w-6 h-6 text-orange-200" />
                    ) : (
                        <IconComponent className="w-6 h-6 text-muted-foreground" />
                    )}
                </div>

                <div className="space-y-1">
                    <h3 className="font-medium text-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>

                {file ? (
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border">
                            <IconComponent className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-foreground truncate max-w-[200px]">
                                {file.name}
                            </span>
                        </div>
                        {subtitle && (
                            <span className="text-xs text-orange-200">
                                {subtitle}
                            </span>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Upload className="w-4 h-4" />
                        <span>{helperText}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
