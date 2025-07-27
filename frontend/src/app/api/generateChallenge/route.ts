import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const challenge = `TapHub Authentication: ${crypto.randomBytes(16).toString('hex')}`;
    const timestamp = Date.now();
    
    return NextResponse.json({ 
      success: true,
      challenge,
      timestamp
    });
  } catch (error) {
    console.error('Error generating challenge:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}