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

    // ✅ Clean out invalid objects from array fields (like dates)
    const safeVault = {
      ...vault,
      dates: Array.isArray(vault.dates)
        ? vault.dates.filter((d: any) => d?.date && d?.label)
        : [],
      people: Array.isArray(vault.people)
        ? vault.people.filter((p: any) => p?.name && p?.relationship)
        : [],
      sports: vault.sports ?? {},
      travel: vault.travel ?? {},
      food: vault.food ?? {},
      popculture: vault.popculture ?? {},
      physical: vault.physical ?? {},
      health: vault.health ?? {},
    }

    console.log(`✅ Vault safely returned for ${uid}`)
    return NextResponse.json({ vault: safeVault }, { status: 200 })

  } catch (err: any) {
    console.error("🔥 Vault route crash:", err.message || err)
    return new NextResponse("Server error", { status: 500 })
  }
}