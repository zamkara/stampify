import { type NextRequest, NextResponse } from "next/server"
export const runtime = 'edge'

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const fileIdMatch = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/)
    if (!fileIdMatch) {
      return NextResponse.json({ error: "Invalid Google Drive URL" }, { status: 400 })
    }

    const fileId = fileIdMatch[1]

    const downloadStrategies = [
      // Strategy 1: lh3 googleusercontent (works well for shared images)
      `https://lh3.googleusercontent.com/d/${fileId}`,
      // Strategy 2: Direct download with export
      `https://drive.google.com/uc?export=download&id=${fileId}`,
      // Strategy 3: With confirm=t to bypass virus scan warning
      `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`,
      // Strategy 4: drive.usercontent.google.com (newer endpoint)
      `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
    ]

    let imageBuffer: ArrayBuffer | null = null
    let contentType = "image/jpeg"
    let cookies = ""

    for (const downloadUrl of downloadStrategies) {
      try {
        const response = await fetch(downloadUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            ...(cookies ? { Cookie: cookies } : {}),
          },
          redirect: "follow",
        })

        // Store cookies for subsequent requests
        const setCookie = response.headers.get("set-cookie")
        if (setCookie) {
          cookies = setCookie
        }

        const responseContentType = response.headers.get("content-type") || ""

        // Check if we got HTML (confirmation page) instead of image
        if (responseContentType.includes("text/html")) {
          const html = await response.text()

          // Check for virus scan warning page and extract confirm token
          const confirmMatch = html.match(/confirm=([^&"]+)/) || html.match(/confirm=([a-zA-Z0-9_-]+)/)
          if (confirmMatch) {
            const confirmToken = confirmMatch[1]
            const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`

            const confirmResponse = await fetch(confirmUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                Accept: "image/*,*/*;q=0.8",
                ...(cookies ? { Cookie: cookies } : {}),
              },
              redirect: "follow",
            })

            const confirmContentType = confirmResponse.headers.get("content-type") || ""
            if (!confirmContentType.includes("text/html") && confirmResponse.ok) {
              imageBuffer = await confirmResponse.arrayBuffer()
              contentType = confirmContentType || "image/jpeg"
              break
            }
          }

          // Try extracting download URL from HTML
          const downloadLinkMatch = html.match(/href="(\/uc\?export=download[^"]+)"/)
          if (downloadLinkMatch) {
            const extractedUrl = `https://drive.google.com${downloadLinkMatch[1].replace(/&amp;/g, "&")}`

            const extractedResponse = await fetch(extractedUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                ...(cookies ? { Cookie: cookies } : {}),
              },
              redirect: "follow",
            })

            if (extractedResponse.ok) {
              const extractedContentType = extractedResponse.headers.get("content-type") || ""
              if (!extractedContentType.includes("text/html")) {
                imageBuffer = await extractedResponse.arrayBuffer()
                contentType = extractedContentType || "image/jpeg"
                break
              }
            }
          }

          continue
        }

        // Check if it's an actual image
        if (
          response.ok &&
          (responseContentType.includes("image/") || responseContentType.includes("application/octet-stream"))
        ) {
          imageBuffer = await response.arrayBuffer()
          contentType = responseContentType.includes("image/") ? responseContentType : "image/jpeg"
          break
        }
      } catch {
        continue
      }
    }

    if (!imageBuffer) {
      const fallbackUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=t`

      try {
        const finalResponse = await fetch(fallbackUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "image/*,*/*;q=0.8",
          },
          redirect: "follow",
        })

        const finalContentType = finalResponse.headers.get("content-type") || ""
        if (finalResponse.ok && !finalContentType.includes("text/html")) {
          imageBuffer = await finalResponse.arrayBuffer()
          contentType = finalContentType.includes("image/") ? finalContentType : "image/jpeg"
        }
      } catch {
        // Final fallback failed
      }
    }

    if (!imageBuffer || imageBuffer.byteLength < 1000) {
      return NextResponse.json(
        {
          error: "Could not download file. The file may require Google account access or is not publicly shared.",
        },
        { status: 500 },
      )
    }

    const base64 = toBase64(imageBuffer)

    // Determine content type from buffer magic bytes
    const bytes = new Uint8Array(imageBuffer.slice(0, 4))
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      contentType = "image/jpeg"
    } else if (bytes[0] === 0x89 && bytes[1] === 0x50) {
      contentType = "image/png"
    } else if (bytes[0] === 0x47 && bytes[1] === 0x49) {
      contentType = "image/gif"
    } else if (bytes[0] === 0x52 && bytes[1] === 0x49) {
      contentType = "image/webp"
    }

    return NextResponse.json({
      imageData: `data:${contentType};base64,${base64}`,
    })
  } catch (error) {
    console.error("Download error:", error)
    return NextResponse.json({ error: "Download failed" }, { status: 500 })
  }
}
