import { type NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"

export async function POST(request: NextRequest) {
  try {
    const { catalogs } = await request.json()

    if (!catalogs || !Array.isArray(catalogs)) {
      return NextResponse.json({ error: "Catalogs data required" }, { status: 400 })
    }

    const zip = new JSZip()

    for (const catalog of catalogs) {
      const folder = zip.folder(catalog.catalog)

      if (folder) {
        catalog.images.forEach((imageData: string, index: number) => {
          const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "")
          const extension = imageData.includes("image/png") ? "png" : "jpg"
          folder.file(`image_${index + 1}.${extension}`, base64Data, { base64: true })
        })
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" })

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=catalogs.zip",
      },
    })
  } catch (error) {
    console.error("ZIP creation error:", error)
    return NextResponse.json({ error: "ZIP creation failed" }, { status: 500 })
  }
}
