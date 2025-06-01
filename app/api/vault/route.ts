import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseServer"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const user = session.user as typeof session.user & { sub?: string; id?: string }
  const uid = user.sub ?? user.id ?? null

  if (!uid) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // ✅ Use maybeSingle to avoid 500s
  const { data: vault, error } = await supabase
    .from("vaults_test")
    .select("*")
    .eq("user_uid", uid)
    .maybeSingle()

  if (error) {
    console.error(`❌ Vault fetch error for ${uid}:`, error.message)
    return new NextResponse("Vault fetch error", { status: 500 })
  }

  if (!vault) {
    console.log(`ℹ️ Vault not found for ${uid}. Returning null.`)
    return NextResponse.json({ vault: null }, { status: 200 })
  }

  return NextResponse.json({ vault })
}