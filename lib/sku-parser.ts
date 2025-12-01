export interface Catalog {
  name: string
  urls: string[]
}

export function parseSKUFile(content: string): Catalog[] {
  const lines = content.split("\n")
  const catalogs: Catalog[] = []
  let currentCatalog: Catalog | null = null

  for (const line of lines) {
    const columns = line.split("\t").map((col) => col.trim())

    if (columns.every((col) => !col)) continue

    if (columns.some((col) => /^SKU$/i.test(col) || /Packshot/i.test(col) || /Etalase/i.test(col))) {
      continue
    }

    let url = ""
    for (const col of columns) {
      if (/https:\/\/drive\.google\.com/.test(col)) {
        url = col
        break
      }
    }

    if (url) {
      const fileId = extractGoogleDriveId(url)
      if (fileId && currentCatalog) {
        const properUrl = `https://drive.google.com/uc?id=${fileId}`
        currentCatalog.urls.push(properUrl)
      }
    } else {
      const col1 = columns[0]
      if (col1 && col1.length > 10) {
        const sanitized = col1
          .replace(/\/ /g, " ")
          .replace(/\//g, " ")
          .replace(/[\\?%*:|"<>]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/\.+$/, "")

        if (sanitized) {
          if (currentCatalog && currentCatalog.urls.length > 0) {
            catalogs.push(currentCatalog)
          }
          currentCatalog = { name: sanitized, urls: [] }
        }
      }
    }
  }

  if (currentCatalog && currentCatalog.urls.length > 0) {
    catalogs.push(currentCatalog)
  }

  return catalogs
}

function extractGoogleDriveId(url: string): string | null {
  let match = url.match(/file\/d\/([^/]+)/)
  if (match) return match[1]

  match = url.match(/id=([^&]+)/)
  if (match) return match[1]

  if (/folders\//.test(url)) return null

  return null
}
