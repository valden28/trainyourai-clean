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

  const { data: vault, error } = await supabase
    .from("vaults_test")
    .select("*")
    .eq("user_uid", uid)
    .single()

  if (error || !vault) {
    return new NextResponse("Vault not found", { status: 404 })
  }

  return NextResponse.json({ vault })
}