import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    // Generate a random challenge message
    const challenge = `TapHub Authentication Challenge: ${crypto.randomBytes(32).toString('hex')}`;
    const timestamp = Date.now();
    
    // Store the challenge with timestamp for verification (in a real app, you'd use a database)
    // For now, we'll return it directly and verify it on the backend
    
    return NextResponse.json({ 
      success: true,
      challenge,
      timestamp,
      message: `Please sign this message using your Lightning CLI:\n\n${challenge}\n\nUse: lncli signmessage "${challenge}"`
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate challenge' },
      { status: 500 }
    );
  }
}