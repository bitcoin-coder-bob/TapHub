import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { assetName, rawProofFile } = await request.json();

    if (!assetName || !rawProofFile) {
      return NextResponse.json(
        { success: false, error: 'Asset name and raw proof file are required' },
        { status: 400 }
      );
    }

    // Call the backend API to verify the proof
    const backendResponse = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8082'}/verifyProof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assetName, rawProofFile }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json(
        { success: false, error: errorData.error || 'Proof verification failed' },
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
      verified: verificationResult.success
    });
  } catch (error) {
    console.error('Error verifying proof:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}