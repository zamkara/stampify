import type { ProcessingState } from "./sku-processor"
import { Loader2, CheckCircle2, AlertCircle, Download, Cog, FileArchive } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProcessingStatusProps {
  state: ProcessingState
  progress: { current: number; total: number; message: string }
  error: string | null
}

export function ProcessingStatus({ state, progress, error }: ProcessingStatusProps) {
  const getStatusConfig = () => {
    switch (state) {
      case "parsing":
        return {
          icon: Loader2,
          title: "Parsing SKU file...",
          iconClass: "animate-spin text-foreground",
        }
      case "downloading":
        return {
          icon: Download,
          title: "Downloading images...",
          iconClass: "animate-pulse text-foreground",
        }
      case "processing":
        return {
          icon: Cog,
          title: "Applying frame overlay...",
          iconClass: "animate-spin text-foreground",
        }
      case "zipping":
        return {
          icon: FileArchive,
          title: "Creating ZIP...",
          iconClass: "animate-pulse text-foreground",
        }
      case "complete":
        return {
          icon: CheckCircle2,
          title: "Processing complete!",
          iconClass: "text-green-500",
        }
      case "error":
        return {
          icon: AlertCircle,
          title: "Error occurred",
          iconClass: "text-destructive",
        }
      default:
        return null
    }
  }

  const config = getStatusConfig()
  if (!config && !error) return null

  const Icon = config?.icon || AlertCircle
  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div
      className={cn(
        "rounded-xl border p-6",
        state === "error" ? "border-destructive/50 bg-destructive/5" : "border-border bg-card",
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            state === "error" ? "bg-destructive/10" : "bg-muted",
          )}
        >
          <Icon className={cn("w-5 h-5", config?.iconClass)} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground">{config?.title}</h3>

          {error ? (
            <p className="text-sm text-destructive mt-1">{error}</p>
          ) : progress.message ? (
            <p className="text-sm text-muted-foreground mt-1 truncate">{progress.message}</p>
          ) : null}

          {progress.total > 0 && state !== "complete" && state !== "error" && (
            <div className="mt-3 space-y-2">
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {progress.current} of {progress.total} ({progressPercent}%)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
