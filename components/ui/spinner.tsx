import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-4 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground",
        className,
      )}
      aria-hidden="true"
    />
  );
}
