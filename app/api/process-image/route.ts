import { type NextRequest, NextResponse } from "next/server"
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const { imageData, frameData } = await request.json()

    if (!imageData || !frameData) {
      return NextResponse.json({ error: "Image and frame data required" }, { status: 400 })
    }

    const base64Regex = /^data:image\/\w+;base64,/
    const imageBase64 = imageData.replace(base64Regex, "")
    const frameBase64 = frameData.replace(base64Regex, "")

    return NextResponse.json({ error: "This route is disabled on Cloudflare Pages" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Processing error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Processing failed" }, { status: 500 })
  }
}
