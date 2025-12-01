import type { Catalog } from "@/lib/sku-parser"
import { FolderIcon, Link2 } from "lucide-react"

interface CatalogPreviewProps {
  catalogs: Catalog[]
}

export function CatalogPreview({ catalogs }: CatalogPreviewProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="max-h-[300px] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Catalog Name</th>
              <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Images</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {catalogs.map((catalog, idx) => (
              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FolderIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm text-foreground truncate">{catalog.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{catalog.urls.length} file(s)</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
