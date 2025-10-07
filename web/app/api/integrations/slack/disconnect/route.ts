import { NextResponse } from "next/server"
export async function POST() { return NextResponse.json({ ok: false, message: "Coming soon" }, { status: 501 }) }
