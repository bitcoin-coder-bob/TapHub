import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { message, signature } = await request.json();

const verified = await verifyMessage(message, signature);

  return NextResponse.json({ verified: true });
}

function verifyMessage(message: string, signature: string) {
  throw new Error("Function not implemented.");
}