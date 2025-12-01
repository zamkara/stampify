import { type NextRequest, NextResponse } from "next/server"
import sharp from "sharp"

export async function POST(request: NextRequest) {
  try {
    const { imageData, frameData } = await request.json()

    if (!imageData || !frameData) {
      return NextResponse.json({ error: "Image and frame data required" }, { status: 400 })
    }

    const base64Regex = /^data:image\/\w+;base64,/
    const imageBase64 = imageData.replace(base64Regex, "")
    const frameBase64 = frameData.replace(base64Regex, "")

    const imageBuffer = Buffer.from(imageBase64, "base64")
    const frameBuffer = Buffer.from(frameBase64, "base64")

    // Get image metadata
    const imageMetadata = await sharp(imageBuffer).metadata()
    const width = imageMetadata.width || 800
    const height = imageMetadata.height || 800

    console.log("[v0] Image size:", width, "x", height)

    const resizedFrame = await sharp(frameBuffer)
      .resize(width, height, {
        fit: "fill",
        kernel: sharp.kernel.lanczos3,
      })
      .ensureAlpha() // Ensure alpha channel exists
      .png()
      .toBuffer()

    console.log("[v0] Frame resized successfully")

    const result = await sharp(imageBuffer)
      .ensureAlpha() // Ensure base image has alpha
      .composite([
        {
          input: resizedFrame,
          gravity: "center",
          blend: "over", // Use 'over' blend mode for proper alpha compositing
        },
      ])
      .png({ quality: 100 })
      .toBuffer()

    console.log("[v0] Composite completed, result size:", result.length)

    const resultBase64 = `data:image/png;base64,${result.toString("base64")}`

    return NextResponse.json({ imageData: resultBase64 })
  } catch (error) {
    console.error("[v0] Processing error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Processing failed" }, { status: 500 })
  }
}
