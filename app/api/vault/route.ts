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

  const { data, error } = await supabase
    .from("vaults_test")
    .select("*")
    .eq("user_uid", uid)
    .limit(1)

  if (error) {
    console.error(`❌ Supabase error for ${uid}:`, error.message)
    return new NextResponse("Vault lookup failed", { status: 500 })
  }

  const vault = data?.[0] || null

  if (!vault) {
    console.log(`ℹ️ No vault found for ${uid}`)
    return NextResponse.json({ vault: null }, { status: 200 })
  }

  console.log(`✅ Vault loaded for ${uid}`)
  return NextResponse.json({ vault })
}