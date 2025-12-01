import logo from "@/public/icon.svg"
import Image from "next/image";

export function Header() {
  return (
    <header className="border-transparent hover:border-border border-b group bg-transparent hover:bg-card/50 ease-in-out duration-300 backdrop-blur-sm sticky top-0 py-4 z-50">
      <div className="container max-w-6xl mx-auto px-4 h-14 -translate-x-4 ease-in-out duration-300 group-hover:translate-x-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Image src={logo} alt="Stampify" className="w-0 ease-in-out duration-300 group-hover:w-8 h-8" />
          <div>
            <h1 className="font-semibold text-foreground leading-none">Stampify</h1>
            <p className="text-xs text-muted-foreground">sales assistant</p>
          </div>
        </div>
        <div className="text-xs text-transparent ease-in-out duration-300 group-hover:text-muted-foreground">v1.0</div>
      </div>
    </header>
  )
}
