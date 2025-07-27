import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message, signature } = await request.json();

    if (!message || !signature) {
      return NextResponse.json(
        { success: false, error: 'Message and signature are required' },
        { status: 400 }
      );
    }

    // Call the backend API to verify the message
    const backendResponse = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8082'}/verifyMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, signature }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json(
        { success: false, error: errorData.error || 'Verification failed' },
        { status: backendResponse.status }
      );
    }

    const verificationResult = await backendResponse.json();
    
    if (verificationResult.error) {
      return NextResponse.json(
        { success: false, error: verificationResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      verified: true,
      pubkey: verificationResult.pubkey,
      alias: verificationResult.alias || 'Unknown'
    });
  } catch (error) {
    console.error('Error verifying message:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}