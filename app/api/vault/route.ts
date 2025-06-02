import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseServer"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = session.user as typeof session.user & { sub?: string; id?: string }
    const uid = user.sub ?? user.id ?? null

    if (!uid || typeof uid !== "string") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { data, error } = await supabase
      .from("vaults_test")
      .select("*")
      .eq("user_uid", uid)
      .limit(1)

    if (error) {
      console.error("❌ Supabase fetch error:", error.message)
      return new NextResponse("Supabase error", { status: 500 })
    }

    const vault = data?.[0] || null

    
    if (!vault) {
      console.log(`ℹ️ Vault not found for ${uid}`)
      return NextResponse.json({ vault: null }, { status: 200 })
    }
    
    // 🔍 TEMPORARY LOGGING
    console.log('📦 Raw vault object:', vault)
    
    try {
      return NextResponse.json({ vault }, { status: 200 })
    } catch (serializationError) {
      console.error('🔥 JSON serialization failed:', serializationError)
      return new NextResponse("Serialization error", { status: 500 })
    }

    // ✅ Return only safe fields explicitly
    const safeVault = {
      user_uid: vault.user_uid,
      innerview: vault.innerview ?? null,
      tonesync: vault.tonesync ?? null,
      skillsync: vault.skillsync ?? null,
      familiarity_score: vault.familiarity_score ?? 0,
    }

    console.log(`✅ Vault safely returned for ${uid}`)
    return NextResponse.json({ vault: safeVault }, { status: 200 })

  } catch (err: any) {
    console.error("🔥 API /vault crashed unexpectedly:", err.message || err)
    return new NextResponse("Server error", { status: 500 })
  }
}