import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 🔍 Static test payload (this should always work)
    const testData = {
      vault: "Test successful ✅",
      timestamp: new Date().toISOString()
    };

    console.log("🧪 Returning static vault test response");
    return NextResponse.json(testData, { status: 200 });
  } catch (err: any) {
    console.error("🔥 Static route test failed:", err.message || err);
    return new NextResponse("Static response failed", { status: 500 });
  }
}