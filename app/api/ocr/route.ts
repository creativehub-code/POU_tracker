import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { imageURL } = await request.json()

    // Simulate OCR processing
    // In production, integrate with Tesseract.js or a cloud OCR service
    // For now, we'll use a simple pattern matching simulation

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // For demo purposes, generate a random amount between 100 and 50000
    // In production, this would use actual OCR to detect ₹, INR, or UPI amounts
    const detectedAmount = Math.floor(Math.random() * 49900) + 100

    // Simulate OCR patterns:
    // Look for ₹, INR, Rs, or UPI transaction amounts
    // Ignore $ or other foreign currency symbols

    return NextResponse.json({
      success: true,
      amount: detectedAmount,
      currency: "INR",
    })
  } catch (error) {
    console.error("[v0] OCR API error:", error)
    return NextResponse.json({ success: false, error: "OCR processing failed" }, { status: 500 })
  }
}
