"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { FileText, ImageIcon, Upload, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadZoneProps {
  title: string
  description: string
  accept: string
  onUpload: (file: File) => void
  file: File | null
  icon: "file" | "image"
  subtitle?: string
}

export function FileUploadZone({ title, description, accept, onUpload, file, icon, subtitle }: FileUploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0])
      }
    },
    [onUpload],
  )

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: accept.includes("image") ? { "image/png": [".png"] } : { "text/plain": [".txt", ".tsv", ".csv"] },
    maxFiles: 1,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  })

  const IconComponent = icon === "file" ? FileText : ImageIcon

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer",
        "hover:border-muted-foreground/50 hover:bg-card/50",
        isDragActive && "border-foreground bg-card",
        file ? "border-green-500/50 bg-green-500/5" : "border-border",
      )}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center text-center gap-4">
        <div
          className={cn("w-12 h-12 rounded-xl flex items-center justify-center", file ? "bg-green-500/10" : "bg-muted")}
        >
          {file ? (
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          ) : (
            <IconComponent className="w-6 h-6 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-1">
          <h3 className="font-medium text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {file ? (
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
              <IconComponent className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground truncate max-w-[200px]">{file.name}</span>
            </div>
            {subtitle && <span className="text-xs text-green-500">{subtitle}</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Upload className="w-4 h-4" />
            <span>Drop file or click to browse</span>
          </div>
        )}
      </div>
    </div>
  )
}
