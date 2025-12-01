import { ImageIcon } from "lucide-react"

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-background" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground leading-none">SKU Image Processor</h1>
            <p className="text-xs text-muted-foreground">Batch process catalog images with frame overlay</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">v1.0</div>
      </div>
    </header>
  )
}
